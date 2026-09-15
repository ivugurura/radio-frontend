import React from 'react';
import { useTranslation } from 'react-i18next';
import { useStudioId } from '@components/providers';
import {
  Alert,
  Box,
  Button,
  Container,
  Divider,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import type { CountryCount, TimeRange } from '@graphql/graphql';
import { useListenerOverviewQuery } from '@graphql/hooks';
import { StatsHeader } from './StatsHeader';
import { WorldMap } from './WorldMap';

export const ListenerStatsPage: React.FC = () => {
  const { t } = useTranslation('listeners');
  const studioId = useStudioId();
  const [range, setRange] = React.useState<TimeRange>('LAST_24_HOURS');

  const { data, loading, error, refetch } = useListenerOverviewQuery({
    variables: { studioId, range },
    fetchPolicy: 'cache-and-network',
  });

  const ov = data?.listenerOverview || null;

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        spacing={2}
        mb={2}
      >
        <Typography variant="h5" fontWeight={700}>
          {t('title')}
        </Typography>
        <Stack direction="row" spacing={2}>
          <FormControl size="small">
            <InputLabel id="range-label">{t('range')}</InputLabel>
            <Select
              labelId="range-label"
              label={t('range')}
              value={range}
              onChange={(e) => setRange(e.target.value as TimeRange)}
            >
              <MenuItem value="LAST_24_HOURS">
                {t('rangeOptions.last24h')}
              </MenuItem>
              <MenuItem value="LAST_7_DAYS">
                {t('rangeOptions.last7d')}
              </MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            onClick={() => refetch()}
            disabled={loading}
          >
            {loading ? t('refreshing') : t('refresh')}
          </Button>
        </Stack>
      </Stack>

      {error && (
        <Alert severity="error">
          {t('loadFailed', { message: error.message })}
        </Alert>
      )}

      <Box mb={2}>
        {loading && !ov ? (
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Skeleton variant="rounded" height={90} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Skeleton variant="rounded" height={90} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Skeleton variant="rounded" height={90} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Skeleton variant="rounded" height={90} />
            </Grid>
          </Grid>
        ) : ov ? (
          <StatsHeader
            activeNow={ov.activeNow!}
            peakLastHour={ov.peakLastHour!}
            peakLast24h={ov.peakLast24h!}
            listenerMinutes24h={ov.listenerMinutesLast24h!}
          />
        ) : (
          <Alert severity="info">{t('noStats')}</Alert>
        )}
      </Box>

      <Divider sx={{ my: 2 }} />

      <Typography variant="h6" mb={1}>
        {t('byCountry')}
      </Typography>
      {loading && !ov ? (
        <Skeleton variant="rounded" height={440} />
      ) : ov ? (
        <WorldMap data={ov.countries! as CountryCount[]} height={720} />
      ) : (
        <Alert severity="info">{t('noMapData')}</Alert>
      )}
    </Container>
  );
};

export default ListenerStatsPage;
