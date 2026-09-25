import React from 'react';
import { useTranslation } from 'react-i18next';
import { useStudioId } from '@components/providers';
import {
  Alert,
  Box,
  Button,
  Grid,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import dayjs from 'dayjs';
import type { CountryCount } from '@graphql/graphql';
import { useListenerOverviewQuery } from '@graphql/hooks';
import { ActiveListenersCard } from './ActiveListenersCard';
import { CountryList } from './CountryList';
import { WorldMap } from './WorldMap';

// Live figures: refresh often enough to feel "at the moment".
const POLL_INTERVAL_MS = 30_000;
const MAP_HEIGHT = 'max(480px, calc(100vh - 220px))';

export const ListenerStatsPage: React.FC = () => {
  const { t } = useTranslation('listeners');
  const studioId = useStudioId();

  const { data, loading, error, refetch } = useListenerOverviewQuery({
    variables: { studioId },
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL_MS,
  });

  const ov = data?.listenerOverview || null;
  const countries = (ov?.countries ?? []) as CountryCount[];
  const initialLoading = loading && !ov;

  // Stamp each successful response (polls included) so staff can tell how
  // fresh the numbers are.
  const [updatedAt, setUpdatedAt] = React.useState<Date | null>(null);
  React.useEffect(() => {
    if (ov) setUpdatedAt(new Date());
  }, [ov]);

  const renderLeft = () => {
    if (initialLoading) {
      return (
        <Stack spacing={2}>
          <Skeleton variant="rounded" height={130} />
          <Skeleton variant="rounded" height={160} />
        </Stack>
      );
    }
    return (
      <Stack spacing={2}>
        <ActiveListenersCard count={ov?.activeNow ?? 0} />
        <CountryList data={countries} />
      </Stack>
    );
  };

  const renderMap = () => {
    if (initialLoading) {
      return <Skeleton variant="rounded" height={MAP_HEIGHT} />;
    }
    return <WorldMap data={countries} height={MAP_HEIGHT} />;
  };

  return (
    <Box sx={{ p: 1 }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="flex-end"
        spacing={2}
        mb={1}
      >
        {updatedAt && (
          <Typography variant="body2" color="text.secondary">
            {t('lastUpdated', { time: dayjs(updatedAt).format('HH:mm:ss') })}
          </Typography>
        )}
        <Button
          variant="outlined"
          size="small"
          startIcon={<RefreshRoundedIcon />}
          onClick={() => refetch()}
          disabled={loading}
        >
          {loading ? t('refreshing') : t('refresh')}
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {t('loadFailed', { message: error.message })}
        </Alert>
      )}

      <Grid container spacing={1}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Typography variant="h5" mb={3}>
            {t('atTheMoment')}
          </Typography>
          {renderLeft()}
        </Grid>
        <Grid size={{ xs: 12, md: 8 }}>
          <Typography variant="h5" mb={3}>
            {t('worldwide')}
          </Typography>
          {renderMap()}
        </Grid>
      </Grid>
    </Box>
  );
};

export default ListenerStatsPage;
