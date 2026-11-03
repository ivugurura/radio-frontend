import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client';
import { lStorage, APP_SCHEMA, BASE_API_URL } from '@libs/constants';
import type { GraphQLError } from 'graphql';
import { jwtDecode } from 'jwt-decode';
import i18n from '../i18n';
import { DEFAULT_LANGUAGE, normalizeLanguage } from '../i18n/config';

/** Language tag sent to the backend on every request (`Accept-Language: en`). */
export const currentLanguageTag = (): string =>
  normalizeLanguage(i18n.language ?? DEFAULT_LANGUAGE);

type CreateApolloClientOptions = {
  // Optional: refresh the access token; return new token or null if refresh failed
  refreshAccessToken?: () => Promise<string | null>;

  // Optional: sign the user out when refresh fails or when you decide to terminate session
  onSignOut?: () => void;

  // Optional: attach cookies (if your API uses cookies rather than headers)
  // For cookies + CSRF, set credentials:'include' and manage CSRF headers via your own fetch wrapper
  includeCookies?: boolean;

  // Optional hooks for observability/telemetry
  onGraphQLError?: (err: GraphQLError, operationName?: string) => void;
  onNetworkError?: (error: unknown, operationName?: string) => void;

  // Optional network retry configuration for transient failures
  networkRetry?: {
    maxAttempts?: number; // default 3
    initialDelayMs?: number; // default 300
    maxDelayMs?: number; // default 2000
    jitter?: boolean; // default true
    shouldRetryStatus?: (status: number) => boolean; // default: 5xx or 429
  };
};

const REFRESH_LOCK = 'refresh-access-token';
const REFRESH_TIMEOUT_MS = 15000;

// In-flight refresh coordination (prevents stampeding herds)
let isRefreshing = false;
let refreshWaiters: Array<(token: string | null) => void> = [];

const notifyRefreshWaiters = (token: string | null) => {
  for (const w of refreshWaiters) w(token);
  refreshWaiters = [];
};

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

function computeBackoffDelay(
  attempt: number,
  initial: number,
  max: number,
  jitter: boolean,
) {
  const base = Math.min(max, initial * Math.pow(2, attempt - 1));
  if (!jitter) return base;
  const rand = Math.random() + 0.5; // 0.5x to 1.5x
  return Math.min(max, Math.floor(base * rand));
}

// Parse Retry-After header into milliseconds (either seconds or HTTP-date)
function parseRetryAfter(header: string | null): number | null {
  if (!header) return null;
  const seconds = Number(header);
  if (!Number.isNaN(seconds)) return Math.max(0, seconds * 1000);
  const date = new Date(header);
  const ms = date.getTime() - Date.now();
  return Number.isFinite(ms) ? Math.max(0, ms) : null;
}

function sanitizeUrlPart(value: string): string {
  return value.replace(/\/+$/, '');
}

function getAuthEndpoint(action: 'refresh' | 'logout'): string {
  if (BASE_API_URL) {
    const baseApi = sanitizeUrlPart(BASE_API_URL);
    if (baseApi.endsWith('/api')) {
      return `${baseApi}/auth/${action}`;
    }
    return `${baseApi}/api/auth/${action}`;
  }

  if (APP_SCHEMA) {
    const origin = new URL(APP_SCHEMA, window.location.origin).origin;
    return `${sanitizeUrlPart(origin)}/api/auth/${action}`;
  }

  return `/api/auth/${action}`;
}

