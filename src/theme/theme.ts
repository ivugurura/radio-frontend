import { createTheme, type Shadows } from '@mui/material/styles';

const shadows = [
  'none',
  '0px 2px 4px rgba(0, 0, 0, 0.05)',
  '0px 4px 8px rgba(0, 0, 0, 0.08)',
  '0px 8px 16px rgba(0, 0, 0, 0.12)',
  '0px 12px 24px rgba(0, 0, 0, 0.15)',
  '0px 16px 32px rgba(0, 0, 0, 0.18)',
  '0px 20px 40px rgba(0, 0, 0, 0.20)',
  '0px 24px 48px rgba(0, 0, 0, 0.22)',
  '0px 28px 56px rgba(0, 0, 0, 0.24)',
  '0px 32px 64px rgba(0, 0, 0, 0.26)',
  '0px 36px 72px rgba(0, 0, 0, 0.28)',
  '0px 40px 80px rgba(0, 0, 0, 0.30)',
  '0px 44px 88px rgba(0, 0, 0, 0.32)',
  '0px 48px 96px rgba(0, 0, 0, 0.34)',
  '0px 52px 104px rgba(0, 0, 0, 0.36)',
  '0px 56px 112px rgba(0, 0, 0, 0.38)',
  '0px 60px 120px rgba(0, 0, 0, 0.40)',
  '0px 64px 128px rgba(0, 0, 0, 0.42)',
  '0px 68px 136px rgba(0, 0, 0, 0.44)',
  '0px 72px 144px rgba(0, 0, 0, 0.46)',
  '0px 76px 152px rgba(0, 0, 0, 0.48)',
  '0px 80px 160px rgba(0, 0, 0, 0.50)',
  '0px 84px 168px rgba(0, 0, 0, 0.52)',
  '0px 88px 176px rgba(0, 0, 0, 0.54)',
  '0px 92px 184px rgba(0, 0, 0, 0.56)',
] as Shadows;

const status = {
  success: { main: '#4caf50', light: '#81c784', dark: '#388e3c' },
  warning: { main: '#ff9800', light: '#ffb74d', dark: '#f57c00' },
  error: { main: '#f44336', light: '#e57373', dark: '#d32f2f' },
  info: { main: '#2196f3', light: '#64b5f6', dark: '#1976d2' },
};

/**
 * Light + dark color schemes driven by CSS variables. The active mode
 * (`light | dark | system`) is chosen with `useColorScheme()` and persisted by
 * MUI in localStorage, so it survives reloads.
 */
export const theme = createTheme({
  cssVariables: { colorSchemeSelector: 'class' },
  colorSchemes: {
    light: {
      palette: {
        primary: {
          main: '#1976d2',
          light: '#42a5f5',
          dark: '#1565c0',
          contrastText: '#ffffff',
        },
        secondary: {
          main: '#0288d1',
          light: '#03dac6',
          dark: '#018786',
          contrastText: '#ffffff',
        },
        background: { default: '#f5f7fa', paper: '#ffffff' },
        text: { primary: '#1a1a1a', secondary: '#666666' },
        divider: '#e0e6ed',
        ...status,
      },
    },
    dark: {
      palette: {
        primary: {
          main: '#5aa9f0',
          light: '#8cc5f6',
          dark: '#1976d2',
          contrastText: '#ffffff',
        },
        secondary: {
          main: '#4fc3f7',
          light: '#03dac6',
          dark: '#0288d1',
          contrastText: '#ffffff',
        },
        background: { default: '#0b1220', paper: '#121a2b' },
        text: { primary: '#e6ebf2', secondary: '#9aa7b8' },
        divider: '#24304a',
        ...status,
      },
    },
  },
  typography: {
    fontFamily: '"Roboto Slab", Georgia, "Times New Roman", serif',
    h1: { fontSize: '2.5rem', fontWeight: 600 },
    h2: { fontSize: '2rem', fontWeight: 600 },
    h3: { fontSize: '1.75rem', fontWeight: 500 },
    h4: { fontSize: '1.5rem', fontWeight: 500 },
    h5: { fontSize: '1.25rem', fontWeight: 500 },
    h6: { fontSize: '1rem', fontWeight: 500 },
    // Muted variants follow the active scheme's secondary text color.
    subtitle1: {
      fontSize: '1rem',
      fontWeight: 400,
      color: 'var(--mui-palette-text-secondary)',
    },
    body1: { fontSize: '0.875rem' },
    body2: { fontSize: '0.75rem', color: 'var(--mui-palette-text-secondary)' },
  },
  shape: { borderRadius: 8 },
  shadows,
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          borderRadius: 8,
          padding: '8px 16px',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 12,
          border: `1px solid ${theme.vars.palette.divider}`,
        }),
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: ({ theme }) => ({
          backgroundColor: theme.vars.palette.background.paper,
          borderRight: `1px solid ${theme.vars.palette.divider}`,
        }),
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundColor: theme.vars.palette.background.paper,
          // Dark mode paper gets an elevation overlay; keep the bar flat.
          backgroundImage: 'none',
          color: theme.vars.palette.text.primary,
          boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.05)',
          borderBottom: `1px solid ${theme.vars.palette.divider}`,
        }),
      },
    },
  },
});
