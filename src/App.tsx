import React, { Suspense } from 'react';
import { ThemeProvider, CssBaseline, LinearProgress } from '@mui/material';
import { Provider } from 'react-redux';
import { theme } from './theme/theme';

import { AppRoutes } from './routes';
import { store } from './redux/store';
import { ErrorBoundary } from './components/errors';
import { ToastContainer } from 'react-toastify';

const App: React.FC = () => (
  <ThemeProvider theme={theme}>
    <Provider store={store}>
      <ErrorBoundary location={null}>
        <CssBaseline />
        <ToastContainer />
        <Suspense fallback={<LinearProgress />}>
          <AppRoutes />
        </Suspense>
      </ErrorBoundary>
    </Provider>
  </ThemeProvider>
);

export default App;
