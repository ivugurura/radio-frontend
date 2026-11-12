import React from 'react';
import { Avatar, Box, Container, Link, Typography } from '@mui/material';
import { LockOutlined as LockOutlinedIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router';
import { Copyright } from '../../components/Copyright';

/** Same frame as the login page, for the signed-out account pages. */
export const AccountShell: React.FC<
  Readonly<{ title: string; subtitle?: string; children: React.ReactNode }>
> = ({ title, subtitle, children }) => {
  const { t } = useTranslation('auth');
  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          mt: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
          <LockOutlinedIcon />
        </Avatar>
        <Typography component="h1" variant="h5" textAlign="center">
          {title}
        </Typography>
        {subtitle && (
          <Typography
            variant="body2"
            color="text.secondary"
            textAlign="center"
            sx={{ mt: 1 }}
          >
            {subtitle}
          </Typography>
        )}
        <Box sx={{ mt: 3, width: '100%' }}>{children}</Box>
        <Link component={RouterLink} to="/login" variant="body2" sx={{ mt: 3 }}>
          {t('account.backToSignIn')}
        </Link>
      </Box>
      <Copyright sx={{ mt: 8, mb: 4 }} />
    </Container>
  );
};
