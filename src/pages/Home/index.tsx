import React from 'react';
import {
  Box,
  Button,
  Container,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
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
            showVolumeControl
          />
        </Stack>
      </Container>
      <ListenerChat />
    </Box>
  );
};

export default HomePage;
