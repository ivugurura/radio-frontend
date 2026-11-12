import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Stack,
  TextField,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import {
  useAuthOptionsQuery,
  useRequestPasswordResetMutation,
} from '@graphql/hooks';
import { AccountShell } from './AccountShell';

/** `/forgot-password`: emails a reset link when email delivery is set up. */
export default function ForgotPasswordPage() {
  const { t } = useTranslation('auth');
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [failed, setFailed] = useState(false);
  const { data, loading: loadingOptions } = useAuthOptionsQuery();
  const [requestReset, { loading }] = useRequestPasswordResetMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFailed(false);
    try {
      await requestReset({ variables: { email: email.trim() } });
      setSent(true);
    } catch {
      setFailed(true);
    }
  };

  const renderBody = () => {
    if (loadingOptions && !data) {
      return (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      );
    }
    if (!data?.authOptions.passwordResetAvailable) {
      return <Alert severity="info">{t('account.forgot.unavailable')}</Alert>;
    }
    if (sent) {
      return (
        <Alert severity="success">
          {t('account.forgot.sent', { email: email.trim() })}
        </Alert>
      );
    }
    return (
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <Stack spacing={2}>
          {failed && <Alert severity="error">{t('account.failed')}</Alert>}
          <TextField
            label={t('email')}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            autoFocus
            required
            fullWidth
          />
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={loading || !email.trim()}
          >
            {loading ? t('account.sending') : t('account.forgot.submit')}
          </Button>
        </Stack>
      </Box>
    );
  };

  return (
    <AccountShell
      title={t('account.forgot.title')}
      subtitle={t('account.forgot.subtitle')}
    >
      {renderBody()}
    </AccountShell>
  );
}
