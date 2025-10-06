import { Route, Routes, BrowserRouter } from 'react-router';
import Layout from './components/Layout';
import { AuthProvider } from './components/providers/AuthProvider';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

export const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route index element={<Login shouldRedirect />} />
        <Route
          path="admin"
          element={
            <AuthProvider>
              <Layout />
            </AuthProvider>
          }
        >
          <Route path="" element={<Dashboard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};
