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
import { keyframes } from '@emotion/react';
import {
  PlayArrowRounded as PlayArrowRoundedIcon,
  PauseRounded as PauseRoundedIcon,
  StopRounded as StopRoundedIcon,
  VolumeUpRounded as VolumeUpRoundedIcon,
  VolumeDownRounded as VolumeDownRoundedIcon,
  VolumeOffRounded as VolumeOffRoundedIcon,
  RefreshRounded as RefreshRoundedIcon,
  AddRounded as AddRoundedIcon,
  RemoveRounded as RemoveRoundedIcon,
} from '@mui/icons-material';
import { useRadioStream } from '../hooks/useRadioStream';

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
`;

const formatElapsed = (seconds: number) => {
  const safe = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  const parts = hours > 0 ? [hours, minutes, secs] : [minutes, secs];
  return parts.map((value) => String(value).padStart(2, '0')).join(':');
};

const toStatus = (status: string | null, errMsg?: string) => {
  const statusMap: Record<string, string> = {
    playing: 'Playing',
    buffering: 'Buffering...',
    paused: 'Paused',
    error: 'Error',
  };
  if (status === 'error' && errMsg) return `Error — ${errMsg}`;
  return status ? statusMap[status] || status : 'Idle';
};

type Props = {
  /** 'hero' = big button + now-playing (public listener page). 'compact' = toolbar (admin sidebar). */
  variant: 'hero' | 'compact';
  streamUrl: string;
  /** Now-playing/live status polling — hero only; omit for a minimal compact player. */
  nowUrl?: string;
  statusUrl?: string;
  title?: string;
  autoPlay?: boolean;
  showVolumeControl?: boolean;
};

export const RadioStreamPlayer: React.FC<Props> = ({
  variant,
  streamUrl,
  nowUrl,
  statusUrl,
  title = 'Radio Stream',
  autoPlay = false,
  showVolumeControl = false,
}) => {
  const {
    status,
    isPlaying,
    isBuffering,
    errorMessage,
    volume,
    muted,
    isLive,
    currentTrack,
    nextTrack,
    elapsedSec,
    metadataError,
    togglePlayback,
    reconnect,
    setVolume,
    toggleMute,
  } = useRadioStream({ streamUrl, nowUrl, statusUrl, autoPlay });

  const effectiveVolume = muted ? 0 : volume;
  const VolumeIcon =
    effectiveVolume === 0
      ? VolumeOffRoundedIcon
      : effectiveVolume < 0.5
        ? VolumeDownRoundedIcon
        : VolumeUpRoundedIcon;
  const volumePercent = Math.round(effectiveVolume * 100);
  const step = 0.1;

  if (variant === 'compact') {
    return (
      <Paper variant="outlined" sx={{ p: 1.5 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <IconButton
            color={isPlaying ? 'primary' : 'default'}
            onClick={togglePlayback}
            aria-label={isPlaying ? 'Pause radio' : 'Play radio'}
          >
            {isPlaying ? <PauseRoundedIcon /> : <PlayArrowRoundedIcon />}
          </IconButton>

          <Box flex={1} minWidth={0}>
            <Typography variant="body2" noWrap title={title}>
              {title}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {toStatus(status, errorMessage)}
            </Typography>
          </Box>

          <Tooltip title={muted ? 'Unmute' : 'Mute'}>
            <IconButton onClick={toggleMute} aria-label="Toggle mute">
              {muted ? <VolumeOffRoundedIcon /> : <VolumeUpRoundedIcon />}
            </IconButton>
          </Tooltip>

          {showVolumeControl && (
            <Slider
              value={muted ? 0 : Math.round(volume * 100)}
              min={0}
              max={100}
              step={1}
              sx={{ width: 'auto' }}
              onChange={(_, v) => {
                const n = Array.isArray(v) ? v[0] : v;
                setVolume(n / 100);
              }}
              aria-label="Volume"
            />
          )}

          <Tooltip title="Reconnect">
            <IconButton onClick={reconnect} aria-label="Reconnect stream">
              <RefreshRoundedIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Paper>
    );
  }

  return (
    <Stack spacing={1.5} alignItems="center">
      <Typography variant="h5" fontWeight={500} textAlign="center">
        {title}
      </Typography>
      <IconButton
        onClick={togglePlayback}
        aria-label={isPlaying ? 'Stop radio' : 'Start radio'}
        sx={{
          width: 144,
          height: 144,
          background: 'linear-gradient(180deg, #66b6ef 0%, #53a9e7 100%)',
          color: '#fff',
          boxShadow: '0 10px 24px rgba(66, 142, 207, 0.35)',
          '&:hover': {
            background: 'linear-gradient(180deg, #6cbcf4 0%, #5aaeea 100%)',
          },
        }}
      >
        <Stack spacing={0.25} alignItems="center">
          <Typography
            variant="caption"
            sx={{
              color: 'rgba(255, 255, 255, 0.82)',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              fontSize: '0.62rem',
            }}
          >
            On Air
          </Typography>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 700,
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1,
              textShadow: '0 1px 8px rgba(13, 66, 112, 0.22)',
            }}
          >
            {formatElapsed(elapsedSec)}
          </Typography>
          <Box
            sx={{
              width: 42,
              height: 42,
              mt: 0.5,
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(6px)',
            }}
          >
            {isPlaying ? (
              <StopRoundedIcon sx={{ fontSize: 26 }} />
            ) : (
              <PlayArrowRoundedIcon sx={{ fontSize: 28, ml: 0.25 }} />
            )}
          </Box>
        </Stack>
      </IconButton>

      <Stack
        direction="row"
        spacing={0.75}
        alignItems="center"
        sx={{
          px: 1.25,
          py: 0.4,
          borderRadius: 999,
          backgroundColor: isLive
            ? 'rgba(230, 57, 70, 0.1)'
            : 'rgba(108, 130, 163, 0.12)',
        }}
      >
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: isLive ? '#e63946' : '#8191a4',
            animation: isLive ? `${pulse} 1.4s ease-in-out infinite` : 'none',
          }}
        />
        <Typography
          variant="caption"
          sx={{
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            fontSize: '0.68rem',
            color: isLive ? '#e63946' : '#6c82a3',
          }}
        >
          {isLive ? 'Live' : 'AutoDJ'}
        </Typography>
      </Stack>

      {showVolumeControl && (
        <Stack
          direction="row"
          spacing={0.5}
          alignItems="center"
          sx={{
            width: '100%',
            maxWidth: 260,
            px: 1.5,
            py: 0.75,
            borderRadius: 999,
            backgroundColor: 'rgba(108, 130, 163, 0.08)',
          }}
        >
          <Tooltip title={muted ? 'Unmute' : 'Mute'}>
            <IconButton
              size="small"
              onClick={toggleMute}
              aria-label={muted ? 'Unmute' : 'Mute'}
              sx={{ color: '#5f7598' }}
            >
              <VolumeIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Tooltip title="Decrease volume">
            <span>
              <IconButton
                size="small"
                onClick={() => setVolume(effectiveVolume - step)}
                disabled={effectiveVolume <= 0}
                aria-label="Decrease volume"
                sx={{ color: '#5f7598' }}
              >
                <RemoveRoundedIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>

          <Slider
            size="small"
            value={volumePercent}
            min={0}
            max={100}
            step={1}
            onChange={(_, v) => {
              const n = Array.isArray(v) ? v[0] : v;
              setVolume(n / 100);
            }}
            aria-label="Volume"
            sx={{ color: '#53a9e7' }}
          />

          <Tooltip title="Increase volume">
            <span>
              <IconButton
                size="small"
                onClick={() => setVolume(effectiveVolume + step)}
                disabled={effectiveVolume >= 1}
                aria-label="Increase volume"
                sx={{ color: '#5f7598' }}
              >
                <AddRoundedIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>

          <Typography
            variant="caption"
            sx={{ color: '#8191a4', width: 30, textAlign: 'right' }}
          >
            {volumePercent}%
          </Typography>
        </Stack>
      )}

      {isBuffering && (
        <Stack direction="row" spacing={1} alignItems="center">
          <CircularProgress size={14} thickness={5} />
          <Typography variant="caption" color="text.secondary">
            Buffering live stream...
          </Typography>
        </Stack>
      )}

      {currentTrack && (
        <Typography
          variant="h6"
          sx={{ color: '#6c82a3', fontWeight: 400 }}
          textAlign="center"
        >
          {currentTrack}
        </Typography>
      )}
      {nextTrack && (
        <Typography
          variant="body1"
          sx={{ color: '#5f7598', fontWeight: 400 }}
          textAlign="center"
        >
          {nextTrack}
        </Typography>
      )}
      {metadataError && (
        <Typography variant="caption" color="error.main">
          {metadataError}
        </Typography>
      )}
    </Stack>
  );
};

export default RadioStreamPlayer;
