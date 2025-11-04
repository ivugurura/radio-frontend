import { Route, Routes, BrowserRouter } from 'react-router';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AudioManagerPage from './pages/audio';

export const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route index element={<Login shouldRedirect />} />
        <Route path="admin" element={<Layout />}>
          <Route path="" element={<Dashboard />} />
          <Route path="medias" element={<AudioManagerPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};
