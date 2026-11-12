import React, { useEffect, useState } from 'react';
import {
  Alert,
  Autocomplete,
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
import { useCreateStudioMutation, useUsersQuery } from '@graphql/hooks';
import type { UsersQuery } from '@graphql/graphql';
import { studioLanguageLabel } from './labels';

type OwnerOption = UsersQuery['users']['items'][number];

const DISPLAY_NAME_MAX = 120;
const EMPTY = { slug: '', displayName: '', description: '' };

const errorText = (err: unknown, fallback: string) =>
  err instanceof Error && err.message ? err.message : fallback;

const ownerLabel = (user: OwnerOption) => {
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ');
  return name ? `${name} (${user.email})` : user.email;
};

const useDebounced = (value: string, delay = 300) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(id);
  }, [value, delay]);
  return debounced;
};

/** Optional owner picker: searches existing accounts, skipping disabled ones. */
const OwnerField: React.FC<
  Readonly<{
    value: OwnerOption | null;
    onChange: (user: OwnerOption | null) => void;
  }>
> = ({ value, onChange }) => {
  const { t } = useTranslation('studios');
  const [input, setInput] = useState('');
  const search = useDebounced(input.trim());
  const { data, loading } = useUsersQuery({
    variables: { search: search || undefined, limit: 10, offset: 0 },
    fetchPolicy: 'cache-and-network',
  });
  const options = (data?.users.items ?? []).filter(
    (u) => u.status !== 'DISABLED',
  );

  return (
    <Autocomplete
      value={value}
      onChange={(_e, next) => onChange(next)}
      inputValue={input}
      onInputChange={(_e, next) => setInput(next)}
      options={options}
      loading={loading}
      filterOptions={(x) => x}
      getOptionLabel={ownerLabel}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      noOptionsText={t('create.noOwnerMatch')}
      renderInput={(params) => (
        <TextField
          {...params}
          label={t('create.owner')}
          helperText={t('create.ownerHint')}
        />
      )}
    />
  );
};

/** Superusers create a studio for a language that has none yet. */
export const CreateStudioDialog: React.FC<
  Readonly<{
    open: boolean;
    availableSlugs: readonly string[];
    onClose: () => void;
    onCreated: (studioId: string, displayName: string) => void;
  }>
> = ({ open, availableSlugs, onClose, onCreated }) => {
  const { t } = useTranslation('studios');
  const [form, setForm] = useState(EMPTY);
  const [owner, setOwner] = useState<OwnerOption | null>(null);
  const [error, setError] = useState('');
  const [createStudio, { loading }] = useCreateStudioMutation({
    refetchQueries: ['Studios', 'PublicStudios', 'UserProfile'],
    awaitRefetchQueries: true,
  });

  // Preselect when only one language is left.
  const slug =
    form.slug || (availableSlugs.length === 1 ? availableSlugs[0] : '');
  const name = form.displayName.trim();
  const canSubmit =
    Boolean(slug) &&
    Boolean(name) &&
    name.length <= DISPLAY_NAME_MAX &&
    !loading;

  const field =
    (key: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const reset = () => {
    setForm(EMPTY);
    setOwner(null);
    setError('');
  };

  const close = () => {
    if (loading) return;
    reset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError('');
    try {
      const res = await createStudio({
        variables: {
          studioId: slug,
          displayName: name,
          description: form.description.trim(),
          ownerUserId: owner?.id,
        },
      });
      const created = res.data?.createStudio?.studio;
      if (!created) return;
      reset();
      onCreated(created.studioId, created.displayName);
    } catch (err) {
      setError(errorText(err, t('actionFailed')));
    }
  };

  return (
    <Dialog open={open} onClose={close} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit} noValidate>
        <DialogTitle>{t('create.title')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              select
              label={t('create.language')}
              value={slug}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, slug: e.target.value }))
              }
              helperText={t('create.languageHint')}
              required
              fullWidth
            >
              {availableSlugs.map((code) => (
                <MenuItem key={code} value={code}>
                  {studioLanguageLabel(code)}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label={t('create.displayName')}
              value={form.displayName}
              onChange={field('displayName')}
              error={name.length > DISPLAY_NAME_MAX}
              slotProps={{ htmlInput: { maxLength: DISPLAY_NAME_MAX } }}
              autoFocus
              required
              fullWidth
            />
            <TextField
              label={t('create.description')}
              value={form.description}
              onChange={field('description')}
              multiline
              minRows={2}
              fullWidth
            />
            <OwnerField value={owner} onChange={setOwner} />
            <Alert severity="info" icon={false}>
              {t('create.permanentHint')}
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={close} disabled={loading}>
            {t('cancel')}
          </Button>
          <Button type="submit" variant="contained" disabled={!canSubmit}>
            {loading ? t('create.creating') : t('create.submit')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
