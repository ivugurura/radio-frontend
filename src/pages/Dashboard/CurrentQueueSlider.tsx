import React, { useEffect, useState } from 'react';
import {
  Avatar,
  Box,
  Divider,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { keyframes } from '@emotion/react';
import { MusicNote } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import type { QueueItem } from '@graphql/graphql';
import { DashboardCard } from './DashboardCard';

interface CurrentQueueSliderProps {
  items: QueueItem[];
}

const equalizer = keyframes`
  0%, 100% { transform: scaleY(0.3); }
  50% { transform: scaleY(1); }
`;

const ellipsis = {
  display: 'block',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
} as const;

const formatDuration = (totalSec: number) => {
  const sec = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(sec / 60);
  const s = String(sec % 60).padStart(2, '0');
  return `${m}:${s}`;
};

const useNow = (intervalMs: number) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
};

const Equalizer: React.FC = () => (
  <Box display="flex" alignItems="flex-end" gap="2px" height={12}>
    {[0, 0.2, 0.4].map((delay) => (
      <Box
        key={delay}
        sx={{
          width: 3,
          height: '100%',
          borderRadius: 1,
          backgroundColor: 'currentColor',
          transformOrigin: 'bottom',
          animation: `${equalizer} 0.9s ease-in-out ${delay}s infinite`,
        }}
      />
    ))}
  </Box>
);

const Cover: React.FC<{ item: QueueItem; size: number }> = ({ item, size }) => (
  <Avatar
    src={item.coverUrl ?? undefined}
    variant="rounded"
    sx={(theme) => ({
      width: size,
      height: size,
      borderRadius: 2,
      color: theme.palette.primary.main,
      backgroundColor: alpha(theme.palette.primary.main, 0.1),
    })}
  >
    <MusicNote sx={{ fontSize: size * 0.5 }} />
  </Avatar>
);

const NowPlayingHero: React.FC<{ item: QueueItem }> = ({ item }) => {
  const { t } = useTranslation('dashboard');
  const now = useNow(1000);
  const duration = item.durationSec ?? 0;
  const elapsed = item.startedAt
    ? Math.min(duration, (now - dayjs(item.startedAt).valueOf()) / 1000)
    : 0;
  const progress = duration ? (elapsed / duration) * 100 : 0;

  return (
    <Box
      sx={(theme) => ({
        p: { xs: 1.5, sm: 2 },
        borderRadius: 3,
        background: `linear-gradient(135deg, ${alpha(
          theme.palette.primary.main,
          0.1,
        )} 0%, ${alpha(theme.palette.secondary.main, 0.04)} 100%)`,
        border: '1px solid',
        borderColor: alpha(theme.palette.primary.main, 0.2),
      })}
    >
      <Stack direction="row" spacing={2} alignItems="center">
        <Cover item={item} size={64} />
        <Box flex={1} minWidth={0}>
          <Stack
            direction="row"
            spacing={0.75}
            alignItems="center"
            sx={{ color: 'primary.main', mb: 0.5 }}
          >
            <Equalizer />
            <Typography
              variant="body2"
              fontWeight={700}
              color="inherit"
              sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}
            >
              {t('queue.onAir')}
            </Typography>
          </Stack>
          <Typography
            variant="subtitle1"
            fontWeight={700}
            color="text.primary"
            title={item.title}
            sx={ellipsis}
          >
            {item.title}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            title={item.artist ?? undefined}
            sx={ellipsis}
          >
            {item.artist || t('queue.unknownArtist')}
          </Typography>
        </Box>
      </Stack>
      {duration > 0 && (
        <Box mt={2}>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={(theme) => ({
              height: 6,
              borderRadius: 3,
              backgroundColor: alpha(theme.palette.primary.main, 0.15),
              '& .MuiLinearProgress-bar': { borderRadius: 3 },
            })}
          />
          <Box
            display="flex"
            justifyContent="space-between"
            mt={0.5}
            sx={{ fontVariantNumeric: 'tabular-nums' }}
          >
            <Typography variant="body2" color="text.secondary">
              {formatDuration(elapsed)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {formatDuration(duration)}
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
};

const QueueRow: React.FC<{ item: QueueItem }> = ({ item }) => {
  const { t } = useTranslation('dashboard');

  return (
    <Stack direction="row" spacing={1.5} alignItems="center" py={1.25}>
      <Cover item={item} size={40} />
      <Box flex={1} minWidth={0}>
        <Typography
          variant="body1"
          fontWeight={600}
          title={item.title}
          sx={ellipsis}
        >
          {item.title}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          title={item.artist ?? undefined}
          sx={ellipsis}
        >
          {item.artist || t('queue.unknownArtist')}
        </Typography>
      </Box>
      <Box textAlign="right" flexShrink={0}>
        <Typography
          variant="body2"
          fontWeight={600}
          color="text.primary"
          sx={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {item.startedAt ? dayjs(item.startedAt).format('HH:mm') : '–'}
        </Typography>
        {item.durationSec ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {formatDuration(item.durationSec)}
          </Typography>
        ) : null}
      </Box>
    </Stack>
  );
};

export const CurrentQueueSlider: React.FC<CurrentQueueSliderProps> = ({
  items,
}) => {
  const { t } = useTranslation('dashboard');
  const current = items.find((it) => it.isCurrent);
  const others = items
    .filter((it) => !it.isCurrent)
    .sort(
      (a, b) =>
        dayjs(b.startedAt ?? 0).valueOf() - dayjs(a.startedAt ?? 0).valueOf(),
    );

  return (
    <DashboardCard title={t('currentlyTitle')}>
      <Box
        display="grid"
        gap={{ xs: 2, md: 3 }}
        sx={{ gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 5fr) minmax(0, 7fr)' } }}
      >
        {current ? (
          <NowPlayingHero item={current} />
        ) : (
          <Typography variant="body2" color="text.secondary">
            {t('queue.nothingPlaying')}
          </Typography>
        )}
        <Box minWidth={0}>
          <Typography
            variant="body2"
            fontWeight={600}
            color="text.secondary"
            sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}
          >
            {t('queue.recentlyPlayed')}
          </Typography>
          {others.length === 0 ? (
            <Typography variant="body2" color="text.secondary" mt={1}>
              {t('queue.noHistory')}
            </Typography>
          ) : (
            <Box>
              {others.map((it, index) => (
                <React.Fragment key={`${it.id}-${it.startedAt ?? 'na'}`}>
                  {index > 0 && <Divider />}
                  <QueueRow item={it} />
                </React.Fragment>
              ))}
            </Box>
          )}
        </Box>
      </Box>
    </DashboardCard>
  );
};
