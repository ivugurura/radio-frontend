import React from 'react';
import {
  Box,
  Divider,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { LockOpenRounded as LockOpenRoundedIcon } from '@mui/icons-material';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import type { MuteRow } from './utils';

type Props = {
  rows: MuteRow[];
  listenerNameByClientId: Map<string, string>;
  onUnmute: (listenerClientId: string) => void;
};

export const MutedListenersPanel: React.FC<Props> = ({
  rows,
  listenerNameByClientId,
  onUnmute,
}) => {
  const { t } = useTranslation('chat');

  return (
    <Paper elevation={0} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
      <Typography variant="h6" fontWeight={600} mb={1}>
        {t('mutedListeners')}
      </Typography>
      <Divider sx={{ mb: 1.5 }} />
      {rows.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {t('noMutedListeners')}
        </Typography>
      ) : (
        <Stack spacing={1.5}>
          {rows.map((row) => (
            <Box key={row.listenerClientId}>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="flex-start"
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    variant="body2"
                    fontWeight={600}
                    noWrap
                    title={row.listenerClientId}
                  >
                    {listenerNameByClientId.get(row.listenerClientId) ??
                      row.listenerClientId}
                  </Typography>
                  {row.reason && (
                    <Typography variant="caption" color="text.secondary">
                      {t('reason', { reason: row.reason })}
                    </Typography>
                  )}
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    display="block"
                  >
                    {row.expiresAt
                      ? t('mutedUntil', {
                          date: dayjs(row.expiresAt).format('MMM D, HH:mm'),
                        })
                      : t('mutedPermanent')}
                    {row.mutedByName ? ` · by ${row.mutedByName}` : ''}
                  </Typography>
                </Box>
                <Tooltip title={t('actions.unmute')}>
                  <IconButton
                    size="small"
                    onClick={() => onUnmute(row.listenerClientId)}
                  >
                    <LockOpenRoundedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Box>
          ))}
        </Stack>
      )}
    </Paper>
  );
};

export default MutedListenersPanel;