export function createApolloClient(
  options?: CreateApolloClientOptions,
): ApolloClient {
  const {
    refreshAccessToken,
    onSignOut,
    includeCookies = false,
    onGraphQLError,
    onNetworkError,
    networkRetry,
  } = options || {};

  const {
    maxAttempts = 3,
    initialDelayMs = 300,
    maxDelayMs = 2000,
    jitter = true,
    shouldRetryStatus = (status: number) => status === 429 || status >= 500,
  } = networkRetry ?? {};

  const authAwareFetch: typeof fetch = async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ) => {
    const makeRequest = async (
      tokenOverride?: string | null,
    ): Promise<Response> => {
      const reqInit: RequestInit = { ...(init ?? {}) };
      const headers = new Headers(reqInit.headers ?? {});
      let token = tokenOverride ?? null;
      if (!token) {
        token = lStorage.get();
      }
      if (token) headers.set('Authorization', `RRV ${token}`);
      // Stations are language specific; the backend also localises messages from this.
      headers.set('Accept-Language', currentLanguageTag());

      reqInit.headers = headers;
      if (includeCookies && !reqInit.credentials) {
        reqInit.credentials = 'include';
      } else if (!reqInit.credentials) {
        reqInit.credentials = 'same-origin';
      }

      return fetch(input, reqInit);
    };

    let attempt = 0;
    while (true) {
      attempt++;
      try {
        let res = await makeRequest();

        if (res.status === 401 && typeof refreshAccessToken === 'function') {
          const refreshed = await coordinateRefresh(
            refreshAccessToken,
            onSignOut,
          );
          if (refreshed) {
            res = await makeRequest(refreshed);
          } else {
            return res;
          }
        }

        try {
          const clone = res.clone();
          const ct = clone.headers.get('content-type') || '';
          if (ct.includes('application/json')) {
            const body = await clone.json().catch(() => null);
            const errors: GraphQLError[] | undefined = body?.errors;
            if (errors?.length) {
              const unauth = errors.some(
                (e) =>
                  (e.extensions as { code?: string })?.code ===
                  'UNAUTHENTICATED',
              );
              if (unauth && typeof refreshAccessToken === 'function') {
                const refreshed = await coordinateRefresh(
                  refreshAccessToken,
                  onSignOut,
                );
                if (refreshed) {
                  return makeRequest(refreshed);
                } else {
                  return res;
                }
              }

              if (onGraphQLError) {
                const opName = body?.extensions?.operationName as
                  | string
                  | undefined;
                for (const e of errors) onGraphQLError(e, opName);
              }
            }
          }
        } catch {
          // JSON parsing failed or body wasn't GraphQL; fall through with the original response.
        }

        if (shouldRetryStatus(res.status) && attempt < maxAttempts) {
          // Honor Retry-After when present (take the larger of backoff vs header)
          const retryAfter = parseRetryAfter(res.headers.get('retry-after'));
          const backoff = computeBackoffDelay(
            attempt,
            initialDelayMs,
            maxDelayMs,
            jitter,
          );
          const delay =
            retryAfter != null ? Math.max(backoff, retryAfter) : backoff;
          await sleep(delay);
          continue;
        }

        return res;
      } catch (e) {
        // Thrown fetch usually has no Response to check shouldRetryStatus against, so treat as transient.
        if (onNetworkError) {
          onNetworkError(e, undefined);
        }
        if (attempt >= maxAttempts) throw e;

        const delay = computeBackoffDelay(
          attempt,
          initialDelayMs,
          maxDelayMs,
          jitter,
        );
        await sleep(delay);
        continue;
      }
    }
  };

  async function coordinateRefresh(
    doRefresh: NonNullable<CreateApolloClientOptions['refreshAccessToken']>,
    onSignOutCb?: () => void,
  ): Promise<string | null> {
    if (!isRefreshing) {
      isRefreshing = true;
      try {
        const newToken = await doRefresh();
        notifyRefreshWaiters(newToken ?? null);
        if (!newToken && !lStorage.getRefreshToken()) onSignOutCb?.();
        return newToken ?? null;
      } catch {
        notifyRefreshWaiters(null);
        onSignOutCb?.();
        return null;
      } finally {
        isRefreshing = false;
      }
    }

    const token = await new Promise<string | null>((resolve) => {
      refreshWaiters.push(resolve);
    });
    // A refresh that failed on the network keeps its tokens, so the session stays alive.
    if (!token && !lStorage.getRefreshToken()) onSignOutCb?.();
    return token;
  }

  const httpLink = new HttpLink({
    uri: APP_SCHEMA,
    fetch: authAwareFetch,
    // credentials are set inside authAwareFetch, not here, so per-request overrides still work
  });

  const cache = new InMemoryCache();

  return new ApolloClient({
    link: httpLink,
    cache,
  });
}

/** Ends the session; reloading lets AuthProvider start over without the tokens. */
export function signOut() {
  lStorage.removeAll();
  window.location.reload();
}

/**
 * Revokes the refresh token on the server, then ends the session locally.
 * Holds the refresh lock so another tab can't rotate the token mid-logout and
 * leave a fresh, unrevoked one behind. Signs out locally even if the server
 * can't be reached; the token then simply expires (7 days).
 */
export async function logout(): Promise<void> {
  const revoke = async () => {
    const refreshToken = lStorage.getRefreshToken();
    if (!refreshToken) return;
    await fetch(getAuthEndpoint('logout'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept-Language': currentLanguageTag(),
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
      credentials: 'same-origin',
      signal: AbortSignal.timeout(REFRESH_TIMEOUT_MS),
    }).catch(() => undefined);
  };

  try {
    if (navigator.locks) {
      await navigator.locks.request(REFRESH_LOCK, revoke);
    } else {
      await revoke();
    }
  } finally {
    signOut();
  }
}

// Each refresh token works once, so tabs must take turns or all but one would be rejected.
export async function defaultRefreshAccessToken(): Promise<string | null> {
  const staleToken = lStorage.get();
  if (!navigator.locks) return requestAccessToken(staleToken);
  return navigator.locks.request(REFRESH_LOCK, () =>
    requestAccessToken(staleToken),
  );
}

/** For callers outside Apollo (websockets) that can't retry after a rejected token. */
export async function ensureFreshAccessToken(): Promise<void> {
  const token = lStorage.get();
  if (token && !isTokenExpired(token)) return;
  await defaultRefreshAccessToken();
}

function isTokenExpired(token: string): boolean {
  try {
    const { exp } = jwtDecode<{ exp?: number }>(token);
    return !exp || exp <= Date.now() / 1000;
  } catch {
    return true;
  }
}

async function requestAccessToken(staleToken: string): Promise<string | null> {
  // Another tab refreshed while this one waited for the lock.
  const currentToken = lStorage.get();
  if (currentToken && currentToken !== staleToken) return currentToken;

  const refreshToken = lStorage.getRefreshToken();
  if (!refreshToken) {
    lStorage.removeAll();
    return null;
  }

  try {
    const response = await fetch(getAuthEndpoint('refresh'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept-Language': currentLanguageTag(),
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
      credentials: 'same-origin',
      signal: AbortSignal.timeout(REFRESH_TIMEOUT_MS),
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 400) {
        lStorage.removeAll();
      }
      return null;
    }

    const payload = (await response.json()) as {
      token?: string;
      refresh_token?: string;
    };

    const nextAccessToken = payload.token;
    if (!nextAccessToken) return null;

    lStorage.save(nextAccessToken, payload.refresh_token ?? refreshToken);
    return nextAccessToken;
  } catch {
    return null;
  }
}
