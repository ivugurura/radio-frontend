import React from 'react';
import {
  Box,
  Button,
  Container,
  IconButton,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import {
  PlayArrowRounded as PlayArrowRoundedIcon,
  PauseRounded as PauseRoundedIcon,
  StopRounded as StopRoundedIcon,
  MicOffRounded as MicOffRoundedIcon,
} from '@mui/icons-material';

const STREAM_URL =
  'https://radio.reformationvoice.org/studios/reformation-rw/listen';
const NOW_URL = 'https://radio.reformationvoice.org/studios/reformation-rw/now';

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

const HomePage: React.FC = () => {
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [nowData, setNowData] = React.useState<NowResponse['data'] | null>(
    null,
  );
  const [nowError, setNowError] = React.useState('');

  const stationTitle = 'Reformation Radio Voice';
  const currentTitle = cleanTrackName(nowData?.current) || 'No Track Selected';
  const nextTitle = cleanTrackName(nowData?.next) || 'No next track available';

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
    const audio = new Audio(STREAM_URL);
    audio.preload = 'none';
    audio.crossOrigin = 'anonymous';

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleError = () => setIsPlaying(false);

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('error', handleError);

    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.src = '';
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('error', handleError);
      audioRef.current = null;
    };
  }, []);

  const handleStart = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      await audio.play();
    } catch {
      setIsPlaying(false);
    }
  };

  const handleStop = () => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    audio.currentTime = 0;
    setIsPlaying(false);
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
              onClick={handleStart}
              aria-label="Start radio"
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
              R R V
            </IconButton>
            <Typography variant="h5" fontWeight={500} textAlign="center">
              {stationTitle}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {isPlaying ? 'Streaming live...' : 'Stream is stopped'}
            </Typography>
            <Typography
              variant="h6"
              sx={{ color: '#6c82a3', fontWeight: 400 }}
              textAlign="center"
            >
              {currentTitle}
            </Typography>
            <Typography
              variant="body1"
              sx={{ color: '#5f7598', fontWeight: 400 }}
              textAlign="center"
            >
              Next: {nextTitle}
            </Typography>
            {nowError && (
              <Typography variant="caption" color="error.main">
                {nowError}
              </Typography>
            )}
          </Stack>

          <Stack direction="row" spacing={2}>
            <IconButton
              onClick={handleStart}
              aria-label="Start"
              sx={{
                width: 92,
                height: 92,
                background: '#8ec5ef',
                color: '#fff',
                '&:hover': { background: '#81bee9' },
              }}
            >
              <PlayArrowRoundedIcon sx={{ fontSize: 48 }} />
            </IconButton>
            <IconButton
              disabled
              aria-label="Pause (coming soon)"
              sx={{
                width: 92,
                height: 92,
                background: '#d8e2ec',
                color: '#8897a8',
              }}
            >
              <PauseRoundedIcon sx={{ fontSize: 40 }} />
            </IconButton>
            <IconButton
              onClick={handleStop}
              aria-label="Stop"
              sx={{
                width: 92,
                height: 92,
                background: '#f2a5af',
                color: '#fff',
                '&:hover': { background: '#ea95a0' },
              }}
            >
              <StopRoundedIcon sx={{ fontSize: 40 }} />
            </IconButton>
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

          <Paper
            elevation={0}
            sx={{
              width: '100%',
              p: 2.5,
              borderRadius: 3,
              background: '#eaf1fa',
            }}
          >
            <Typography variant="h6" mb={1}>
              Live Metadata
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Current track and next track update every 5 seconds.
            </Typography>
          </Paper>
        </Stack>
      </Container>
    </Box>
  );
};

export default HomePage;
