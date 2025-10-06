import React, { Suspense } from 'react';
import { ThemeProvider, CssBaseline, LinearProgress } from '@mui/material';
import { theme } from './theme/theme';

import { AppRoutes } from './routes';
import { ErrorBoundary } from './components/errors';
import { ToastContainer } from 'react-toastify';

const App: React.FC = () => (
  <ThemeProvider theme={theme}>
    <ErrorBoundary location={null}>
      <CssBaseline />
      <ToastContainer />
      <Suspense fallback={<LinearProgress />}>
        <AppRoutes />
      </Suspense>
    </ErrorBoundary>
  </ThemeProvider>
);

export default App;
