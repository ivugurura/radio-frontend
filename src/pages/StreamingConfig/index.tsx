import * as React from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  Container,
  Divider,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useTranslation } from 'react-i18next';
import {
  useStreamingConfigQuery,
  useRegenerateStreamingCredentialMutation,
} from '@graphql/hooks';
import { notifier } from '@libs/constants';
import { useStudioId } from '@components/providers';
import CopyField from './CopyField';
import ConfirmDialog from '../audio/ConfirmDialog';

export default function StreamingConfigPage() {
  const { t } = useTranslation('streaming');
  const studioId = useStudioId();
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  const { data, loading, error, refetch } = useStreamingConfigQuery({
    variables: { studioId },
    fetchPolicy: 'cache-and-network',
  });

  const [regenerate, { loading: regenerating }] =
    useRegenerateStreamingCredentialMutation();

  const config = data?.streamingConfig;

  const handleRegenerate = async () => {
    setConfirmOpen(false);
    try {
      await regenerate({ variables: { studioId } });
      notifier.success(t('regenerateSuccess'));
    } catch {
      notifier.error(t('regenerateError'));
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        mb={2}
      >
        <Typography variant="h5" fontWeight={700}>
          {t('title')}
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={() => void refetch()}
          disabled={loading}
        >
          {t('refresh')}
        </Button>
      </Stack>

      <Typography variant="body2" color="text.secondary" mb={3}>
        {t('intro')}
      </Typography>

      {loading && !config && (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress />
        </Box>
      )}

      {error && !config && (
        <Alert severity="error">{t('loadFailed')}</Alert>
      )}

      {config && (
        <Stack spacing={3}>
          <Card variant="outlined">
            <CardHeader
              title="Server"
              subheader="BUTT → Main tab"
              sx={{ pb: 0 }}
            />
            <CardContent>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <CopyField label="Address" value={config.host} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <CopyField label="Port" value={String(config.port)} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <CopyField label="Mountpoint" value={config.mount} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <CopyField label="Type" value={config.protocol} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <CopyField label="Username" value={config.username} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <CopyField label="Password" value={config.password} secret />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Card variant="outlined">
            <CardHeader
              title="Encoder"
              subheader="BUTT → Stream tab — must match exactly or the connection is rejected"
              sx={{ pb: 0 }}
            />
            <CardContent>
              <Grid container spacing={2}>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <CopyField label="Format" value={config.format} />
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <CopyField
                    label="Bitrate (kbps)"
                    value={String(config.bitrateKbps)}
                  />
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <CopyField
                    label="Sample rate (Hz)"
                    value={String(config.sampleRateHz)}
                  />
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <CopyField label="Channels" value={String(config.channels)} />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Card variant="outlined">
            <CardContent>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                alignItems={{ sm: 'center' }}
                justifyContent="space-between"
                spacing={2}
              >
                <Box>
                  <Typography variant="subtitle2">
                    {t('regeneratePassword')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {config.rotatedAt
                      ? `Last rotated ${new Date(config.rotatedAt).toLocaleString()}`
                      : 'Never rotated'}
                    . Any BUTT client using the current password will need to be
                    updated.
                  </Typography>
                </Box>
                <Button
                  variant="outlined"
                  color="warning"
                  startIcon={<AutorenewIcon />}
                  onClick={() => setConfirmOpen(true)}
                  disabled={regenerating}
                >
                  {t('regeneratePassword')}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      )}

      <Divider sx={{ my: 3 }} />

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void handleRegenerate()}
        title={t('confirmTitle')}
        message={
          <Alert severity="warning" icon={false} sx={{ mb: 0 }}>
            {t('confirmBody')}
          </Alert>
        }
        confirmText={t('confirmAction')}
        confirmColor="warning"
      />
    </Container>
  );
}
