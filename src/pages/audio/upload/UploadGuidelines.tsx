import { Box, Stack, Typography } from '@mui/material';
import {
  TipsAndUpdatesOutlined as TipsIcon,
  GraphicEqOutlined as FormatIcon,
  LayersOutlined as BatchIcon,
  LabelOutlined as TagsIcon,
  WifiOutlined as ConnectionIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import {
  MAX_CONCURRENCY,
  RECOMMENDED_BATCH_SIZE,
  RECOMMENDED_MAX_FILE_SIZE,
  TARGET_BITRATE_KBPS,
  TARGET_SAMPLE_RATE_KHZ,
} from './constants';
import { formatBytes } from './utils';

const GUIDELINES = [
  { key: 'formats', icon: FormatIcon },
  { key: 'batch', icon: BatchIcon },
  { key: 'tags', icon: TagsIcon },
  { key: 'connection', icon: ConnectionIcon },
] as const;

const GUIDELINE_VALUES = {
  kbps: TARGET_BITRATE_KBPS,
  khz: TARGET_SAMPLE_RATE_KHZ,
  batch: RECOMMENDED_BATCH_SIZE,
  concurrency: MAX_CONCURRENCY,
  size: formatBytes(RECOMMENDED_MAX_FILE_SIZE),
};

export const UploadGuidelines = () => {
  const { t } = useTranslation('audio');

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 2,
        bgcolor: 'action.hover',
        alignSelf: 'start',
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.25 }}>
        <TipsIcon color="primary" fontSize="small" />
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {t('upload.guidelines.title')}
        </Typography>
      </Stack>
      <Stack spacing={1}>
        {GUIDELINES.map(({ key, icon: Icon }) => (
          <Stack key={key} direction="row" spacing={1}>
            <Icon
              fontSize="small"
              sx={{ color: 'text.secondary', mt: 0.125 }}
            />
            <Typography variant="body2" color="text.secondary">
              <Box
                component="span"
                sx={{ fontWeight: 600, color: 'text.primary' }}
              >
                {t(`upload.guidelines.${key}.title`)}:
              </Box>{' '}
              {t(`upload.guidelines.${key}.body`, GUIDELINE_VALUES)}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
};
