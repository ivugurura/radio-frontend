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
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import PauseRoundedIcon from '@mui/icons-material/PauseRounded';
import VolumeUpRoundedIcon from '@mui/icons-material/VolumeUpRounded';
import VolumeOffRoundedIcon from '@mui/icons-material/VolumeOffRounded';
import type { TrackType } from '@graphql/graphql';
import { getTrackUrl } from '@libs/constants';

type AudioPlayerProps = {
  source?: TrackType | null;
  autoPlay?: boolean;
  onEnded?: () => void;
};

const formatTime = (sec: number) => {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  source,
  autoPlay = false,
  onEnded,
}) => {
  const studioId = 'reformation-rw';
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = React.useState(false);
  const [muted, setMuted] = React.useState(false);
  const [volume, setVolume] = React.useState(0.9);
  const [current, setCurrent] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const [seeking, setSeeking] = React.useState(false);

  // Initialize/replace audio on source change
  React.useEffect(() => {
    if (!source?.processedRelPath) return;
    const trackSrc = getTrackUrl(studioId, source.id);
    const audio = new Audio();
    audioRef.current = audio;
    audio.src = trackSrc;
    audio.preload = 'auto';
    audio.crossOrigin = 'anonymous';
    audio.volume = volume;
    audio.muted = muted;

    const onLoadedMetadata = () => {
      const d = isFinite(audio.duration)
        ? audio.duration
        : (source.durationSeconds ?? 0);
      setDuration(d || 0);
    };
    const onTimeUpdate = () => {
      if (!seeking) setCurrent(audio.currentTime || 0);
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEndedLocal = () => {
      setPlaying(false);
      onEnded?.();
    };

    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEndedLocal);

    if (autoPlay) {
      audio.play().catch(() => {
        // user gesture might be required; UI button handles manual play
      });
    }

    return () => {
      audio.pause();
      audio.src = '';
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEndedLocal);
      audioRef.current = null;
      setPlaying(false);
      setCurrent(0);
      setDuration(0);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source?.processedRelPath]);

  React.useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  React.useEffect(() => {
    if (audioRef.current) audioRef.current.muted = muted;
  }, [muted]);

  const handlePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      try {
        await audio.play();
      } catch {
        // ignore; user must click again if blocked
      }
    }
  };

  const handleSeek = (_: Event, value: number | number[]) => {
    if (!audioRef.current) return;
    const v = Array.isArray(value) ? value[0] : value;
    setCurrent(v);
  };
  const handleSeekStart = () => setSeeking(true);
  const handleSeekCommit = (
    _: React.SyntheticEvent | Event,
    value: number | number[]
  ) => {
    const audio = audioRef.current;
    if (!audio) return;
    const v = Array.isArray(value) ? value[0] : value;
    audio.currentTime = v;
    setCurrent(v);
    setSeeking(false);
  };

  return (
    <Paper variant="outlined" sx={{ p: 1.5 }}>
      <Stack spacing={1}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <IconButton
            color={playing ? 'primary' : 'default'}
            onClick={handlePlayPause}
            aria-label={playing ? 'Pause' : 'Play'}
            disabled={!source?.processedRelPath}
          >
            {playing ? <PauseRoundedIcon /> : <PlayArrowRoundedIcon />}
          </IconButton>

          <Box flex={1} minWidth={0}>
            <Typography
              variant="body2"
              noWrap
              title={source?.title || source?.processedRelPath || ''}
            >
              {source?.title ||
                source?.processedRelPath ||
                'Select a track to play'}
            </Typography>
            {source?.artist && (
              <Typography variant="caption" color="text.secondary" noWrap>
                {source.artist}
              </Typography>
            )}
          </Box>

          <Tooltip title={muted ? 'Unmute' : 'Mute'}>
            <IconButton
              onClick={() => setMuted((m) => !m)}
              aria-label="Toggle mute"
              disabled={!source?.processedRelPath}
            >
              {muted ? <VolumeOffRoundedIcon /> : <VolumeUpRoundedIcon />}
            </IconButton>
          </Tooltip>

          <Slider
            value={muted ? 0 : Math.round(volume * 100)}
            min={0}
            max={100}
            step={1}
            sx={{ width: 120 }}
            onChange={(_, v) => {
              const n = Array.isArray(v) ? v[0] : v;
              setMuted(false);
              setVolume(Math.max(0, Math.min(1, Number(n) / 100)));
            }}
            aria-label="Volume"
          />
        </Stack>

        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="caption" sx={{ width: 42, textAlign: 'right' }}>
            {formatTime(current)}
          </Typography>
          <Slider
            value={Math.min(current, duration || 0)}
            min={0}
            max={duration || 1}
            step={0.5}
            onChange={handleSeek}
            onChangeCommitted={handleSeekCommit}
            onMouseDown={handleSeekStart}
            aria-label="Seek"
            disabled={!source?.processedRelPath}
          />
          <Typography variant="caption" sx={{ width: 42 }}>
            {formatTime(duration)}
          </Typography>
        </Stack>
      </Stack>
    </Paper>
  );
};
