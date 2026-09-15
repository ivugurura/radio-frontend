import React from 'react';
import { Box, Button, Container, Paper, Stack, Typography } from '@mui/material';
import { MicOffRounded as MicOffRoundedIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { STUDIO_URL } from '@libs/constants';
import { useStudioId } from '@components/providers';
import LanguageSelector from '@components/LanguageSelector';
import ListenerChat from '@components/ListenerChat';
import RadioStreamPlayer from '@components/RadioStreamPlayer';

const HomePage: React.FC = () => {
  const { t } = useTranslation('home');
  const studioId = useStudioId();

  const streamUrl = `${STUDIO_URL}/${studioId}/listen`;
  const nowUrl = `${STUDIO_URL}/${studioId}/now`;
  const statusUrl = `${STUDIO_URL}/${studioId}/status`;

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
          <Box sx={{ alignSelf: 'flex-end' }}>
            <LanguageSelector />
          </Box>

          <RadioStreamPlayer
            variant="hero"
            streamUrl={streamUrl}
            nowUrl={nowUrl}
            statusUrl={statusUrl}
            title={t('stationTitle')}
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
                    {t('voiceControl')}
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    {t('voiceControlStatus.disabled')}
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
                {t('enable')}
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
