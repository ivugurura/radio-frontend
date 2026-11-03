import React, { useMemo, useState } from 'react';
import { Autocomplete, Box, Button, Stack, TextField } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useUpdateProfileMutation } from '@graphql/hooks';
import type { UserType } from '@graphql/graphql';
import { notifier } from '@libs/constants';
import { useAuth } from '@components/providers/AuthContext';
import { SettingsCard } from './SettingsCard';
import { errorMessage } from './errors';

type ProfileForm = {
  firstName: string;
  lastName: string;
  userName: string;
  email: string;
  timezone: string;
};

// The TS lib target predates Intl.supportedValuesOf; every evergreen browser has it.
const timeZones = (): string[] => {
  const intl = Intl as typeof Intl & {
    supportedValuesOf?: (key: 'timeZone') => string[];
  };
  return intl.supportedValuesOf?.('timeZone') ?? ['UTC'];
};

const fromUser = (user: UserType | null): ProfileForm => ({
  firstName: user?.firstName ?? '',
  lastName: user?.lastName ?? '',
  userName: user?.userName ?? '',
  email: user?.email ?? '',
  timezone: user?.timezone || 'UTC',
});

export const ProfileSection = () => {
  const { t } = useTranslation('settings');
  const { user, setAuthUser } = useAuth();
  const [form, setForm] = useState<ProfileForm>(() => fromUser(user));
  const [currentPassword, setCurrentPassword] = useState('');
  const [updateProfile, { loading }] = useUpdateProfileMutation();
  const zones = useMemo(timeZones, []);

  const saved = fromUser(user);
  const emailChanged =
    form.email.trim().toLowerCase() !== saved.email.toLowerCase();
  const dirty = (Object.keys(form) as (keyof ProfileForm)[]).some(
    (key) => form[key] !== saved[key],
  );

  const field =
    (key: keyof ProfileForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await updateProfile({
        variables: {
          ...form,
          currentPassword: emailChanged ? currentPassword : null,
        },
      });
      const updated = res.data?.updateProfile?.user;
      if (updated) {
        setAuthUser({ ...user, ...updated } as UserType);
        setForm(fromUser(updated as UserType));
      }
      setCurrentPassword('');
      notifier.success(t('profile.saved'));
    } catch (err) {
      notifier.error(errorMessage(err, t('saveFailed')));
    }
  };

  return (
    <SettingsCard title={t('profile.title')} subtitle={t('profile.subtitle')}>
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label={t('profile.firstName')}
              value={form.firstName}
              onChange={field('firstName')}
              autoComplete="given-name"
              required
              fullWidth
            />
            <TextField
              label={t('profile.lastName')}
              value={form.lastName}
              onChange={field('lastName')}
              autoComplete="family-name"
              required
              fullWidth
            />
          </Stack>
          <TextField
            label={t('profile.userName')}
            value={form.userName}
            onChange={field('userName')}
            autoComplete="username"
            required
            fullWidth
          />
          <TextField
            label={t('profile.email')}
            type="email"
            value={form.email}
            onChange={field('email')}
            autoComplete="email"
            helperText={t('profile.emailHint')}
            required
            fullWidth
          />
          {emailChanged && (
            <TextField
              label={t('profile.currentPassword')}
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              helperText={t('profile.currentPasswordHint')}
              required
              fullWidth
            />
          )}
          <Autocomplete
            options={zones}
            value={form.timezone}
            onChange={(_e, value) =>
              setForm((prev) => ({ ...prev, timezone: value ?? 'UTC' }))
            }
            disableClearable
            renderInput={(params) => (
              <TextField {...params} label={t('profile.timezone')} />
            )}
          />
          <Stack direction="row" justifyContent="flex-end" spacing={1}>
            <Button
              onClick={() => {
                setForm(saved);
                setCurrentPassword('');
              }}
              disabled={!dirty || loading}
            >
              {t('reset')}
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={!dirty || loading || (emailChanged && !currentPassword)}
            >
              {loading ? t('saving') : t('save')}
            </Button>
          </Stack>
        </Stack>
      </Box>
    </SettingsCard>
  );
};
