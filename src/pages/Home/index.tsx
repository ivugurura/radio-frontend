import React from 'react';
import { Box, Container, Stack } from '@mui/material';
import { useTranslation } from 'react-i18next';
import LanguageSelector from '@components/LanguageSelector';
import ListenerChat from '@components/ListenerChat';
import RadioStreamPlayer from '@components/RadioStreamPlayer';

const HomePage: React.FC = () => {
  const { t } = useTranslation('home');

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
