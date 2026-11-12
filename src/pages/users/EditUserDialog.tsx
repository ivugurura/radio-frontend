import React, { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useUpdateUserMutation } from '@graphql/hooks';
import { notifier } from '@libs/constants';
import type { ManagedUserRow } from './types';

type Form = {
  firstName: string;
  lastName: string;
  userName: string;
  email: string;
  phone: string;
};

const toForm = (user: ManagedUserRow): Form => ({
  firstName: user.firstName,
  lastName: user.lastName,
  userName: user.userName,
  email: user.email,
  phone: user.phone ?? '',
});

const errorText = (err: unknown, fallback: string) =>
  err instanceof Error && err.message ? err.message : fallback;

export const EditUserDialog: React.FC<
  Readonly<{ user: ManagedUserRow | null; onClose: () => void }>
> = ({ user, onClose }) => {
  const { t } = useTranslation('users');
  const [form, setForm] = useState<Form | null>(null);
  const [error, setError] = useState('');
  const [updateUser, { loading }] = useUpdateUserMutation({
    refetchQueries: ['Users'],
  });

  useEffect(() => {
    setForm(user ? toForm(user) : null);
    setError('');
  }, [user]);

  const field = (key: keyof Form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => prev && { ...prev, [key]: e.target.value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !form) return;
    setError('');
    try {
      await updateUser({
        variables: {
          userId: user.id,
          firstName: form.firstName,
          lastName: form.lastName,
          userName: form.userName,
          email: form.email,
          phone: form.phone,
        },
      });
      notifier.success(t('edit.saved'));
      onClose();
    } catch (err) {
      setError(errorText(err, t('actionFailed')));
    }
  };

  return (
    <Dialog
      open={user !== null}
      onClose={() => !loading && onClose()}
      maxWidth="sm"
      fullWidth
    >
      <form onSubmit={handleSubmit} noValidate>
        <DialogTitle>{t('edit.title')}</DialogTitle>
        <DialogContent>
          {form && (
            <Stack spacing={2} sx={{ pt: 1 }}>
              {error && <Alert severity="error">{error}</Alert>}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label={t('fields.firstName')}
                  value={form.firstName}
                  onChange={field('firstName')}
                  required
                  fullWidth
                />
                <TextField
                  label={t('fields.lastName')}
                  value={form.lastName}
                  onChange={field('lastName')}
                  required
                  fullWidth
                />
              </Stack>
              <TextField
                label={t('fields.userName')}
                value={form.userName}
                onChange={field('userName')}
                required
                fullWidth
              />
              <TextField
                label={t('fields.email')}
                type="email"
                value={form.email}
                onChange={field('email')}
                helperText={t('edit.emailHint')}
                required
                fullWidth
              />
              <TextField
                label={t('fields.phone')}
                value={form.phone}
                onChange={field('phone')}
                fullWidth
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={loading}>
            {t('cancel')}
          </Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? t('edit.saving') : t('edit.submit')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
