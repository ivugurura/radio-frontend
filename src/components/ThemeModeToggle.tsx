import React from 'react';
import {
  Box,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  useColorScheme,
} from '@mui/material';
import {
  LightModeOutlined,
  DarkModeOutlined,
  SettingsBrightnessOutlined,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

type ThemeMode = 'light' | 'dark' | 'system';

const MODES: { value: ThemeMode; icon: React.ReactElement }[] = [
  { value: 'light', icon: <LightModeOutlined fontSize="small" /> },
  { value: 'system', icon: <SettingsBrightnessOutlined fontSize="small" /> },
  { value: 'dark', icon: <DarkModeOutlined fontSize="small" /> },
];

interface ThemeModeToggleProps {
  /**
   * `drawer` shows a "Theme" label beside light / system / dark buttons;
   * `compact` is a single button that flips between light and dark.
   */
  variant?: 'drawer' | 'compact';
}

/** One button: shows the theme it switches to, starting from what's on screen. */
const ThemeOnOffButton: React.FC<{
  isDark: boolean;
  onToggle: () => void;
}> = ({ isDark, onToggle }) => {
  const { t } = useTranslation('layout');
  const label = isDark ? t('theme.light') : t('theme.dark');

  return (
    <Tooltip title={label}>
      <IconButton size="small" onClick={onToggle} aria-label={label}>
        {isDark ? (
          <LightModeOutlined fontSize="small" />
        ) : (
          <DarkModeOutlined fontSize="small" />
        )}
      </IconButton>
    </Tooltip>
  );
};

/** Theme switch. MUI persists the choice in localStorage. */
const ThemeModeToggle: React.FC<ThemeModeToggleProps> = ({
  variant = 'drawer',
}) => {
  const { t } = useTranslation('layout');
  const { mode, systemMode, setMode } = useColorScheme();

  // `mode` is undefined until the color scheme provider has mounted.
  if (!mode) return null;

  if (variant === 'compact') {
    // In `system` mode the screen follows the OS, so flip from that.
    const isDark = (mode === 'system' ? systemMode : mode) === 'dark';
    return (
      <ThemeOnOffButton
        isDark={isDark}
        onToggle={() => setMode(isDark ? 'light' : 'dark')}
      />
    );
  }

  const handleChange = (_: React.MouseEvent, next: ThemeMode | null) => {
    if (next) setMode(next);
  };

  const buttons = (
    <ToggleButtonGroup
      size="small"
      exclusive
      value={mode}
      onChange={handleChange}
      aria-label={t('theme.label')}
    >
      {MODES.map(({ value, icon }) => (
        <Tooltip key={value} title={t(`theme.${value}`)}>
          <ToggleButton
            value={value}
            aria-label={t(`theme.${value}`)}
            sx={{ px: 1, py: 0.5 }}
          >
            {icon}
          </ToggleButton>
        </Tooltip>
      ))}
    </ToggleButtonGroup>
  );

  return (
    <Box
      sx={{
        mx: 2,
        my: 0.5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1,
      }}
    >
      <Typography variant="body2" fontSize="0.9rem">
        {t('theme.label')}
      </Typography>
      {buttons}
    </Box>
  );
};

export default ThemeModeToggle;
