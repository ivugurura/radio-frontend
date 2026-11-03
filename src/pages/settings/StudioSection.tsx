import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControlLabel,
  Grid,
  Slider,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import {
  useStudioSettingsQuery,
  useUpdateStudioSettingsMutation,
} from '@graphql/hooks';
import { notifier } from '@libs/constants';
import { useStudioId } from '@components/providers';
import { SettingsCard } from './SettingsCard';
import { errorMessage } from './errors';

// Matches the API's accepted range (apps/studio/schema/mutations/settings.py).
const LOUDNESS_MIN = -24;
const LOUDNESS_MAX = -9;

type StudioForm = {
  displayName: string;
  description: string;
  autoNormalize: boolean;
  loudnessTargetLufs: number;
};

const ReadOnlyValue = ({ label, value }: { label: string; value: string }) => (
  <Box>
    <Typography variant="caption" color="text.secondary">
      {label}
    </Typography>
    <Typography variant="body1" fontWeight={600}>
      {value}
    </Typography>
  </Box>
);

export const StudioSection = () => {
  const { t } = useTranslation('settings');
  const studioId = useStudioId();
  const { data, loading, error } = useStudioSettingsQuery({
    variables: { studioId },
    fetchPolicy: 'cache-and-network',
  });
  const [updateSettings, { loading: saving }] =
    useUpdateStudioSettingsMutation();
  const settings = data?.studioSettings;
  const [form, setForm] = useState<StudioForm | null>(null);

  // Reload the form when the data arrives or the language switches studio.
  useEffect(() => {
    if (!settings) return;
    setForm({
      displayName: settings.displayName,
      description: settings.description,
      autoNormalize: settings.autoNormalize,
      loudnessTargetLufs: settings.loudnessTargetLufs,
    });
  }, [settings]);

  if (loading && !settings) {
    return (
      <Box display="flex" justifyContent="center" py={6}>
        <CircularProgress />
      </Box>
    );
  }
  if (error || !settings || !form) {
    return <Alert severity="error">{t('studio.loadFailed')}</Alert>;
  }

  const readOnly = !settings.canEdit;
  const dirty =
    form.displayName !== settings.displayName ||
    form.description !== settings.description ||
    form.autoNormalize !== settings.autoNormalize ||
    form.loudnessTargetLufs !== settings.loudnessTargetLufs;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateSettings({ variables: { studioId, ...form } });
      notifier.success(t('studio.saved'));
    } catch (err) {
      notifier.error(errorMessage(err, t('saveFailed')));
    }
  };

  return (
    <Stack spacing={2}>
      {readOnly && <Alert severity="info">{t('studio.readOnly')}</Alert>}

      <SettingsCard
        title={t('studio.title')}
        subtitle={t('studio.subtitle', { studio: settings.studioId })}
      >
        <Box component="form" onSubmit={handleSubmit} noValidate>
          <Stack spacing={2.5}>
            <TextField
              label={t('studio.displayName')}
              value={form.displayName}
              onChange={(e) =>
                setForm({ ...form, displayName: e.target.value })
              }
              disabled={readOnly}
              slotProps={{ htmlInput: { maxLength: 120 } }}
              required
              fullWidth
            />
            <TextField
              label={t('studio.description')}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              disabled={readOnly}
              multiline
              minRows={3}
              fullWidth
            />

            <Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={form.autoNormalize}
                    onChange={(e) =>
                      setForm({ ...form, autoNormalize: e.target.checked })
                    }
                    disabled={readOnly}
                  />
                }
                label={t('studio.autoNormalize')}
              />
              <Typography variant="body2" color="text.secondary">
                {t('studio.autoNormalizeHint')}
              </Typography>
            </Box>

            <Box sx={{ px: 1 }}>
              <Typography variant="body2" gutterBottom>
                {t('studio.loudnessTarget', {
                  value: form.loudnessTargetLufs,
                })}
              </Typography>
              <Slider
                value={form.loudnessTargetLufs}
                onChange={(_e, value) =>
                  setForm({ ...form, loudnessTargetLufs: value as number })
                }
                min={LOUDNESS_MIN}
                max={LOUDNESS_MAX}
                step={0.5}
                marks={[
                  { value: -16, label: '-16' },
                  { value: -14, label: '-14' },
                ]}
                valueLabelDisplay="auto"
                disabled={readOnly || !form.autoNormalize}
                aria-label={t('studio.loudnessAria')}
              />
              <Typography variant="body2" color="text.secondary">
                {t('studio.loudnessHint')}
              </Typography>
            </Box>

            {!readOnly && (
              <Stack direction="row" justifyContent="flex-end" spacing={1}>
                <Button
                  onClick={() =>
                    setForm({
                      displayName: settings.displayName,
                      description: settings.description,
                      autoNormalize: settings.autoNormalize,
                      loudnessTargetLufs: settings.loudnessTargetLufs,
                    })
                  }
                  disabled={!dirty || saving}
                >
                  {t('reset')}
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={!dirty || saving || !form.displayName.trim()}
                >
                  {saving ? t('saving') : t('save')}
                </Button>
              </Stack>
            )}
          </Stack>
        </Box>
      </SettingsCard>

      <SettingsCard
        title={t('studio.audioTitle')}
        subtitle={t('studio.audioSubtitle')}
      >
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <ReadOnlyValue
              label={t('studio.bitrate')}
              value={`${settings.bitrateKbps} kbps`}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <ReadOnlyValue
              label={t('studio.sampleRate')}
              value={`${settings.sampleRateHz / 1000} kHz`}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <ReadOnlyValue
              label={t('studio.channels')}
              value={t('studio.channelCount', { count: settings.channels })}
            />
          </Grid>
        </Grid>
      </SettingsCard>
    </Stack>
  );
};
