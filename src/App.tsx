import React, { Suspense } from 'react';
import { ThemeProvider, CssBaseline, LinearProgress } from '@mui/material';
import { theme } from './theme/theme';

import { AppRoutes } from './routes';
import { ErrorBoundary } from './components/errors';
import { ToastContainer } from 'react-toastify';
import { ApolloAppProvider } from './graphql/ApolloAppProvider';
import { AuthProvider } from '@components/providers';

const App: React.FC = () => (
  <ApolloAppProvider>
    <ThemeProvider theme={theme}>
      <ErrorBoundary location={null}>
        <CssBaseline />
        <ToastContainer />
        <Suspense fallback={<LinearProgress />}>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </Suspense>
      </ErrorBoundary>
    </ThemeProvider>
  </ApolloAppProvider>
);

export default App;
