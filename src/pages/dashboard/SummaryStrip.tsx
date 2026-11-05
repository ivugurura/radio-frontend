import React from 'react';
import { Paper, Box, Stack, Typography } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import {
  TrendingUp,
  TrendingDown,
  TrendingFlat,
  TodayOutlined,
  HistoryOutlined,
  DateRangeOutlined,
  CalendarMonthOutlined,
  // EventRepeatOutlined,
  EventNoteOutlined,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import type { ListeningSummary } from '@graphql/graphql';

interface SummaryStripProps {
  summary: ListeningSummary | null;
}

type Tone = 'primary' | 'success' | 'error' | 'neutral';

const changeTone = (changePct: number): Tone => {
  if (changePct > 0) return 'success';
  if (changePct < 0) return 'error';
  return 'neutral';
};

const changeIcons: Record<Tone, React.ElementType> = {
  primary: TrendingFlat,
  success: TrendingUp,
  error: TrendingDown,
  neutral: TrendingFlat,
};

const toneColor = (theme: Theme, tone: Tone) => {
  if (tone === 'neutral') return (theme.vars || theme).palette.text.secondary;
  if (tone === 'primary') return (theme.vars || theme).palette.primary.main;
  return (theme.vars || theme).palette[tone].dark;
};

const formatCount = (value?: number | null) =>
  value === undefined || value === null ? '–' : value.toLocaleString();

const formatChange = (changePct?: number | null) => {
  if (changePct === undefined || changePct === null) return '–';
  const sign = changePct > 0 ? '+' : '';
  return `${sign}${changePct.toFixed(0)}%`;
};

const SummaryTile: React.FC<{
  label: string;
  icon: React.ElementType;
  value: string;
  caption?: string;
  tone?: Tone;
}> = ({ label, icon: Icon, value, caption, tone = 'primary' }) => (
  <Paper
    variant="outlined"
    sx={{
      p: { xs: 1.5, sm: 2 },
      borderRadius: 3,
      height: '100%',
      minWidth: 0,
    }}
  >
    <Stack direction="row" spacing={1} alignItems="flex-start">
      <Box flex={1} minWidth={0}>
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
          {value}
        </Typography>
        {caption && (
          <Typography
            variant="body2"
            color="text.secondary"
            noWrap
            title={caption}
            mt={0.25}
          >
            {caption}
          </Typography>
        )}
      </Box>
      <Box
        sx={(theme) => ({
          width: 36,
          height: 36,
          borderRadius: 2,
          display: { xs: 'none', sm: 'grid' },
          placeItems: 'center',
          flexShrink: 0,
          color: toneColor(theme, tone),
          backgroundColor: theme.alpha(toneColor(theme, tone), 0.1),
        })}
      >
        <Icon fontSize="small" />
      </Box>
    </Stack>
  </Paper>
);

export const SummaryStrip: React.FC<SummaryStripProps> = ({ summary }) => {
  const { t } = useTranslation('dashboard');
  const changePct = summary?.last30DaysChangePct;
  const changeToneValue =
    changePct === undefined || changePct === null
      ? 'neutral'
      : changeTone(changePct);

  // value counts listens (sessions of 30 s or more); unique counts the
  // distinct listeners behind them.
  const tiles = [
    {
      key: 'today',
      icon: TodayOutlined,
      value: summary?.today,
      unique: summary?.uniqueToday,
    },
    {
      key: 'yesterday',
      icon: HistoryOutlined,
      value: summary?.yesterday,
      unique: summary?.uniqueYesterday,
    },
    {
      key: 'last7Days',
      icon: DateRangeOutlined,
      value: summary?.last7Days,
      unique: summary?.uniqueLast7Days,
    },
    {
      key: 'last30Days',
      icon: CalendarMonthOutlined,
      value: summary?.last30Days,
      unique: summary?.uniqueLast30Days,
    },
    // {
    //   key: 'prev30Days',
    //   icon: EventRepeatOutlined,
    //   value: summary?.prev30Days,
    // },
    {
      key: 'lastMonth',
      icon: EventNoteOutlined,
      value: summary?.lastMonth,
      unique: summary?.uniqueLastMonth,
    },
  ];

  const uniqueCaption = (count?: number | null) => {
    if (count === undefined || count === null) return undefined;
    return t('summary.uniqueListeners', {
      count,
      formatted: count.toLocaleString(),
    });
  };

  return (
    // auto-fill keeps every tile the same width, however many fit per row.
    <Box
      display="grid"
      gap={{ xs: 1.5, md: 2 }}
      sx={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}
    >
      {tiles.map((tile) => (
        <SummaryTile
          key={tile.key}
          label={t(`summary.${tile.key}`)}
          icon={tile.icon}
          value={formatCount(tile.value)}
          caption={uniqueCaption(tile.unique)}
        />
      ))}
      <SummaryTile
        label={t('summary.change30Days')}
        icon={changeIcons[changeToneValue]}
        value={formatChange(changePct)}
        caption={t('summary.vsPrev30')}
        tone={changeToneValue}
      />
    </Box>
  );
};
