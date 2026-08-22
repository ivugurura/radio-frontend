import React from 'react';
import { Box, Button, Container, Paper, Stack, Typography } from '@mui/material';
import { MicOffRounded as MicOffRoundedIcon } from '@mui/icons-material';
import { STUDIO_ID, STUDIO_URL } from '@libs/constants';
import ListenerChat from '@components/ListenerChat';
import RadioStreamPlayer from '@components/RadioStreamPlayer';

const STREAM_URL = `${STUDIO_URL}/${STUDIO_ID}/listen`;
const NOW_URL = `${STUDIO_URL}/${STUDIO_ID}/now`;
const STATUS_URL = `${STUDIO_URL}/${STUDIO_ID}/status`;

const HomePage: React.FC = () => {
  const stationTitle = 'Reformation Voice Radio';

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
          <RadioStreamPlayer
            variant="hero"
            streamUrl={STREAM_URL}
            nowUrl={NOW_URL}
            statusUrl={STATUS_URL}
            title={stationTitle}
          />

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
      <ListenerChat />
    </Box>
  );
};

export default HomePage;
