import { Box, Button, Chip, LinearProgress, Stack } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { UploadSummary } from './types';
import { formatBytes } from './utils';

type UploadSummaryBarProps = Readonly<{
  summary: UploadSummary;
  onClearFinished: () => void;
}>;

export const UploadSummaryBar = ({
  summary,
  onClearFinished,
}: UploadSummaryBarProps) => {
  const { t } = useTranslation('audio');

  return (
    <Box>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        flexWrap="wrap"
        useFlexGap
        spacing={1}
        sx={{ mb: 1 }}
      >
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Chip
            size="small"
            label={t('upload.summary.files', {
              count: summary.total,
              size: formatBytes(summary.totalBytes),
            })}
          />
          {summary.uploading > 0 && (
            <Chip
              size="small"
              color="primary"
              label={t('upload.summary.uploading', {
                count: summary.uploading,
              })}
            />
          )}
          {summary.done > 0 && (
            <Chip
              size="small"
              color="success"
              label={t('upload.summary.done', { count: summary.done })}
            />
          )}
          {summary.errors > 0 && (
            <Chip
              size="small"
              color="error"
              label={t('upload.summary.errors', { count: summary.errors })}
            />
          )}
          {summary.duplicates > 0 && (
            <Chip
              size="small"
              color="warning"
              label={t('upload.summary.duplicates', {
                count: summary.duplicates,
              })}
            />
          )}
        </Stack>
        {summary.done > 0 && (
          <Button size="small" onClick={onClearFinished}>
            {t('upload.actions.clearFinished')}
          </Button>
        )}
      </Stack>
      <LinearProgress
        variant="determinate"
        value={summary.overallProgress}
        sx={{ height: 6, borderRadius: 3 }}
      />
    </Box>
  );
};
