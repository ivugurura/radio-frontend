import { useCallback } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import {
  Close as CloseIcon,
  CloudUploadOutlined as CloudUploadIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { MAX_CONCURRENCY } from './constants';
import { DropZone } from './DropZone';
import { UploadGuidelines } from './UploadGuidelines';
import { UploadList } from './UploadList';
import { UploadSummaryBar } from './UploadSummaryBar';
import { UploadWarnings } from './UploadWarnings';
import { useUploadQueue } from './useUploadQueue';

type UploadFormProps = Readonly<{
  open: boolean;
  onClose: () => void;
  /** Called when a track row is created or queued for processing, so lists can refetch. */
  onTracksChanged?: () => void;
}>;

export const UploadForm = ({
  open,
  onClose,
  onTracksChanged,
}: UploadFormProps) => {
  const { t } = useTranslation('audio');
  const queue = useUploadQueue(onTracksChanged);
  const { items, summary } = queue;
  const startable = summary.pending + summary.errors;

  const handleDialogClose = useCallback(
    (_e: unknown, reason?: 'backdropClick' | 'escapeKeyDown') => {
      // Avoid losing the queue to a stray click while files are uploading.
      if (reason === 'backdropClick' && summary.uploading > 0) return;
      onClose();
    },
    [onClose, summary.uploading],
  );

  return (
    <Dialog
      open={open}
      onClose={handleDialogClose}
      maxWidth="lg"
      fullWidth
      slotProps={{ paper: { sx: { borderRadius: 3 } } }}
    >
      <DialogTitle sx={{ pr: 6 }}>
        <Typography variant="h6" component="span" sx={{ fontWeight: 700 }}>
          {t('upload.title')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('upload.subtitle')}
        </Typography>
        <IconButton
          aria-label={t('upload.actions.close')}
          onClick={onClose}
          sx={{ position: 'absolute', right: 12, top: 12 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Box
          sx={{
            display: 'grid',
            gap: 3,
            gridTemplateColumns: {
              xs: '1fr',
              md: 'minmax(0, 2fr) minmax(0, 1fr)',
            },
          }}
        >
          <Stack spacing={2} sx={{ minWidth: 0 }}>
            <DropZone onFiles={queue.addFiles} />
            <UploadWarnings
              summary={summary}
              skippedCount={queue.skippedCount}
              onDismissSkipped={queue.dismissSkipped}
            />
            {items.length > 0 && (
              <>
                <UploadSummaryBar
                  summary={summary}
                  onClearFinished={queue.clearFinished}
                />
                <UploadList
                  items={items}
                  onStart={queue.start}
                  onCancel={queue.cancel}
                  onRemove={queue.remove}
                />
              </>
            )}
          </Stack>
          <UploadGuidelines />
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mr: 'auto' }}
        >
          {t('upload.concurrencyHint', { count: MAX_CONCURRENCY })}
        </Typography>
        <Button
          variant="outlined"
          color="inherit"
          onClick={queue.cancelRunning}
          disabled={summary.uploading === 0}
        >
          {t('upload.actions.cancelRunning')}
        </Button>
        <Button
          variant="contained"
          startIcon={<CloudUploadIcon />}
          onClick={queue.startAll}
          disabled={startable === 0 || summary.uploading > 0}
        >
          {t('upload.actions.startAll', { count: startable })}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
