import React, { useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useInviteUserMutation } from '@graphql/hooks';
import type { InviteUserMutation } from '@graphql/graphql';
import { useStudioAccess, type StudioRole } from '@components/providers';

export type InviteOutcome = Readonly<{
  email: string;
  result: NonNullable<InviteUserMutation['inviteUser']>;
}>;

const NO_STUDIO = '';
const EMPTY = { email: '', firstName: '', lastName: '', studioId: NO_STUDIO };

const errorText = (err: unknown, fallback: string) =>
  err instanceof Error && err.message ? err.message : fallback;

/** Platform admins invite anyone, optionally straight into a studio. */
export const InviteUserDialog: React.FC<
  Readonly<{
    open: boolean;
    onClose: () => void;
    onInvited: (outcome: InviteOutcome) => void;
  }>
> = ({ open, onClose, onInvited }) => {
  const { t } = useTranslation('users');
  const { studios } = useStudioAccess();
  const [form, setForm] = useState(EMPTY);
  const [role, setRole] = useState<StudioRole | ''>('');
  const [error, setError] = useState('');
  const [inviteUser, { loading }] = useInviteUserMutation({
    refetchQueries: ['Users', 'StudioMembers'],
  });

  const studio = studios.find((s) => s.studioId === form.studioId);
  const needsRole = Boolean(studio);
  const canSubmit =
    Boolean(form.email.trim()) && (!needsRole || Boolean(role)) && !loading;

  const field =
    (key: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const close = () => {
    if (loading) return;
    setForm(EMPTY);
    setRole('');
    setError('');
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await inviteUser({
        variables: {
          email: form.email.trim(),
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          studioId: studio?.studioId,
          role: studio && role ? role : undefined,
        },
      });
      const result = res.data?.inviteUser;
      if (!result) return;
      const email = form.email.trim();
      setForm(EMPTY);
      setRole('');
      onInvited({ email, result });
    } catch (err) {
      setError(errorText(err, t('actionFailed')));
    }
  };

  return (
    <Dialog open={open} onClose={close} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit} noValidate>
        <DialogTitle>{t('invite.title')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              label={t('fields.email')}
              type="email"
              value={form.email}
              onChange={field('email')}
              autoComplete="off"
              autoFocus
              required
              fullWidth
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label={t('fields.firstName')}
                value={form.firstName}
                onChange={field('firstName')}
                fullWidth
              />
              <TextField
                label={t('fields.lastName')}
                value={form.lastName}
                onChange={field('lastName')}
                fullWidth
              />
            </Stack>
            <TextField
              select
              label={t('invite.studio')}
              value={form.studioId}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, studioId: e.target.value }));
                setRole('');
              }}
              helperText={t('invite.studioHint')}
              fullWidth
            >
              <MenuItem value={NO_STUDIO}>{t('invite.noStudio')}</MenuItem>
              {studios.map((s) => (
                <MenuItem key={s.studioId} value={s.studioId}>
                  {s.displayName}
                </MenuItem>
              ))}
            </TextField>
            {studio && (
              <TextField
                select
                label={t('fields.role')}
                value={role}
                onChange={(e) => setRole(e.target.value as StudioRole)}
                required
                fullWidth
              >
                {studio.assignableRoles.map((r) => (
                  <MenuItem key={r} value={r}>
                    {t(`settings:members.roles.${r}`)}
                  </MenuItem>
                ))}
              </TextField>
            )}
            <Alert severity="info" icon={false}>
              {t('invite.hint')}
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={close} disabled={loading}>
            {t('cancel')}
          </Button>
          <Button type="submit" variant="contained" disabled={!canSubmit}>
            {loading ? t('invite.sending') : t('invite.submit')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
