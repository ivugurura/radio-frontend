import React from 'react';
import { Paper, Box, Typography, Stack, Avatar } from '@mui/material';
import dayjs from 'dayjs';
import type { QueueItem } from '@graphql/graphql';

interface CurrentQueueSliderProps {
  items: QueueItem[];
  loading?: boolean;
}

export const CurrentQueueSlider: React.FC<CurrentQueueSliderProps> = ({
  items,
  loading,
}) => {
  return (
    <Paper variant="outlined" sx={{ p: 2, overflow: 'hidden' }}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={1}
      >
        <Typography variant="subtitle2">Currently</Typography>
        <Typography variant="caption" color="primary">
          Filter
        </Typography>
      </Box>
      {loading && items.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Loading queue…
        </Typography>
      ) : (
        <Stack direction="row" spacing={2} sx={{ overflowX: 'auto', pb: 1 }}>
          {items.map((it) => {
            const timeLabel = it.startedAt
              ? dayjs(it.startedAt).format('HH:mm')
              : '';
            const itemKey = `${it.id}-${it.startedAt ?? 'na'}-${
              it.isCurrent ? 'current' : 'past'
            }`;
            return (
              <Box
                key={itemKey}
                sx={{
                  width: 240,
                  minWidth: 240,
                  maxWidth: 240,
                  border: '1px solid',
                  borderColor: it.isCurrent ? 'warning.main' : 'divider',
                  borderRadius: 2,
                  p: 1,
                  flex: '0 0 240px',
                  bgcolor: it.isCurrent ? 'warning.light' : 'background.paper',
                }}
              >
                <Stack direction="row" spacing={1} alignItems="center">
                  <Avatar
                    src={it.coverUrl!}
                    variant="rounded"
                    sx={{ width: 24, height: 24, fontSize: 12 }}
                  >
                    {it.title?.slice(0, 1) || '?'}
                  </Avatar>
                  <Box flex={1} minWidth={0}>
                    <Typography
                      variant="caption"
                      fontWeight={600}
                      title={it.title}
                      sx={{
                        display: 'block',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '100%',
                      }}
                    >
                      {it.title}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      title={it.artist!}
                      sx={{
                        display: 'block',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '100%',
                      }}
                    >
                      {it.artist}
                    </Typography>
                  </Box>
                </Stack>
                <Box mt={0.5} textAlign="center">
                  <Typography
                    variant="caption"
                    sx={{
                      color: it.isCurrent ? 'warning.main' : 'text.secondary',
                    }}
                  >
                    {it.isCurrent ? 'Currently' : timeLabel}
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Stack>
      )}
    </Paper>
  );
};
