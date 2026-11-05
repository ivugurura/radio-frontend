import React, { useMemo } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import {
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
} from 'recharts';
import type { TooltipContentProps } from 'recharts';
import type {
  NameType,
  ValueType,
} from 'recharts/types/component/DefaultTooltipContent';
import dayjs from 'dayjs';
import type { ListeningTrend, ListeningTrendPoint } from '@graphql/graphql';
import { DashboardCard } from './DashboardCard';

interface Props {
  data: ListeningTrend | null;
}

const formatTime = (iso: string) => dayjs(iso).format('HH:mm');

const TrendTooltip: React.FC<TooltipContentProps<ValueType, NameType>> = ({
  active,
  payload,
  label,
}) => {
  const { t } = useTranslation('dashboard');
  if (!active || !payload?.length) return null;
  const count = Number(payload[0].value ?? 0);

  return (
    <Paper elevation={3} sx={{ px: 1.5, py: 1, borderRadius: 2 }}>
      <Typography variant="body2" color="text.secondary">
        {dayjs(label as string).format('HH:mm:ss')}
      </Typography>
      <Typography variant="body1" fontWeight={700}>
        {t('trend.tooltipListeners', { count })}
      </Typography>
    </Paper>
  );
};

export const TrendChart: React.FC<Props> = ({ data }) => {
  const { t } = useTranslation('dashboard');
  const theme = useTheme();
  const chartData: ListeningTrendPoint[] = useMemo(
    () => data?.points ?? [],
    [data],
  );

  const peak = data?.peak;
  // Today's peak can be older than the charted window.
  const isPeakCharted = chartData.some((point) => point.ts === peak?.ts);
  const stroke = (theme.vars || theme).palette.primary.main;
  const axisTick = {
    fill: (theme.vars || theme).palette.text.secondary,
    fontSize: 12,
  };

  return (
    <DashboardCard
      title={t('trend.title')}
      subtitle={t('trend.subtitle')}
      action={
        peak && (
          <Typography variant="body2" color="text.secondary">
            {t('peakToday', {
              count: peak.active,
              time: formatTime(peak.ts),
            })}
          </Typography>
        )
      }
    >
      {/* Grows to match the card beside it instead of leaving a gap. */}
      <Box sx={{ flex: 1, minHeight: { xs: 220, sm: 260, lg: 280 }, mx: -1 }}>
        {chartData.length === 0 ? (
          <Box
            height="100%"
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <Typography variant="body2" color="text.secondary">
              {t('trend.empty')}
            </Typography>
          </Box>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
            >
              <defs>
                <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={stroke} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={stroke} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid
                vertical={false}
                stroke={(theme.vars || theme).palette.divider}
                strokeDasharray="3 3"
              />
              <XAxis
                dataKey="ts"
                tickFormatter={formatTime}
                minTickGap={48}
                tick={axisTick}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis
                allowDecimals={false}
                width={36}
                tick={axisTick}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                content={(props) => <TrendTooltip {...props} />}
                cursor={{
                  stroke: (theme.vars || theme).palette.text.secondary,
                  strokeWidth: 1,
                }}
              />
              <Area
                type="monotone"
                dataKey="active"
                stroke={stroke}
                fill="url(#colorActive)"
                strokeWidth={2}
                activeDot={{
                  r: 5,
                  fill: stroke,
                  stroke: (theme.vars || theme).palette.background.paper,
                  strokeWidth: 2,
                }}
                isAnimationActive={false}
              />
              {peak && isPeakCharted && (
                <ReferenceDot
                  x={peak.ts}
                  y={peak.active}
                  r={5}
                  fill={(theme.vars || theme).palette.warning.main}
                  stroke={(theme.vars || theme).palette.background.paper}
                  strokeWidth={2}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Box>
    </DashboardCard>
  );
};
