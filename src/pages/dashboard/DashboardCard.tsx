import React from 'react';
import { Paper, Box, Typography } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';

interface DashboardCardProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  sx?: SxProps<Theme>;
}

export const DashboardCard: React.FC<DashboardCardProps> = ({
  title,
  subtitle,
  action,
  children,
  sx,
}) => (
  <Paper
    variant="outlined"
    sx={[
      {
        p: { xs: 2, sm: 2.5 },
        borderRadius: 3,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
      },
      ...(Array.isArray(sx) ? sx : [sx]),
    ]}
  >
    {(title || action) && (
      <Box
        display="flex"
        alignItems="flex-start"
        justifyContent="space-between"
        flexWrap="wrap"
        gap={1}
        mb={2}
      >
        <Box minWidth={0}>
          {title && (
            <Typography variant="subtitle1" fontWeight={600} color="text.primary">
              {title}
            </Typography>
          )}
          {subtitle && (
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
        {action}
      </Box>
    )}
    {children}
  </Paper>
);
