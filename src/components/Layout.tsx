import React, { Suspense, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { STUDIO_URL } from '@libs/constants';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useTheme,
  CircularProgress,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  MusicVideoOutlined,
  CommitOutlined,
  ForumOutlined,
  SettingsInputAntennaOutlined,
  LogoutOutlined,
} from '@mui/icons-material';
import { Link, Outlet, useLocation } from 'react-router';
import { logout } from '@graphql/client';
import { useAuth } from './providers/AuthContext';
import { useStudioId } from './providers/LanguageContext';
import Login from '../pages/login';
import RadioStreamPlayer from './RadioStreamPlayer';
import LanguageSelector from './LanguageSelector';
import SkipTrackButton from './SkipTrackButton';
import PageLoader from './PageLoader';

const drawerWidth = 260;

const Layout: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();
  const location = useLocation();
  const { t } = useTranslation('layout');
  const { isAuthenticated, isLoading, user } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const studioId = useStudioId();

  const studioBaseUrl = `${STUDIO_URL}/${studioId}`;

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  // On phones the drawer overlays the page, so close it once a page is picked.
  const closeMobileDrawer = () => setMobileOpen(false);

  const menuItems = [
    { text: t('nav.dashboard'), icon: <Dashboard />, path: '/admin' },
    {
      text: t('nav.audioManager'),
      icon: <MusicVideoOutlined />,
      path: '/admin/medias',
    },
    {
      text: t('nav.listenerStatistics'),
      icon: <CommitOutlined />,
      path: '/admin/listeners',
    },
    {
      text: t('nav.liveChat'),
      icon: <ForumOutlined />,
      path: '/admin/chat',
    },
    {
      text: t('nav.streamingApps'),
      icon: <SettingsInputAntennaOutlined />,
      path: '/admin/streaming',
    },
  ];

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout(); // reloads the page, so no need to reset the flag
  };

  const displayName = [user?.firstName, user?.lastName]
    .filter(Boolean)
    .join(' ');

  const drawer = (
    // Full-height column so the account section sits in the bottom-left corner.
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          p: 2,
          backgroundColor: theme.palette.primary.main,
          color: 'white',
        }}
      >
        <MusicVideoOutlined sx={{ mr: 2 }} />
        <Typography variant="h6" noWrap component="div" fontWeight={600}>
          {t('brand')}
        </Typography>
      </Box>
      <Divider />
      <List sx={{ mt: 1 }}>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              component={Link}
              to={item.path}
              onClick={closeMobileDrawer}
              selected={location.pathname === item.path}
              sx={{
                mx: 1,
                borderRadius: 2,
                '&.Mui-selected': {
                  backgroundColor: theme.palette.primary.light + '20',
                  color: theme.palette.primary.main,
                  '& .MuiListItemIcon-root': {
                    color: theme.palette.primary.main,
                  },
                },
                '&:hover': {
                  backgroundColor: theme.palette.primary.light + '10',
                },
              }}
            >
              <ListItemIcon
                sx={{
                  color:
                    location.pathname === item.path
                      ? theme.palette.primary.main
                      : theme.palette.text.secondary,
                  minWidth: 40,
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.text}
                slotProps={{
                  primary: {
                    fontSize: '0.9rem',
                    fontWeight: location.pathname === item.path ? 600 : 400,
                  },
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      {isAuthenticated && (
        <Box sx={{ mt: 'auto' }}>
          <Divider />
          <Box sx={{ px: 2, pt: 1.5, minWidth: 0 }}>
            {displayName && (
              <Typography variant="body2" fontWeight={600} noWrap>
                {displayName}
              </Typography>
            )}
            <Typography
              variant="caption"
              color="text.secondary"
              noWrap
              component="div"
              title={user?.email}
            >
              {user?.email}
            </Typography>
          </Box>
          <List sx={{ pb: 1.5 }}>
            <ListItem disablePadding>
              <ListItemButton
                onClick={handleLogout}
                disabled={loggingOut}
                sx={{
                  mx: 1,
                  borderRadius: 2,
                  color: theme.palette.error.main,
                  '&:hover': {
                    backgroundColor: theme.palette.error.light + '15',
                  },
                }}
              >
                <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}>
                  {loggingOut ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : (
                    <LogoutOutlined />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={loggingOut ? t('signingOut') : t('logout')}
                  slotProps={{
                    primary: { fontSize: '0.9rem', fontWeight: 500 },
                  }}
                />
              </ListItemButton>
            </ListItem>
          </List>
        </Box>
      )}
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
        }}
      >
        <Toolbar sx={{ px: { xs: 1, sm: 2 }, gap: { xs: 0.5, sm: 0 } }}>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: { xs: 0.5, sm: 2 }, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography
            variant="h6"
            noWrap
            component="div"
            color="text.primary"
            sx={{
              flexGrow: 1,
              minWidth: 0,
              fontSize: { xs: '1rem', sm: '1.25rem' },
            }}
          >
            {menuItems.find((item) => item.path === location.pathname)?.text ||
              t('nav.dashboard')}
          </Typography>
          <Box sx={{ mx: { xs: 0, sm: 2 }, minWidth: 0, flexShrink: 0 }}>
            <RadioStreamPlayer
              variant="compact"
              streamUrl={`${studioBaseUrl}/listen`}
              nowUrl={`${studioBaseUrl}/now`}
              statusUrl={`${studioBaseUrl}/status`}
              title={t('player.compactTitle')}
              renderActions={(nowPlaying) =>
                isAuthenticated && (
                  <SkipTrackButton studioId={studioId} {...nowPlaying} />
                )
              }
            />
          </Box>
          <LanguageSelector variant="short" />
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          // Let wide children (tables, charts) scroll inside themselves
          // instead of pushing the page sideways on phones.
          minWidth: 0,
          p: { xs: 1.5, sm: 2 },
          width: { md: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100dvh',
          backgroundColor: theme.palette.background.default,
        }}
      >
        {/* Spacer matching the app bar height, which MUI shrinks on phones. */}
        <Toolbar />
        {!isAuthenticated && !isLoading && <Login shouldRedirect={false} />}
        {isLoading && <CircularProgress />}
        {isAuthenticated && (
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        )}
      </Box>
    </Box>
  );
};

export default Layout;
