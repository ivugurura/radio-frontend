import React from 'react';
import { STUDIO_ID } from '@libs/constants';
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
  const [range, setRange] = React.useState<TimeRange>('LAST_24_HOURS');

  const { data, loading, error, refetch } = useListenerOverviewQuery({
    variables: { studioId: STUDIO_ID, range },
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
          Listener Statistics
        </Typography>
        <Stack direction="row" spacing={2}>
          <FormControl size="small">
            <InputLabel id="range-label">Range</InputLabel>
            <Select
              labelId="range-label"
              label="Range"
              value={range}
              onChange={(e) => setRange(e.target.value as TimeRange)}
            >
              <MenuItem value="LAST_24_HOURS">Last 24 hours</MenuItem>
              <MenuItem value="LAST_7_DAYS">Last 7 days</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            onClick={() => refetch()}
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </Stack>
      </Stack>

      {error && (
        <Alert severity="error">Error loading stats: {error.message}</Alert>
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
          <Alert severity="info">No statistics available.</Alert>
        )}
      </Box>

      <Divider sx={{ my: 2 }} />

      <Typography variant="h6" mb={1}>
        Listeners by Country
      </Typography>
      {loading && !ov ? (
        <Skeleton variant="rounded" height={440} />
      ) : ov ? (
        <WorldMap data={ov.countries! as CountryCount[]} height={720} />
      ) : (
        <Alert severity="info">No map data to display.</Alert>
      )}
    </Container>
  );
};

export default ListenerStatsPage;
