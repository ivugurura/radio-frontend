import { type PropsWithChildren, useMemo } from 'react';
import { ApolloProvider } from '@apollo/client/react';
import { createApolloClient, defaultRefreshAccessToken } from './client';
import { lStorage, notifier } from '@libs/constants';

declare const process: { env: { NODE_ENV: string } };

type ApolloAppProviderProps = PropsWithChildren<{
  // Override defaults as needed (e.g., provide your own AsyncStorage token getters on RN)
  getAccessToken?: () => Promise<string | null>;
  refreshAccessToken?: () => Promise<string | null>;
  onSignOut?: () => void;
  includeCookies?: boolean;
}>;

export function ApolloAppProvider({
  refreshAccessToken = defaultRefreshAccessToken,
  onSignOut = () => {
    lStorage.removeAll();
  },
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
        notifier.error(err.message);
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[GraphQL error]', opName, err);
        }
      },
      onNetworkError: (err, opName) => {
        notifier.error(`Network error`);
        if (process.env.NODE_ENV !== 'production') {
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
