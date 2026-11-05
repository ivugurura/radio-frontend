import React from 'react';
import { Box, Typography } from '@mui/material';
import { keyframes } from '@emotion/react';
import { useTranslation } from 'react-i18next';

const pulse = keyframes`
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.35; transform: scale(0.8); }
`;

export const LiveListenersBadge: React.FC<{ count: number }> = ({ count }) => {
  const { t } = useTranslation('listeners');
  const hasListeners = count > 0;
  const color = hasListeners ? 'success.main' : 'text.secondary';

  return (
    <Box
      sx={(theme) => ({
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        px: 1.5,
        py: 0.5,
        borderRadius: 999,
        whiteSpace: 'nowrap',
        backgroundColor: theme.alpha(
          hasListeners
            ? (theme.vars || theme).palette.success.main
            : (theme.vars || theme).palette.text.secondary,
          0.12,
        ),
      })}
    >
      <Box
        sx={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          backgroundColor: color,
          animation: hasListeners
            ? `${pulse} 1.4s ease-in-out infinite`
            : 'none',
        }}
      />
      <Typography
        variant="body2"
        sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', color }}
      >
        {count}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {t('connectedListener', { count })}
      </Typography>
    </Box>
  );
};
