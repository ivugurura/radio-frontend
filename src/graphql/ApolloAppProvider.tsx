import { type PropsWithChildren, useMemo } from 'react';
import { ApolloProvider } from '@apollo/client/react';
import { createApolloClient, defaultRefreshAccessToken } from './client';

type ApolloAppProviderProps = PropsWithChildren<{
  // Override defaults as needed (e.g., provide your own AsyncStorage token getters on RN)
  getAccessToken?: () => Promise<string | null>;
  refreshAccessToken?: () => Promise<string | null>;
  onSignOut?: () => void;
  includeCookies?: boolean;
}>;

export function ApolloAppProvider({
  refreshAccessToken = defaultRefreshAccessToken,
  onSignOut,
  includeCookies = false,
  children,
}: ApolloAppProviderProps) {
  const client = useMemo(() => {
    return createApolloClient({
      refreshAccessToken,
      onSignOut,
      includeCookies,
      // Optional: wire up telemetry/toasts/logging here
      onGraphQLError: (err, opName) => {
        if (process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.warn('[GraphQL error]', opName, err);
        }
      },
      onNetworkError: (err, opName) => {
        if (process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.warn('[Network error]', opName, err);
        }
      },
      networkRetry: {
        maxAttempts: 3,
        initialDelayMs: 300,
        maxDelayMs: 2000,
        jitter: true,
      },
    });
  }, [refreshAccessToken, onSignOut, includeCookies]);

  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}
