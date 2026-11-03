import {
  Box,
  Chip,
  IconButton,
  LinearProgress,
  ListItem,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  PlayArrow as PlayArrowIcon,
  Cancel as CancelIcon,
  Replay as ReplayIcon,
  DeleteOutline as DeleteOutlineIcon,
  AudioFileOutlined as AudioFileIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import {
  ACTIVE_STATUSES,
  MESSAGE_COLOR,
  PROGRESS_COLOR,
  STARTABLE_STATUSES,
  STATUS_CHIP_COLOR,
} from './constants';
import type { UploadItem } from './types';
import { formatBytes } from './utils';

export type UploadRowActions = Readonly<{
  onStart: (id: string) => void;
  onCancel: (id: string) => void;
  onRemove: (id: string) => void;
}>;

type UploadRowProps = UploadRowActions &
  Readonly<{
    item: UploadItem;
    divider: boolean;
  }>;

const RowActions = ({
  item,
  onStart,
  onCancel,
  onRemove,
}: UploadRowActions & Readonly<{ item: UploadItem }>) => {
  const { t } = useTranslation('audio');

  if (ACTIVE_STATUSES.includes(item.status)) {
    return (
      <Tooltip title={t('upload.actions.cancel')}>
        <IconButton onClick={() => onCancel(item.id)} size="small">
          <CancelIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    );
  }

  const isQueued = item.status === 'queued';
  return (
    <>
      {STARTABLE_STATUSES.includes(item.status) && (
        <Tooltip
          title={
            isQueued ? t('upload.actions.start') : t('upload.actions.retry')
          }
        >
          <IconButton onClick={() => onStart(item.id)} size="small">
            {isQueued ? (
              <PlayArrowIcon fontSize="small" />
            ) : (
              <ReplayIcon fontSize="small" />
            )}
          </IconButton>
        </Tooltip>
      )}
      <Tooltip title={t('upload.actions.remove')}>
        <IconButton onClick={() => onRemove(item.id)} size="small">
          <DeleteOutlineIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </>
  );
};

export const UploadRow = ({ item, divider, ...actions }: UploadRowProps) => {
  const { t } = useTranslation('audio');

  return (
    <ListItem
      divider={divider}
      sx={{ py: 1.25, alignItems: 'flex-start', gap: 1.5 }}
    >
      <AudioFileIcon color="action" sx={{ mt: 0.25 }} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
          <Typography
            variant="body2"
            noWrap
            title={item.file.name}
            sx={{ fontWeight: 600, flex: 1, minWidth: 0 }}
          >
            {item.file.name}
          </Typography>
          <Chip
            size="small"
            variant="outlined"
            color={STATUS_CHIP_COLOR[item.status]}
            label={t(`upload.status.${item.status}`)}
          />
        </Stack>
        <LinearProgress
          variant="determinate"
          value={item.progress}
          color={PROGRESS_COLOR[item.status] ?? 'primary'}
          sx={{ borderRadius: 2 }}
        />
        <Stack
          direction="row"
          justifyContent="space-between"
          spacing={1}
          sx={{ mt: 0.5 }}
        >
          <Typography
            variant="caption"
            color={MESSAGE_COLOR[item.status] ?? 'text.secondary'}
            noWrap
            title={item.message}
            sx={{ minWidth: 0 }}
          >
            {item.message ?? ''}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ whiteSpace: 'nowrap' }}
          >
            {formatBytes(item.bytesSent)} / {formatBytes(item.totalBytes)} •{' '}
            {item.progress}%
          </Typography>
        </Stack>
      </Box>
      <Stack direction="row" spacing={0.5}>
        <RowActions item={item} {...actions} />
      </Stack>
    </ListItem>
  );
};
