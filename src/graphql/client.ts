import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client';
import { lStorage, APP_SCHEMA, BASE_API_URL } from '@libs/constants';
import type { GraphQLError } from 'graphql';
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

function getRefreshEndpoint(): string {
  if (BASE_API_URL) {
    const baseApi = sanitizeUrlPart(BASE_API_URL);
    if (baseApi.endsWith('/api')) {
      return `${baseApi}/auth/refresh`;
    }
    return `${baseApi}/api/auth/refresh`;
  }

  if (APP_SCHEMA) {
    const origin = new URL(APP_SCHEMA, window.location.origin).origin;
    return `${sanitizeUrlPart(origin)}/api/auth/refresh`;
  }

  return '/api/auth/refresh';
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
              if (onGraphQLError) {
                const opName = body?.extensions?.operationName as
                  | string
                  | undefined;
                for (const e of errors) onGraphQLError(e, opName);
              }

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
    if (!token) onSignOutCb?.();
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

// Example placeholder refresh function (adjust to your backend contract)
export async function defaultRefreshAccessToken(): Promise<string | null> {
  const refreshToken = lStorage.getRefreshToken();
  if (!refreshToken) return null;

  try {
    const response = await fetch(getRefreshEndpoint(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept-Language': currentLanguageTag(),
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
      credentials: 'same-origin',
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
