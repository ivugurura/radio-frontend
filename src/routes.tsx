import { lazy, Suspense } from 'react';
import { Route, Routes, BrowserRouter } from 'react-router';
import PageLoader from './components/PageLoader';
import { RequireStudioPermission as Require } from './components/RequireStudioPermission';
// The public listener page is what most visitors open, so it ships in the
// main bundle; everything staff-only is split out and fetched on demand.
import HomePage from './pages/Home';

const Layout = lazy(() => import('./components/Layout'));
const Login = lazy(() => import('./pages/login'));
const Dashboard = lazy(() => import('./pages/dashboard'));
const AudioManagerPage = lazy(() => import('./pages/audio'));
const ListenerStatsPage = lazy(() => import('./pages/listeners'));
const ChatPage = lazy(() => import('./pages/chat'));
const StreamingConfigPage = lazy(() => import('./pages/streaming-config'));
const SettingsPage = lazy(() => import('./pages/settings'));

export const AppRoutes = () => {
  return (
    <BrowserRouter>
      {/* Admin pages suspend inside Layout's own boundary, so the app bar and
          drawer stay visible; this one only covers Layout and Login. */}
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route index element={<HomePage />} />
          <Route path="login" element={<Login shouldRedirect />} />
          <Route path="admin" element={<Layout />}>
            {/* Each studio page needs a permission in the active studio;
                settings (profile, password) is open to every signed-in user. */}
            <Route
              path=""
              element={
                <Require permission="VIEW_ANALYTICS">
                  <Dashboard />
                </Require>
              }
            />
            <Route
              path="medias"
              element={
                <Require permission="VIEW_MEDIA">
                  <AudioManagerPage />
                </Require>
              }
            />
            <Route
              path="listeners"
              element={
                <Require permission="VIEW_ANALYTICS">
                  <ListenerStatsPage />
                </Require>
              }
            />
            <Route
              path="chat"
              element={
                <Require permission="MODERATE_CHAT">
                  <ChatPage />
                </Require>
              }
            />
            <Route
              path="streaming"
              element={
                <Require permission="VIEW_STREAM_CREDS">
                  <StreamingConfigPage />
                </Require>
              }
            />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};
