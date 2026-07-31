import { Route, Routes, BrowserRouter } from 'react-router';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AudioManagerPage from './pages/audio';
import ListenerStatsPage from './pages/listeners';
import HomePage from './pages/Home';

export const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route index element={<HomePage />} />
        <Route path="login" element={<Login shouldRedirect />} />
        <Route path="admin" element={<Layout />}>
          <Route path="" element={<Dashboard />} />
          <Route path="medias" element={<AudioManagerPage />} />
          <Route path="listeners" element={<ListenerStatsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};
