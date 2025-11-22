import React from 'react';
import { Paper, Box, Typography, LinearProgress, Link } from '@mui/material';
import type { StudioCapacity } from '@graphql/graphql';

interface CapacityPanelProps {
  capacity: StudioCapacity | null;
  loading?: boolean;
}

const pct = (val: number, max: number) => {
  if (!max) return 0;
  return Math.min(100, (val / max) * 100);
};

export const CapacityPanel: React.FC<CapacityPanelProps> = ({
  capacity,
  loading,
}) => {
  const listeningHours = capacity
    ? (capacity.listeningSeconds / 3600).toFixed(2)
    : '0.00';
  const listeningQuotaHours = capacity
    ? (capacity.listeningSecondsQuota / 3600).toFixed(0)
    : '0';
  const diskUsed = capacity ? capacity.diskUsedGb.toFixed(2) : '0';
  const diskQuota = capacity ? capacity.diskQuotaGb.toFixed(0) : '0';

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        height: 240,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Listening time
        </Typography>
        {loading ? (
          <Typography variant="caption" color="text.secondary">
            Loading…
          </Typography>
        ) : (
          <Typography variant="h6" fontWeight={700}>
            {listeningHours}/{listeningQuotaHours} hours
          </Typography>
        )}
        <LinearProgress
          variant="determinate"
          value={
            capacity
              ? pct(capacity.listeningSeconds, capacity.listeningSecondsQuota)
              : 0
          }
          sx={{ mt: 1, height: 8, borderRadius: 4 }}
        />
      </Box>
      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Disk space
        </Typography>
        {loading ? (
          <Typography variant="caption" color="text.secondary">
            Loading…
          </Typography>
        ) : (
          <Typography variant="h6" fontWeight={700}>
            {diskUsed}/{diskQuota} Gb
          </Typography>
        )}
        <LinearProgress
          variant="determinate"
          value={capacity ? pct(capacity.diskUsedGb, capacity.diskQuotaGb) : 0}
          color="success"
          sx={{ mt: 1, height: 8, borderRadius: 4 }}
        />
      </Box>
      <Box>
        <Link
          href="#"
          underline="hover"
          sx={{
            fontSize: 13,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
          }}
        >
          Buy more storage
        </Link>
      </Box>
    </Paper>
  );
};
