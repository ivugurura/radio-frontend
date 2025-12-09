import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client';
import { lStorage, API_URL } from '@libs/constants';
import type { GraphQLError } from 'graphql';

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
    // Retry on HTTP status
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
  jitter: boolean
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

export function createApolloClient(
  options?: CreateApolloClientOptions
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

  // Custom fetch that:
  // - injects Authorization
  // - retries on 401/UNAUTHENTICATED with refreshAccessToken
  // - provides network retry/backoff for transient failures
  // - surfaces telemetry via onGraphQLError/onNetworkError
  const authAwareFetch: typeof fetch = async (
    input: RequestInfo | URL,
    init?: RequestInit
  ) => {
    const makeRequest = async (
      tokenOverride?: string | null
    ): Promise<Response> => {
      const reqInit: RequestInit = { ...(init ?? {}) };
      const headers = new Headers(reqInit.headers ?? {});
      // Inject Authorization header if we have a token
      let token = tokenOverride ?? null;
      if (!token) {
        // undefined means "not provided" -> look it up
        token = lStorage.token;
      }
      if (token) headers.set('Authorization', `RRV ${token}`);

      reqInit.headers = headers;
      // Credentials handling
      if (includeCookies && !reqInit.credentials) {
        reqInit.credentials = 'include';
      } else if (!reqInit.credentials) {
        reqInit.credentials = 'same-origin';
      }

      return fetch(input, reqInit);
    };

    // Network-level retry for transient failures (e.g., DNS hiccups)
    let attempt = 0;
    while (true) {
      attempt++;
      try {
        let res = await makeRequest();

        // If HTTP 401, attempt refresh (if configured) then retry once with new token
        if (res.status === 401 && typeof refreshAccessToken === 'function') {
          const refreshed = await coordinateRefresh(
            refreshAccessToken,
            onSignOut
          );
          if (refreshed) {
            res = await makeRequest(refreshed);
          } else {
            // refresh failed -> propagate original 401
            return res;
          }
        }

        // Inspect GraphQL response to optionally refresh/retry on UNAUTHENTICATED
        try {
          const clone = res.clone();
          // Only parse JSON if content-type hints JSON
          const ct = clone.headers.get('content-type') || '';
          if (ct.includes('application/json')) {
            const body = await clone.json().catch(() => null);
            const errors: GraphQLError[] | undefined = body?.errors;
            if (errors?.length) {
              // Telemetry callback
              if (onGraphQLError) {
                // Best-effort operation name: extract from extensions if present
                const opName = body?.extensions?.operationName as
                  | string
                  | undefined;
                for (const e of errors) onGraphQLError(e, opName);
              }

              const unauth = errors.some(
                (e) => (e.extensions as any)?.code === 'UNAUTHENTICATED'
              );
              if (unauth && typeof refreshAccessToken === 'function') {
                const refreshed = await coordinateRefresh(
                  refreshAccessToken,
                  onSignOut
                );
                if (refreshed) {
                  // Retry once with fresh token
                  return makeRequest(refreshed);
                } else {
                  // refresh failed -> let GraphQL error propagate
                  return res;
                }
              }
            }
          }
        } catch {
          // Ignore JSON/inspection errors and just return original response
        }

        // Use shouldRetryStatus to retry transient HTTP statuses (e.g., 429/5xx)
        if (shouldRetryStatus(res.status) && attempt < maxAttempts) {
          // Honor Retry-After when present (take the larger of backoff vs header)
          const retryAfter = parseRetryAfter(res.headers.get('retry-after'));
          const backoff = computeBackoffDelay(
            attempt,
            initialDelayMs,
            maxDelayMs,
            jitter
          );
          const delay =
            retryAfter != null ? Math.max(backoff, retryAfter) : backoff;
          await sleep(delay);
          continue;
        }

        return res;
      } catch (e) {
        // Fetch threw before we got a response (network error, CORS, etc.)
        if (onNetworkError) {
          // No operation name here (transport-level), so pass undefined
          onNetworkError(e, undefined);
        }
        // Decide to retry
        if (attempt >= maxAttempts) throw e;

        // If there is a Response with status we can inspect (rare on thrown fetch), we could use shouldRetryStatus
        // But generally thrown fetch has no Response, so treat as transient and retry
        const delay = computeBackoffDelay(
          attempt,
          initialDelayMs,
          maxDelayMs,
          jitter
        );
        await sleep(delay);
        continue;
      }
    }
  };

  // Helper to coordinate refresh across concurrent requests
  async function coordinateRefresh(
    doRefresh: NonNullable<CreateApolloClientOptions['refreshAccessToken']>,
    onSignOutCb?: () => void
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

    // Wait for the in-flight refresh to complete
    const token = await new Promise<string | null>((resolve) => {
      refreshWaiters.push(resolve);
    });
    if (!token) onSignOutCb?.();
    return token;
  }

  // Use a relative URL in development so Vite's dev proxy can avoid CORS and preflight.
  // In production, use the absolute API_URL from env.
  const endpoint = import.meta.env.DEV ? '/graphql' : API_URL;

  const httpLink = new HttpLink({
    uri: endpoint,
    // Use our custom fetch wrapper
    fetch: authAwareFetch,
    // credentials handled in wrapper to allow per-request overrides if needed
  });

  const cache = new InMemoryCache({
    // Add your typePolicies as needed
  });

  return new ApolloClient({
    link: httpLink,
    cache,
    // You can still set default errorPolicy here if you prefer 'all'
    // defaultOptions: {
    //   watchQuery: { errorPolicy: 'all' },
    //   query: { errorPolicy: 'all' },
    //   mutate: { errorPolicy: 'all' },
    // },
  });
}

// Example placeholder refresh function (adjust to your backend contract)
export async function defaultRefreshAccessToken(): Promise<string | null> {
  // Example using a REST refresh endpoint
  // const res = await fetch('/api/auth/refresh', {
  //   method: 'POST',
  //   credentials: 'include',
  //   body: JSON.stringify({
  //     refreshToken: lStorage.store.getItem('r-token') || '',
  //   }),
  // });
  // if (!res.ok) return null;
  // const data = await res.json();
  // console.log(data);

  // const newToken = data.accessToken;

  // lStorage.save(newToken ?? '');
  // lStorage.store.setItem('r-token', data.refreshToken ?? '');
  // return newToken ?? null;
  return null;
}
