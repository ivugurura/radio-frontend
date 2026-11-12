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
import { Link as RouterLink, useSearchParams } from 'react-router';
import {
  useAcceptInviteMutation,
  useAccountLinkQuery,
  useResetPasswordMutation,
} from '@graphql/hooks';
import { lStorage, MIN_PASSWORD_LENGTH } from '@libs/constants';
import { AccountShell } from './AccountShell';

type Mode = 'invite' | 'reset';

const PURPOSE: Record<Mode, 'INVITE' | 'PASSWORD_RESET'> = {
  invite: 'INVITE',
  reset: 'PASSWORD_RESET',
};

const errorText = (err: unknown, fallback: string) =>
  err instanceof Error && err.message ? err.message : fallback;

const PasswordForm = ({
  mode,
  token,
}: Readonly<{ mode: Mode; token: string }>) => {
  const { t } = useTranslation('auth');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [acceptInvite, accepting] = useAcceptInviteMutation();
  const [resetPassword, resetting] = useResetPasswordMutation();
  const loading = accepting.loading || resetting.loading;

  const tooShort = password.length > 0 && password.length < MIN_PASSWORD_LENGTH;
  const mismatch = confirm.length > 0 && confirm !== password;
  const canSubmit =
    password.length >= MIN_PASSWORD_LENGTH && confirm === password && !loading;

  const submit = async () => {
    if (mode === 'invite') {
      const res = await acceptInvite({ variables: { token, password } });
      return res.data?.acceptInvite;
    }
    const res = await resetPassword({
      variables: { token, newPassword: password },
    });
    return res.data?.resetPassword;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const session = await submit();
      if (!session) return;
      lStorage.save(session.token, session.refreshToken);
      // A full load so the app starts with the new session and studio access.
      window.location.replace('/admin');
    } catch (err) {
      setError(errorText(err, t('account.failed')));
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      <Stack spacing={2}>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField
          label={t('account.newPassword')}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          error={tooShort}
          helperText={t('account.passwordRules', { min: MIN_PASSWORD_LENGTH })}
          autoFocus
          required
          fullWidth
        />
        <TextField
          label={t('account.confirmPassword')}
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          error={mismatch}
          helperText={mismatch ? t('account.mismatch') : ' '}
          required
          fullWidth
        />
        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={!canSubmit}
        >
          {loading ? t('account.saving') : t(`account.${mode}.submit`)}
        </Button>
      </Stack>
    </Box>
  );
};

/** `/accept-invite?token=…` and `/reset-password?token=…`. */
export default function SetPasswordPage({ mode }: Readonly<{ mode: Mode }>) {
  const { t } = useTranslation('auth');
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const { data, loading } = useAccountLinkQuery({
    variables: { token },
    skip: !token,
    fetchPolicy: 'network-only',
  });
  const link = data?.accountLink;

  if (token && loading && !link) {
    return (
      <AccountShell title={t(`account.${mode}.title`)}>
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      </AccountShell>
    );
  }

  if (!link?.valid || link.purpose !== PURPOSE[mode]) {
    return (
      <AccountShell title={t('account.invalidTitle')}>
        <Stack spacing={2}>
          <Alert severity="warning">{t(`account.${mode}.invalid`)}</Alert>
          {mode === 'reset' && (
            <Button
              component={RouterLink}
              to="/forgot-password"
              variant="outlined"
            >
              {t('account.requestNew')}
            </Button>
          )}
        </Stack>
      </AccountShell>
    );
  }

  return (
    <AccountShell
      title={t(`account.${mode}.title`)}
      subtitle={t(`account.${mode}.subtitle`, {
        name: link.firstName,
        email: link.email,
      })}
    >
      <PasswordForm mode={mode} token={token} />
    </AccountShell>
  );
}
