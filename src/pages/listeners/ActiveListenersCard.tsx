import React from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Paper, Typography } from '@mui/material';
import HeadphonesRoundedIcon from '@mui/icons-material/HeadphonesRounded';

type Props = {
  count: number;
};

export const ActiveListenersCard: React.FC<Props> = ({ count }) => {
  const { t } = useTranslation('listeners');

  return (
    <Paper
      elevation={0}
      sx={{
        position: 'relative',
        overflow: 'hidden',
        px: 4,
        py: 3,
        color: '#fff',
        borderRadius: 1,
        background: 'linear-gradient(90deg, #4da3f0 0%, #7fd6d6 100%)',
      }}
    >
      <Typography variant="h3" fontWeight={500} lineHeight={1.1}>
        {count}
      </Typography>
      <Typography variant="subtitle1">
        {t('connectedListener', { count })}
      </Typography>
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          right: -24,
          top: '50%',
          transform: 'translateY(-50%)',
          opacity: 0.25,
          lineHeight: 0,
        }}
      >
        <HeadphonesRoundedIcon sx={{ fontSize: 140 }} />
      </Box>
    </Paper>
  );
};
