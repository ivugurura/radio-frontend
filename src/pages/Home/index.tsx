import React from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Container,
  IconButton,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import {
  PlayArrowRounded as PlayArrowRoundedIcon,
  StopRounded as StopRoundedIcon,
  MicOffRounded as MicOffRoundedIcon,
} from '@mui/icons-material';
import { STUDIO_ID, STUDIO_URL } from '@libs/constants';

const STREAM_URL = `${STUDIO_URL}/${STUDIO_ID}/listen`;
const NOW_URL = `${STUDIO_URL}/${STUDIO_ID}/now`;

type NowResponse = {
  message?: string;
  success?: boolean;
  data?: {
    studio_id?: string;
    current?: string;
    next?: string;
    started_at?: string;
    elapsed_sec?: number;
  };
};

const cleanTrackName = (value?: string) => {
  if (!value) return '';
  return value.replace(/\.[a-zA-Z0-9]+$/, '');
};

const formatElapsed = (seconds?: number) => {
  const safeSeconds = Math.max(0, Math.floor(seconds ?? 0));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const secs = safeSeconds % 60;

  if (hours > 0) {
    return [hours, minutes, secs]
      .map((value) => String(value).padStart(2, '0'))
      .join(':');
  }

  return [minutes, secs]
    .map((value) => String(value).padStart(2, '0'))
    .join(':');
};

const HomePage: React.FC = () => {
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const nowDataRef = React.useRef<NowResponse['data'] | null>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [isBuffering, setIsBuffering] = React.useState(false);
  const [nowData, setNowData] = React.useState<NowResponse['data'] | null>(
    null,
  );
  const [nowError, setNowError] = React.useState('');
  const [elapsedSec, setElapsedSec] = React.useState(0);

  const stationTitle = 'Reformation Voice Radio';
  const currentTitle = cleanTrackName(nowData?.current);
  const nextTitle = cleanTrackName(nowData?.next);

  React.useEffect(() => {
    nowDataRef.current = nowData;
  }, [nowData]);

  React.useEffect(() => {
    let isMounted = true;

    const fetchNow = async () => {
      try {
        const response = await fetch(NOW_URL, {
          method: 'GET',
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error('Failed to fetch metadata');
        }

        const payload = (await response.json()) as NowResponse;
        if (!isMounted) return;

        setNowData(payload?.data ?? null);
        nowDataRef.current = payload?.data ?? null;
        setNowError('');
      } catch {
        if (!isMounted) return;
        setNowError('Unable to load current/next metadata');
      }
    };

    fetchNow();
    const timer = window.setInterval(fetchNow, 5000);

    return () => {
      isMounted = false;
      window.clearInterval(timer);
    };
  }, []);

  React.useEffect(() => {
    if (!nowData?.current) {
      setElapsedSec(0);
      return;
    }

    if (!isPlaying || isBuffering) {
      return;
    }

    const timer = window.setInterval(() => {
      setElapsedSec((prev) => prev + 1);
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [isPlaying, isBuffering, nowData?.current]);

  React.useEffect(() => {
    const audio = new Audio(STREAM_URL);
    audio.preload = 'none';
    audio.crossOrigin = 'anonymous';

    const handlePlaying = () => {
      // setElapsedSec(nowDataRef.current?.elapsed_sec ?? 0);
      setIsBuffering(false);
      setIsPlaying(true);
    };
    const handlePause = () => {
      setIsBuffering(false);
      setIsPlaying(false);
    };
    const handleError = () => {
      setIsBuffering(false);
      setIsPlaying(false);
    };
    const handleWaiting = () => {
      setIsBuffering(true);
      setIsPlaying(false);
    };
    const handleStalled = () => {
      setIsBuffering(true);
      setIsPlaying(false);
    };

    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('error', handleError);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('stalled', handleStalled);

    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.src = '';
      audio.removeEventListener('playing', handlePlaying);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('stalled', handleStalled);
      audioRef.current = null;
    };
  }, []);

  const handleStart = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      setIsBuffering(true);
      await audio.play();
    } catch {
      setIsBuffering(false);
      setIsPlaying(false);
    }
  };

  const handleStop = () => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    audio.currentTime = 0;
    setIsBuffering(false);
    setIsPlaying(false);
  };

  const handleHeroToggle = () => {
    if (isPlaying) {
      handleStop();
      return;
    }
    void handleStart();
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background:
          'radial-gradient(120% 120% at 50% 0%, #f7fbff 0%, #eef4fb 50%, #eaf2fb 100%)',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Stack spacing={4} alignItems="center">
          <Stack spacing={1.5} alignItems="center">
            <IconButton
              onClick={handleHeroToggle}
              aria-label={isPlaying ? 'Stop radio' : 'Start radio'}
              sx={{
                width: 144,
                height: 144,
                background: 'linear-gradient(180deg, #66b6ef 0%, #53a9e7 100%)',
                color: '#fff',
                boxShadow: '0 10px 24px rgba(66, 142, 207, 0.35)',
                '&:hover': {
                  background:
                    'linear-gradient(180deg, #6cbcf4 0%, #5aaeea 100%)',
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
            <Typography variant="h5" fontWeight={500} textAlign="center">
              {stationTitle}
            </Typography>
            {isBuffering ? (
              <Stack direction="row" spacing={1} alignItems="center">
                <CircularProgress size={14} thickness={5} />
                <Typography variant="caption" color="text.secondary">
                  Buffering live stream...
                </Typography>
              </Stack>
            ) : null}
            {nowData?.current && (
              <Typography
                variant="h6"
                sx={{ color: '#6c82a3', fontWeight: 400 }}
                textAlign="center"
              >
                {currentTitle}
              </Typography>
            )}
            {nowData?.next && (
              <Typography
                variant="body1"
                sx={{ color: '#5f7598', fontWeight: 400 }}
                textAlign="center"
              >
                Next: {nextTitle}
              </Typography>
            )}
            {nowError && (
              <Typography variant="caption" color="error.main">
                {nowError}
              </Typography>
            )}
          </Stack>

          <Paper
            elevation={0}
            sx={{
              width: '100%',
              p: 2,
              borderRadius: 3,
              border: '1px solid #d9e2ee',
              background: '#fff',
            }}
          >
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
            >
              <Stack direction="row" spacing={1.5} alignItems="center">
                <MicOffRoundedIcon sx={{ color: '#8191a4' }} />
                <Box>
                  <Typography variant="h6" sx={{ lineHeight: 1.2 }}>
                    Voice Control
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Disabled
                  </Typography>
                </Box>
              </Stack>
              <Button
                variant="contained"
                disabled
                sx={{
                  minWidth: 92,
                  backgroundColor: '#becbda',
                  color: '#2e3f57',
                }}
              >
                Enable
              </Button>
            </Stack>
          </Paper>
        </Stack>
      </Container>
    </Box>
  );
};

export default HomePage;
