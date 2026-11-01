import React, { useMemo } from 'react';
import { Paper, Box, Typography } from '@mui/material';
import { keyframes } from '@emotion/react';
import { useTranslation } from 'react-i18next';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
} from 'recharts';
import dayjs from 'dayjs';
import type { ListeningTrend, ListeningTrendPoint } from '@graphql/graphql';

interface Props {
  data: ListeningTrend | null;
  height?: number;
  loading?: boolean;
  liveListeners?: number;
}

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
`;

const formatTime = (iso: string) => dayjs(iso).format('HH:mm');

const LiveListenersBadge: React.FC<{ count: number }> = ({ count }) => {
  const { t } = useTranslation('listeners');
  const hasListeners = count > 0;
  const color = hasListeners ? '#e63946' : '#6c82a3';

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        px: 1.25,
        py: 0.25,
        borderRadius: 999,
        whiteSpace: 'nowrap',
        backgroundColor: hasListeners
          ? 'rgba(230, 57, 70, 0.1)'
          : 'rgba(108, 130, 163, 0.12)',
      }}
    >
      <Box
        sx={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          backgroundColor: color,
          animation: hasListeners
            ? `${pulse} 1.4s ease-in-out infinite`
            : 'none',
        }}
      />
      <Typography
        variant="caption"
        sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', color }}
      >
        {count}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {t('connectedListener', { count })}
      </Typography>
    </Box>
  );
};

export const TrendChart: React.FC<Props> = ({
  data,
  height = 240,
  loading,
  liveListeners,
}) => {
  const chartData: ListeningTrendPoint[] = useMemo(
    () => data?.points ?? [],
    [data],
  );

  const peak = data?.peak;

  return (
    <Paper variant="outlined" sx={{ p: 2, height }}>
      <Box display="flex" justifyContent="space-between" gap={1} mb={1}>
        <Box display="flex" alignItems="center" flexWrap="wrap" gap={1}>
          {liveListeners !== undefined && (
            <LiveListenersBadge count={liveListeners} />
          )}
        </Box>
        {peak && (
          <Typography variant="caption" color="text.secondary">
            Peak at {formatTime(peak.ts)} – {peak.active} listening(s)
          </Typography>
        )}
      </Box>
      {loading ? (
        <Box
          sx={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Loading trend…
          </Typography>
        </Box>
      ) : (
        <ResponsiveContainer width="100%" height="85%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.7} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="ts"
              tickFormatter={(v) => dayjs(v).format('HH:mm')}
              minTickGap={40}
            />
            <YAxis />
            <Tooltip
              labelFormatter={(v) => dayjs(v).format('HH:mm:ss')}
              formatter={(val) => [`${val} listeners`, 'Active']}
            />
            <Area
              type="monotone"
              dataKey="active"
              stroke="#06b6d4"
              fill="url(#colorActive)"
              strokeWidth={2}
              isAnimationActive={false}
            />
            {peak && (
              <ReferenceDot
                x={peak.ts}
                y={peak.active}
                r={4}
                fill="#ef4444"
                stroke="#fff"
                strokeWidth={1}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      )}
    </Paper>
  );
};
