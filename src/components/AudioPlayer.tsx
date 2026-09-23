import React from 'react';
import {
  Box,
  CircularProgress,
  IconButton,
  Paper,
  Slider,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  PlayArrowRounded as PlayArrowRoundedIcon,
  PauseRounded as PauseRoundedIcon,
  SkipNextRounded as SkipNextRoundedIcon,
  SkipPreviousRounded as SkipPreviousRoundedIcon,
  VolumeUpRounded as VolumeUpRoundedIcon,
  VolumeDownRounded as VolumeDownRoundedIcon,
  VolumeOffRounded as VolumeOffRoundedIcon,
  CloseRounded as CloseRoundedIcon,
  MusicNoteRounded as MusicNoteRoundedIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import type { TrackType } from '@graphql/graphql';
import { useStudioId } from '@components/providers';
import { getTrackUrl } from '@libs/constants';
import { formatTime, isPlayable } from '@libs/tracks';

type AudioPlayerProps = Readonly<{
  track: TrackType;
  /** Controlled play state; the player reports changes through onPlayingChange. */
  playing: boolean;
  onPlayingChange: (playing: boolean) => void;
  onEnded?: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  hasNext?: boolean;
  hasPrevious?: boolean;
  onClose?: () => void;
}>;

const VOLUME_KEY = 'radio.player.volume';

const getVolumeIcon = (volume: number) => {
  if (volume === 0) return VolumeOffRoundedIcon;
  if (volume < 0.5) return VolumeDownRoundedIcon;
  return VolumeUpRoundedIcon;
};

const readStoredVolume = () => {
  try {
    const v = Number(window.localStorage.getItem(VOLUME_KEY));
    return Number.isFinite(v) && v > 0 && v <= 1 ? v : 0.9;
  } catch {
    return 0.9;
  }
};

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  track,
  playing,
  onPlayingChange,
  onEnded,
  onNext,
  onPrevious,
  hasNext = false,
  hasPrevious = false,
  onClose,
}) => {
  const { t } = useTranslation('audio');
  const studioId = useStudioId();
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [current, setCurrent] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const [seekValue, setSeekValue] = React.useState<number | null>(null);
  const [buffering, setBuffering] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const [volume, setVolume] = React.useState(readStoredVolume);
  const [muted, setMuted] = React.useState(false);

  const src = isPlayable(track) ? getTrackUrl(studioId, track.id) : '';
  const fallbackDuration = Number(track.durationSeconds) || 0;

  // Reset the timeline whenever a different track is loaded.
  const [loadedSrc, setLoadedSrc] = React.useState(src);
  if (loadedSrc !== src) {
    setLoadedSrc(src);
    setCurrent(0);
    setDuration(fallbackDuration);
    setSeekValue(null);
    setFailed(false);
  }

  // Keep the <audio> element in sync with the controlled `playing` prop.
  React.useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !src) return;
    if (playing && audio.paused) {
      audio.play().catch(() => onPlayingChange(false));
    } else if (!playing && !audio.paused) {
      audio.pause();
    }
  }, [playing, src, onPlayingChange]);

  React.useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
    audio.muted = muted;
    try {
      window.localStorage.setItem(VOLUME_KEY, String(volume));
    } catch {
      // storage unavailable; volume just won't persist
    }
  }, [volume, muted]);

  const shownTime = seekValue ?? current;
  const total = duration || fallbackDuration;
  const effectiveVolume = muted ? 0 : volume;
  const VolumeIcon = getVolumeIcon(effectiveVolume);

  return (
    <Paper
      elevation={8}
      sx={(theme) => ({
        position: 'sticky',
        bottom: 16,
        zIndex: theme.zIndex.appBar - 1,
        mt: 2,
        px: { xs: 1.5, sm: 2.5 },
        py: 1.5,
        borderRadius: 3,
        border: `1px solid ${theme.palette.divider}`,
        background: `linear-gradient(90deg, ${alpha(theme.palette.primary.main, 0.06)}, ${theme.palette.background.paper} 45%)`,
      })}
    >
      <audio
        ref={audioRef}
        src={src || undefined}
        preload="auto"
        onPlay={() => onPlayingChange(true)}
        onPause={() => onPlayingChange(false)}
        onEnded={onEnded}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration;
          if (Number.isFinite(d) && d > 0) setDuration(d);
        }}
        onWaiting={() => setBuffering(true)}
        onPlaying={() => setBuffering(false)}
        onCanPlay={() => setBuffering(false)}
        onError={() => {
          setBuffering(false);
          setFailed(true);
          onPlayingChange(false);
        }}
      >
        <track kind="captions" />
      </audio>

      <Box
        sx={{
          display: 'grid',
          alignItems: 'center',
          columnGap: { xs: 1.5, md: 3 },
          rowGap: 0.5,
          gridTemplateColumns: {
            xs: 'minmax(0, 1fr) auto',
            md: 'minmax(0, 1fr) minmax(0, 1.6fr) minmax(0, 1fr)',
          },
          gridTemplateAreas: {
            xs: '"info controls" "seek seek"',
            md: '"info controls volume" "info seek volume"',
          },
        }}
      >
        {/* Track info */}
        <Stack
          direction="row"
          spacing={1.5}
          alignItems="center"
          sx={{ gridArea: 'info', minWidth: 0 }}
        >
          <Box
            sx={(theme) => ({
              width: 48,
              height: 48,
              flexShrink: 0,
              borderRadius: 2,
              display: 'grid',
              placeItems: 'center',
              color: theme.palette.primary.contrastText,
              background: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.secondary.light})`,
              boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.35)}`,
            })}
          >
            <MusicNoteRoundedIcon />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="overline"
              color="primary"
              sx={{ lineHeight: 1.4, display: 'block' }}
            >
              {t('nowPlaying')}
            </Typography>
            <Typography
              variant="body2"
              fontWeight={600}
              noWrap
              title={track.title}
            >
              {track.title || '—'}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              noWrap
              component="div"
            >
              {failed ? (
                <Box component="span" sx={{ color: 'error.main' }}>
                  {t('playbackError')}
                </Box>
              ) : (
                track.artist || t('unknownArtist')
              )}
            </Typography>
          </Box>
        </Stack>

        {/* Transport controls */}
        <Stack
          direction="row"
          spacing={0.5}
          alignItems="center"
          justifyContent="center"
          sx={{ gridArea: 'controls' }}
        >
          <Tooltip title={t('previous')}>
            <span>
              <IconButton
                onClick={onPrevious}
                disabled={!hasPrevious}
                size="small"
              >
                <SkipPreviousRoundedIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Box sx={{ position: 'relative' }}>
            <IconButton
              onClick={() => onPlayingChange(!playing)}
              disabled={!src || failed}
              aria-label={playing ? t('pause') : t('play')}
              sx={(theme) => ({
                width: 44,
                height: 44,
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.4)}`,
                '&:hover': { bgcolor: 'primary.dark' },
                '&.Mui-disabled': {
                  bgcolor: 'action.disabledBackground',
                  boxShadow: 'none',
                },
              })}
            >
              {playing ? <PauseRoundedIcon /> : <PlayArrowRoundedIcon />}
            </IconButton>
            {buffering && playing && (
              <CircularProgress
                size={52}
                thickness={2}
                sx={{
                  position: 'absolute',
                  top: -4,
                  left: -4,
                  pointerEvents: 'none',
                }}
              />
            )}
          </Box>
          <Tooltip title={t('next')}>
            <span>
              <IconButton onClick={onNext} disabled={!hasNext} size="small">
                <SkipNextRoundedIcon />
              </IconButton>
            </span>
          </Tooltip>
          {onClose && (
            <IconButton
              size="small"
              onClick={onClose}
              aria-label={t('closePlayer')}
              sx={{ display: { xs: 'inline-flex', md: 'none' } }}
            >
              <CloseRoundedIcon fontSize="small" />
            </IconButton>
          )}
        </Stack>

        {/* Seek bar */}
        <Stack
          direction="row"
          spacing={1.5}
          alignItems="center"
          sx={{ gridArea: 'seek', minWidth: 0 }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              minWidth: 40,
              textAlign: 'right',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {formatTime(shownTime)}
          </Typography>
          <Slider
            size="small"
            aria-label={t('seek')}
            value={Math.min(shownTime, total || 0)}
            min={0}
            max={total || 1}
            step={0.1}
            disabled={!src || failed || !total}
            onChange={(_, v) => setSeekValue(v as number)}
            onChangeCommitted={(_, v) => {
              if (audioRef.current) audioRef.current.currentTime = v as number;
              setCurrent(v as number);
              setSeekValue(null);
            }}
            sx={{
              py: 1,
              '& .MuiSlider-thumb': {
                width: 12,
                height: 12,
                transition: 'opacity 120ms',
                opacity: 0,
              },
              '&:hover .MuiSlider-thumb, & .MuiSlider-thumb.Mui-active, & .MuiSlider-thumb.Mui-focusVisible':
                { opacity: 1 },
            }}
          />
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ minWidth: 40, fontVariantNumeric: 'tabular-nums' }}
          >
            {formatTime(total)}
          </Typography>
        </Stack>

        {/* Volume + close */}
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          justifyContent="flex-end"
          sx={{ gridArea: 'volume', display: { xs: 'none', md: 'flex' } }}
        >
          <Tooltip title={muted ? t('unmute') : t('mute')}>
            <IconButton size="small" onClick={() => setMuted((m) => !m)}>
              <VolumeIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Slider
            size="small"
            aria-label={t('volume')}
            value={Math.round(effectiveVolume * 100)}
            min={0}
            max={100}
            onChange={(_, v) => {
              setMuted(false);
              setVolume(Math.max(0, Math.min(1, (v as number) / 100)));
            }}
            sx={{ width: 110 }}
          />
          {onClose && (
            <Tooltip title={t('closePlayer')}>
              <IconButton size="small" onClick={onClose}>
                <CloseRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      </Box>
    </Paper>
  );
};
