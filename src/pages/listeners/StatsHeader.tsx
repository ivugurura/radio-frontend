import React from 'react';
import { Grid, Paper, Typography, Box } from '@mui/material';

type Props = {
  activeNow: number;
  peakLastHour: number;
  peakLast24h: number;
  listenerMinutes24h: number;
};

const StatCard: React.FC<{ title: string; value: React.ReactNode }> = ({
  title,
  value,
}) => (
  <Paper elevation={0} variant="outlined" sx={{ p: 2, height: '100%' }}>
    <Typography variant="caption" color="text.secondary">
      {title}
    </Typography>
    <Box mt={0.5}>
      <Typography variant="h5" fontWeight={700}>
        {value}
      </Typography>
    </Box>
  </Paper>
);

export const StatsHeader: React.FC<Props> = ({
  activeNow,
  peakLastHour,
  peakLast24h,
  listenerMinutes24h,
}) => {
  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <StatCard title="Active listeners now" value={activeNow} />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <StatCard title="Peak (last hour)" value={peakLastHour} />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <StatCard title="Peak (last 24h)" value={peakLast24h} />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <StatCard title="Listener minutes (24h)" value={listenerMinutes24h} />
      </Grid>
    </Grid>
  );
};
