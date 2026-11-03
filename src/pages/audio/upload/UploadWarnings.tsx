import { Alert } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { RECOMMENDED_BATCH_SIZE, RECOMMENDED_MAX_FILE_SIZE } from './constants';
import type { UploadSummary } from './types';
import { formatBytes } from './utils';

type UploadWarningsProps = Readonly<{
  summary: UploadSummary;
  skippedCount: number;
  alreadyListedCount: number;
  onDismissSkipped: () => void;
}>;

/** Soft-limit notices: they inform, never block. */
export const UploadWarnings = ({
  summary,
  skippedCount,
  alreadyListedCount,
  onDismissSkipped,
}: UploadWarningsProps) => {
  const { t } = useTranslation('audio');

  return (
    <>
      {skippedCount > 0 && (
        <Alert severity="warning" onClose={onDismissSkipped}>
          {t('upload.warnings.skipped', { count: skippedCount })}
        </Alert>
      )}
      {alreadyListedCount > 0 && (
        <Alert severity="info" onClose={onDismissSkipped}>
          {t('upload.warnings.alreadyListed', { count: alreadyListedCount })}
        </Alert>
      )}
      {summary.total > RECOMMENDED_BATCH_SIZE && (
        <Alert severity="info">
          {t('upload.warnings.largeBatch', {
            count: summary.total,
            batch: RECOMMENDED_BATCH_SIZE,
          })}
        </Alert>
      )}
      {summary.oversized > 0 && (
        <Alert severity="info">
          {t('upload.warnings.largeFiles', {
            count: summary.oversized,
            size: formatBytes(RECOMMENDED_MAX_FILE_SIZE),
          })}
        </Alert>
      )}
    </>
  );
};
