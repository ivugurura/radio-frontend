import React from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import CopyField from '../pages/streaming-config/CopyField';

export type AccountLinkResult = Readonly<{
  /** Who the link is for. */
  email: string;
  link: string;
  purpose: 'INVITE' | 'PASSWORD_RESET';
  emailed: boolean;
}>;

/**
 * Shows a one-time invite or reset link after it's issued. The link is always
 * shown so it can be shared by hand (e.g. WhatsApp), emailed or not.
 */
export const LinkResultDialog: React.FC<
  Readonly<{ result: AccountLinkResult | null; onClose: () => void }>
> = ({ result, onClose }) => {
  const { t } = useTranslation('users');
  const kind = result?.purpose === 'PASSWORD_RESET' ? 'reset' : 'invite';
  const delivery = result?.emailed ? 'emailed' : 'notEmailed';

  return (
    <Dialog open={result !== null} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t(`link.${kind}Title`)}</DialogTitle>
      <DialogContent>
        {result && (
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            <Alert severity={result.emailed ? 'success' : 'info'}>
              {t(`link.${delivery}`, { email: result.email })}
            </Alert>
            <CopyField label={t('link.label')} value={result.link} />
            <Typography variant="body2" color="text.secondary">
              {t(`link.${kind}Hint`)}
            </Typography>
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">
          {t('link.done')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
