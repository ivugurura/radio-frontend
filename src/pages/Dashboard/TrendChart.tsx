import React, { useMemo } from 'react';
import { Paper, Box, Typography } from '@mui/material';
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
}

const formatTime = (iso: string) => dayjs(iso).format('HH:mm');

export const TrendChart: React.FC<Props> = ({
  data,
  height = 240,
  loading,
}) => {
  const chartData: ListeningTrendPoint[] = useMemo(
    () => data?.points ?? [],
    [data]
  );

  const peak = data?.peak;

  return (
    <Paper variant="outlined" sx={{ p: 2, height }}>
      <Box display="flex" justifyContent="space-between" mb={1}>
        <Typography variant="subtitle2">
          You are listening in real time
        </Typography>
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
