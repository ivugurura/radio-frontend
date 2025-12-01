import React from 'react';
import {
  Box,
  IconButton,
  Slider,
  Stack,
  Tooltip,
  Typography,
  Paper,
} from '@mui/material';
import {
  PlayArrowRounded as PlayArrowRoundedIcon,
  PauseRounded as PauseRoundedIcon,
  VolumeUpRounded as VolumeUpRoundedIcon,
  VolumeOffRounded as VolumeOffRoundedIcon,
  RefreshRounded as RefreshRoundedIcon,
} from '@mui/icons-material';

type StateType =
  | 'idle'
  | 'ready'
  | 'playing'
  | 'paused'
  | 'buffering'
  | 'error';

type Props = {
  src: string; // Stream URL (MP3/ICY or HLS via a different player)
  title?: string; // Display name like "Studio RW"
  autoPlay?: boolean;
  showVolumeControl?: boolean;
  onStatusChange?: (status: StateType) => void;
};

export const RadioPlayer: React.FC<Props> = ({
  src,
  title = 'Radio Stream',
  autoPlay = false,
  showVolumeControl = false,
  onStatusChange,
}) => {
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = React.useState(false);
  const [volume, setVolume] = React.useState(0.85);
  const [muted, setMuted] = React.useState(false);
  const [statusText, setStatusText] = React.useState<string>('Idle');
  const [lastError, setLastError] = React.useState<string>('');

  React.useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;
    audio.src = src;
    audio.preload = 'none'; // live stream; don't preload
    audio.crossOrigin = 'anonymous';
    audio.volume = volume;
    audio.muted = muted;

    const setStatus = (s: StateType, msg?: string) => {
      switch (s) {
        case 'idle':
          setStatusText('Idle');
          break;
        case 'ready':
          setStatusText('Ready');
          break;
        case 'playing':
          setStatusText('Playing');
          break;
        case 'paused':
          setStatusText('Paused');
          break;
        case 'buffering':
          setStatusText('Buffering...');
          break;
        case 'error':
          setStatusText(msg ? `Error — ${msg}` : 'Error');
          break;
      }
      onStatusChange?.(s);
    };

    const onPlay = () => {
      setPlaying(true);
      setStatus('playing');
    };

    const onPlaying = () => {
      // definitive signal that playback is ongoing (audio has enough data)
      setPlaying(true);
      setStatus('playing');
    };

    const onCanPlay = () => {
      // decoder has enough data to start playing
      if (!playing) setStatus('ready');
    };

    const onPause = () => {
      setPlaying(false);
      setStatus('paused');
    };

    const onError = () => {
      setPlaying(false);
      const errMsg = 'Failed to play stream';
      setLastError(errMsg);
      setStatus('error', errMsg);
    };

    const onWaiting = () => {
      // only show buffering if we were playing and now waiting for more data
      if (!audio.paused) setStatus('buffering');
    };

    const onStalled = () => {
      if (!audio.paused) setStatus('buffering');
    };

    const onTimeUpdate = () => {
      // if audio position advances and not paused, we are effectively playing
      if (!audio.paused) {
        setStatus('playing');
      }
    };

    audio.addEventListener('play', onPlay);
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('error', onError);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('stalled', onStalled);
    audio.addEventListener('timeupdate', onTimeUpdate);

    if (autoPlay) {
      audio.play().catch(() => {
        // some browsers block autoplay; user can press Play
      });
    } else {
      setStatus('idle');
    }

    return () => {
      audio.pause();
      audio.src = '';
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('canplay', onCanPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('error', onError);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('stalled', onStalled);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audioRef.current = null;
    };
  }, [src, autoPlay, onStatusChange]); // recreate audio when src changes

  React.useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  React.useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = muted;
    }
  }, [muted]);

  const handlePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    setLastError('');
    if (playing) {
      audio.pause();
      return;
    }
    try {
      await audio.play();
    } catch (err: any) {
      setLastError(err?.message || 'Playback error');
      setStatusText('Error');
      onStatusChange?.('error');
    }
  };

  const handleReconnect = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    setLastError('');
    setStatusText('Reconnecting...');
    audio.pause();
    // bust internal buffering by resetting src
    const currentSrc = audio.src;
    audio.src = '';
    audio.src = currentSrc;
    try {
      await audio.play();
    } catch (err: any) {
      setLastError(err?.message || 'Reconnect failed');
      setStatusText('Error');
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 1.5 }}>
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <IconButton
          color={playing ? 'primary' : 'default'}
          onClick={handlePlayPause}
          aria-label={playing ? 'Pause radio' : 'Play radio'}
        >
          {playing ? <PauseRoundedIcon /> : <PlayArrowRoundedIcon />}
        </IconButton>

        <Box flex={1} minWidth={0}>
          <Typography variant="body2" noWrap title={title}>
            {title}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {statusText}
            {lastError ? ` — ${lastError}` : ''}
          </Typography>
        </Box>

        <Tooltip title={muted ? 'Unmute' : 'Mute'}>
          <IconButton
            onClick={() => setMuted((m) => !m)}
            aria-label="Toggle mute"
          >
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
              setMuted(false);
              setVolume(Math.max(0, Math.min(1, Number(n) / 100)));
            }}
            aria-label="Volume"
          />
        )}

        <Tooltip title="Reconnect">
          <IconButton onClick={handleReconnect} aria-label="Reconnect stream">
            <RefreshRoundedIcon />
          </IconButton>
        </Tooltip>
      </Stack>
    </Paper>
  );
};
