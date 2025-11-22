import React from 'react';
import { Paper, Grid, Box, Typography } from '@mui/material';
import type { ListeningSummary } from '@graphql/graphql';

interface SummaryStripProps {
  summary: ListeningSummary | null;
  loading?: boolean;
}

const SummaryCell: React.FC<{
  label: string;
  value?: number | string;
  changePct?: number;
}> = ({ label, value = '-', changePct }) => {
  const color =
    changePct === undefined
      ? 'text.primary'
      : changePct > 0
        ? 'success.main'
        : changePct < 0
          ? 'error.main'
          : 'text.secondary';

  return (
    <Box textAlign="center">
      <Typography variant="h6" fontWeight={600}>
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      {changePct !== undefined && (
        <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color }}>
          {changePct > 0 ? '+' : ''}
          {changePct.toFixed(0)}%
        </Typography>
      )}
    </Box>
  );
};

export const SummaryStrip: React.FC<SummaryStripProps> = ({
  summary,
  loading,
}) => {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      {loading && !summary ? (
        <Typography variant="body2" color="text.secondary">
          Loading summary…
        </Typography>
      ) : (
        <Grid container spacing={2}>
          <Grid size={{ xs: 6, md: 2 }}>
            <SummaryCell label="today" value={summary?.today} />
          </Grid>
          <Grid size={{ xs: 6, md: 2 }}>
            <SummaryCell label="yesterday" value={summary?.yesterday} />
          </Grid>
          <Grid size={{ xs: 6, md: 2 }}>
            <SummaryCell label="last 7 days" value={summary?.last7Days} />
          </Grid>
          <Grid size={{ xs: 6, md: 2 }}>
            <SummaryCell
              label="last 30 days"
              value={summary?.last30Days}
              changePct={summary?.last30DaysChangePct}
            />
          </Grid>
          <Grid size={{ xs: 6, md: 2 }}>
            <SummaryCell label="30 days before" value={summary?.prev30Days} />
          </Grid>
          <Grid size={{ xs: 6, md: 2 }}>
            <SummaryCell label="last month" value={summary?.lastMonth} />
          </Grid>
        </Grid>
      )}
    </Paper>
  );
};
