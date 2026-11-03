import React from 'react';
import { Paper, Grid, Box, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  TrendingUp,
  TrendingDown,
  TrendingFlat,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import type { ListeningSummary } from '@graphql/graphql';

interface SummaryStripProps {
  summary: ListeningSummary | null;
}

type ChangeTone = 'success' | 'error' | 'neutral';

const changeTone = (changePct: number): ChangeTone => {
  if (changePct > 0) return 'success';
  if (changePct < 0) return 'error';
  return 'neutral';
};

const changeIcons: Record<ChangeTone, React.ElementType> = {
  success: TrendingUp,
  error: TrendingDown,
  neutral: TrendingFlat,
};

const formatCount = (value?: number | null) =>
  value === undefined || value === null ? '–' : value.toLocaleString();

const ChangeBadge: React.FC<{ changePct: number; label: string }> = ({
  changePct,
  label,
}) => {
  const tone = changeTone(changePct);
  const Icon = changeIcons[tone];
  const sign = changePct > 0 ? '+' : '';

  return (
    <Box display="flex" alignItems="center" gap={0.75} flexWrap="wrap" mt={1}>
      <Box
        sx={(theme) => {
          const base =
            tone === 'neutral'
              ? theme.palette.grey[600]
              : theme.palette[tone].dark;
          return {
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.25,
            px: 0.75,
            py: 0.125,
            borderRadius: 999,
            color: base,
            backgroundColor: alpha(base, 0.12),
          };
        }}
      >
        <Icon sx={{ fontSize: 16 }} />
        <Typography variant="body2" fontWeight={700} color="inherit">
          {sign}
          {changePct.toFixed(0)}%
        </Typography>
      </Box>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
    </Box>
  );
};

const SummaryTile: React.FC<{
  label: string;
  value?: number | null;
  change?: React.ReactNode;
}> = ({ label, value, change }) => (
  <Paper
    variant="outlined"
    sx={{
      p: { xs: 1.5, sm: 2 },
      borderRadius: 3,
      height: '100%',
      minWidth: 0,
    }}
  >
    <Typography
      variant="body2"
      color="text.secondary"
      noWrap
      title={label}
      sx={{ fontWeight: 500 }}
    >
      {label}
    </Typography>
    <Typography
      sx={{
        mt: 0.5,
        fontSize: { xs: '1.5rem', sm: '1.75rem' },
        fontWeight: 700,
        lineHeight: 1.2,
        fontVariantNumeric: 'tabular-nums',
        color: 'text.primary',
      }}
    >
      {formatCount(value)}
    </Typography>
    {change}
  </Paper>
);

export const SummaryStrip: React.FC<SummaryStripProps> = ({ summary }) => {
  const { t } = useTranslation('dashboard');
  const changePct = summary?.last30DaysChangePct;

  const tiles = [
    { key: 'today', value: summary?.today },
    { key: 'yesterday', value: summary?.yesterday },
    { key: 'last7Days', value: summary?.last7Days },
    {
      key: 'last30Days',
      value: summary?.last30Days,
      change:
        changePct === undefined || changePct === null ? undefined : (
          <ChangeBadge changePct={changePct} label={t('summary.vsPrev30')} />
        ),
    },
    { key: 'prev30Days', value: summary?.prev30Days },
    { key: 'lastMonth', value: summary?.lastMonth },
  ];

  return (
    <Grid container spacing={{ xs: 1.5, sm: 2 }}>
      {tiles.map((tile) => (
        <Grid key={tile.key} size={{ xs: 6, sm: 4, lg: 2 }}>
          <SummaryTile
            label={t(`summary.${tile.key}`)}
            value={tile.value}
            change={tile.change}
          />
        </Grid>
      ))}
    </Grid>
  );
};
