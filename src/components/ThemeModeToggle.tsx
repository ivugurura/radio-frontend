import React from 'react';
import {
  Box,
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
  /** `drawer` shows a "Theme" label beside the buttons; `compact` shows the buttons only. */
  variant?: 'drawer' | 'compact';
}

/** Light / system / dark switch. MUI persists the choice in localStorage. */
const ThemeModeToggle: React.FC<ThemeModeToggleProps> = ({
  variant = 'drawer',
}) => {
  const { t } = useTranslation('layout');
  const { mode, setMode } = useColorScheme();

  // `mode` is undefined until the color scheme provider has mounted.
  if (!mode) return null;

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

  if (variant === 'compact') return buttons;

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
