import React, { useState } from 'react';
import { Box, Button, Stack, TextField } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useChangePasswordMutation } from '@graphql/hooks';
import { lStorage, MIN_PASSWORD_LENGTH, notifier } from '@libs/constants';
import { SettingsCard } from './SettingsCard';
import { errorMessage } from './errors';

const MIN_LENGTH = MIN_PASSWORD_LENGTH;

const EMPTY = { current: '', next: '', confirm: '' };

export const PasswordSection = () => {
  const { t } = useTranslation('settings');
  const [form, setForm] = useState(EMPTY);
  const [changePassword, { loading }] = useChangePasswordMutation();

  const tooShort = form.next.length > 0 && form.next.length < MIN_LENGTH;
  const mismatch = form.confirm.length > 0 && form.confirm !== form.next;
  const canSubmit =
    !!form.current && form.next.length >= MIN_LENGTH && !mismatch && !loading;

  const field =
    (key: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await changePassword({
        variables: { currentPassword: form.current, newPassword: form.next },
      });
      const tokens = res.data?.changePassword;
      // Every old session was revoked; keep this one with the fresh pair.
      if (tokens?.token) {
        lStorage.save(tokens.token, tokens.refreshToken ?? undefined);
      }
      setForm(EMPTY);
      notifier.success(t('password.changed'));
    } catch (err) {
      notifier.error(errorMessage(err, t('saveFailed')));
    }
  };

  return (
    <SettingsCard title={t('password.title')} subtitle={t('password.subtitle')}>
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <Stack spacing={2}>
          <TextField
            label={t('password.current')}
            type="password"
            value={form.current}
            onChange={field('current')}
            autoComplete="current-password"
            required
            fullWidth
          />
          <TextField
            label={t('password.new')}
            type="password"
            value={form.next}
            onChange={field('next')}
            autoComplete="new-password"
            error={tooShort}
            helperText={t('password.rules', { min: MIN_LENGTH })}
            required
            fullWidth
          />
          <TextField
            label={t('password.confirm')}
            type="password"
            value={form.confirm}
            onChange={field('confirm')}
            autoComplete="new-password"
            error={mismatch}
            helperText={mismatch ? t('password.mismatch') : ' '}
            required
            fullWidth
          />
          <Stack direction="row" justifyContent="flex-end">
            <Button type="submit" variant="contained" disabled={!canSubmit}>
              {loading ? t('saving') : t('password.submit')}
            </Button>
          </Stack>
        </Stack>
      </Box>
    </SettingsCard>
  );
};
