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

export type NowPlayingInfo = {
  isLive: boolean;
  currentTrack: string;
  refreshMetadata: () => void;
};

type Props = {
  /** 'hero' = big button + now-playing (public listener page). 'compact' = inline bar (admin app bar). */
  variant: 'hero' | 'compact';
  streamUrl: string;
  /** Now-playing/live status polling; omit for a minimal compact player. */
  nowUrl?: string;
  statusUrl?: string;
  title?: string;
  autoPlay?: boolean;
  showVolumeControl?: boolean;
  /** Compact only: extra controls rendered after the player's own (e.g. admin skip). */
  renderActions?: (info: NowPlayingInfo) => React.ReactNode;
};

function getPlaybackIcon(isPlaying: boolean, isBuffering: boolean) {
  if (isBuffering) return <CircularProgress size={24} />;
  if (isPlaying) return <PauseRoundedIcon sx={{ fontSize: 24 }} />;
  return <PlayArrowRoundedIcon sx={{ fontSize: 24 }} />;
}

function getVolumeIcon(volume: number, muted: boolean) {
  const effectiveVolume = muted ? 0 : volume;
  let icon: React.ElementType;
  if (effectiveVolume === 0) {
    icon = VolumeOffRoundedIcon;
  } else if (effectiveVolume < 0.5) {
    icon = VolumeDownRoundedIcon;
  } else {
    icon = VolumeUpRoundedIcon;
  }
  return {
    icon,
    effectiveVolume,
    volumePercent: Math.round(effectiveVolume * 100),
  };
}

export const RadioStreamPlayer: React.FC<Props> = ({
  variant,
  streamUrl,
  nowUrl,
  statusUrl,
  title = 'Radio Stream',
  autoPlay = false,
  showVolumeControl = false,
  renderActions,
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
    refreshMetadata,
  } = useRadioStream({ streamUrl, nowUrl, statusUrl, autoPlay });
  const {
    icon: VolumeIcon,
    effectiveVolume,
    volumePercent,
  } = getVolumeIcon(volume, muted);
  const step = 0.1;
  if (variant === 'compact') {
    const showSourceBadge = Boolean(statusUrl);
    const subtitle = isLive
      ? 'Live'
      : currentTrack || toStatus(status, errorMessage);
    return (
      <Paper
        variant="outlined"
        sx={{ px: 0.5, py: 0.25, borderRadius: 999, minWidth: 0 }}
      >
        <Stack direction="row" alignItems="center" spacing={0.5} minWidth={0}>
          <IconButton
            size="small"
            color={isPlaying ? 'primary' : 'default'}
            onClick={togglePlayback}
            aria-label={isPlaying ? 'Pause radio' : 'Play radio'}
          >
            {getPlaybackIcon(isPlaying, isBuffering)}
          </IconButton>

          <Box
            minWidth={0}
            sx={{ display: { xs: 'none', sm: 'block' }, maxWidth: 220 }}
          >
            <Stack direction="row" alignItems="center" spacing={0.75}>
              <Typography variant="body2" noWrap fontWeight={600}>
                {title}
              </Typography>
              {showSourceBadge && (
                <Box
                  component="span"
                  sx={{
                    width: 8,
                    height: 8,
                    flexShrink: 0,
                    borderRadius: '50%',
                    backgroundColor: isLive ? '#e63946' : '#8191a4',
                    animation: isLive
                      ? `${pulse} 1.4s ease-in-out infinite`
                      : 'none',
                  }}
                  title={isLive ? 'Live' : 'AutoDJ'}
                />
              )}
            </Stack>
            <Typography
              variant="caption"
              color="text.secondary"
              noWrap
              component="div"
              title={subtitle}
            >
              {subtitle}
            </Typography>
          </Box>

          <Tooltip title={muted ? 'Unmute' : 'Mute'}>
            <IconButton size="small" onClick={toggleMute} aria-label="Toggle mute">
              {muted ? (
                <VolumeOffRoundedIcon fontSize="small" />
              ) : (
                <VolumeUpRoundedIcon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>

          {showVolumeControl && (
            <Slider
              size="small"
              value={muted ? 0 : Math.round(volume * 100)}
              min={0}
              max={100}
              step={1}
              sx={{ width: 80 }}
              onChange={(_, v) => {
                const n = Array.isArray(v) ? v[0] : v;
                setVolume(n / 100);
              }}
              aria-label="Volume"
            />
          )}

          <Tooltip title="Reconnect">
            <IconButton
              size="small"
              onClick={reconnect}
              aria-label="Reconnect stream"
            >
              <RefreshRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          {renderActions?.({
            isLive,
            currentTrack,
            refreshMetadata,
          })}
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
            {getPlaybackIcon(isPlaying, isBuffering)}
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
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <Typography
            variant="body1"
            sx={{ color: '#5f7598', fontWeight: 400 }}
            textAlign="center"
          >
            {nextTrack}
          </Typography>
          <Typography
            variant="caption"
            color="rgba(95, 117, 152, 0.6)"
            sx={{ ml: 0.5 }}
          >
            (next)
          </Typography>
        </Box>
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
