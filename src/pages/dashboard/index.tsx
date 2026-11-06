import React from 'react';
import {
  Box,
  Container,
  Grid,
  Typography,
  Alert,
  Skeleton,
  Stack,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useStudioId } from '@components/providers';
import { TrendChart } from './TrendChart';
import { CapacityPanel } from './CapacityPanel';
import { SummaryStrip } from './SummaryStrip';
import { CurrentQueueSlider } from './CurrentQueueSlider';
import { LiveListenersBadge } from './LiveListenersBadge';
import {
  useDashboardOverviewQuery,
  useStudioCapacityQuery,
} from '@graphql/hooks';
import type {
  ListeningSummary,
  ListeningTrend,
  QueueItem,
  StudioCapacity,
} from '@graphql/graphql';

// Capacity changes slowly and the API caches it for 60 s, so it polls less often.
const CAPACITY_POLL_MS = 60_000;

const CardSkeleton: React.FC<{ height: number }> = ({ height }) => (
  <Skeleton variant="rounded" height={height} sx={{ borderRadius: 3 }} />
);

export const DashboardPage: React.FC = () => {
  const { t } = useTranslation('dashboard');
  const studioId = useStudioId();
  const { data, loading, error } = useDashboardOverviewQuery({
    variables: { studioId, range: 'LAST_90_MIN' },
    fetchPolicy: 'network-only',
    pollInterval: 5000,
  });
  const { data: capacityData, loading: capacityLoading } =
    useStudioCapacityQuery({
      variables: { studioId },
      fetchPolicy: 'network-only',
      pollInterval: CAPACITY_POLL_MS,
    });

  const trend = data?.listeningTrend ?? null;
  const summary = data?.listeningSummaryCount ?? null;
  const capacity = capacityData?.studioCapacity ?? null;
  const queueItems = data?.currentQueue?.items ?? [];
  const liveListeners = data?.listenerOverview?.activeNow;

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 3 }, px: { xs: 2, sm: 3 } }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        justifyContent="space-between"
        gap={1.5}
        mb={3}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            {t('title')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('summaryTitle')}
          </Typography>
        </Box>
        {liveListeners !== undefined && (
          <LiveListenersBadge count={liveListeners} />
        )}
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {t('loadFailed', { message: error.message })}
        </Alert>
      )}

      <Stack spacing={{ xs: 1.5, md: 2 }}>
        {loading && !summary ? (
          <CardSkeleton height={112} />
        ) : (
          <SummaryStrip summary={summary as ListeningSummary} />
        )}

        <Grid container spacing={{ xs: 1.5, md: 2 }}>
          <Grid size={{ xs: 12, lg: 8 }}>
            {loading && !trend ? (
              <CardSkeleton height={360} />
            ) : (
              <TrendChart data={trend as ListeningTrend} />
            )}
          </Grid>
          <Grid size={{ xs: 12, lg: 4 }}>
            {capacityLoading && !capacity ? (
              <CardSkeleton height={360} />
            ) : (
              <CapacityPanel capacity={capacity as StudioCapacity} />
            )}
          </Grid>
        </Grid>

        {loading && queueItems.length === 0 ? (
          <CardSkeleton height={220} />
        ) : (
          <CurrentQueueSlider items={queueItems as QueueItem[]} />
        )}
      </Stack>
    </Container>
  );
};

export default DashboardPage;
