import React from 'react';
import { Container, Grid, Typography, Alert, Skeleton } from '@mui/material';
import { STUDIO_ID } from '@libs/constants';
import { TrendChart } from './TrendChart';
import { CapacityPanel } from './CapacityPanel';
import { SummaryStrip } from './SummaryStrip';
import { CurrentQueueSlider } from './CurrentQueueSlider';
import { useDashboardOverviewQuery } from '@graphql/hooks';
import type {
  ListeningSummary,
  ListeningTrend,
  QueueItem,
  StudioCapacity,
} from '@graphql/graphql';

/**
 * If you want periodic refresh for near-real-time graph:
 * set pollInterval in useQuery options (e.g., pollInterval: 15000)
 */

export const DashboardPage: React.FC = () => {
  const { data, loading, error } = useDashboardOverviewQuery({
    variables: { studioId: STUDIO_ID, range: 'LAST_90_MIN' },
    fetchPolicy: 'network-only',
    pollInterval: 5000,
  });

  const trend = data?.listeningTrend ?? null;
  const summary = data?.listeningSummaryCount ?? null;
  const capacity = data?.studioCapacity ?? null;
  const queueItems = data?.currentQueue?.items ?? [];

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Typography variant="h5" fontWeight={700} mb={2}>
        Dashboard
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load dashboard: {error.message}
        </Alert>
      )}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 8 }}>
          {loading && !trend ? (
            <Skeleton variant="rounded" height={240} />
          ) : (
            <TrendChart
              data={trend as ListeningTrend}
              loading={loading && !trend}
            />
          )}
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          {loading && !capacity ? (
            <Skeleton variant="rounded" height={240} />
          ) : (
            <CapacityPanel
              capacity={capacity as StudioCapacity}
              loading={loading && !capacity}
            />
          )}
        </Grid>

        <Grid size={{ xs: 12, md: 12 }} mt={2}>
          <Typography variant="h6" fontWeight={600} mb={1}>
            Summary of your listening
          </Typography>
          {loading && !summary ? (
            <Skeleton variant="rounded" height={120} />
          ) : (
            <SummaryStrip
              summary={summary as ListeningSummary}
              loading={loading && !summary}
            />
          )}
        </Grid>

        <Grid size={{ xs: 12, md: 12 }} mt={2}>
          <Typography variant="h6" fontWeight={600} mb={1}>
            Currently
          </Typography>
          {loading && queueItems.length === 0 ? (
            <Skeleton variant="rounded" height={140} />
          ) : (
            <CurrentQueueSlider
              items={queueItems as QueueItem[]}
              loading={loading && queueItems.length === 0}
            />
          )}
        </Grid>
      </Grid>
    </Container>
  );
};

export default DashboardPage;
