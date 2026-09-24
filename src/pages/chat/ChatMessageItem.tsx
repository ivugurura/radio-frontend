import React from 'react';
import {
  Box,
  Chip,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  ReplyRounded as ReplyRoundedIcon,
  VisibilityOffRounded as VisibilityOffRoundedIcon,
  VisibilityRounded as VisibilityRoundedIcon,
  BlockRounded as BlockRoundedIcon,
} from '@mui/icons-material';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import type { ChatMessagePayload } from '@libs/chat';
import { useAuthorLabel } from './utils';

type Props = {
  message: ChatMessagePayload;
  onReply: (message: ChatMessagePayload) => void;
  onToggleHide: (message: ChatMessagePayload) => void;
  onMute: (message: ChatMessagePayload) => void;
};

export const ChatMessageItem: React.FC<Props> = ({
  message,
  onReply,
  onToggleHide,
  onMute,
}) => {
  const { t } = useTranslation('chat');
  const getAuthorLabel = useAuthorLabel();
  const isHidden = message.isHidden ?? false;
  const isListener = message.authorType === 'LISTENER';

  const getBackgroundColor = () => {
    if (isHidden) return 'action.hover';
    if (isListener) return 'grey.50';
    return 'primary.50';
  };

  return (
    <Box
      sx={{
        px: 1.5,
        py: 1,
        borderRadius: 2,
        border: '1px solid',
        borderColor: isHidden ? 'divider' : 'transparent',
        backgroundColor: getBackgroundColor(),
        opacity: isHidden ? 0.6 : 1,
      }}
    >
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="flex-start"
        spacing={1}
      >
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="subtitle2" fontWeight={700}>
              {getAuthorLabel(message)}
            </Typography>
            <Chip
              label={isListener ? t('roleListener') : t('roleAdmin')}
              size="small"
              color={isListener ? 'default' : 'primary'}
              variant="outlined"
              sx={{ height: 18, fontSize: '0.65rem' }}
            />
            <Typography variant="caption" color="text.secondary">
              {dayjs(message.createdAt).format('HH:mm')}
            </Typography>
            {isHidden && (
              <Chip
                label={t('hiddenBadge')}
                size="small"
                color="warning"
                sx={{ height: 18, fontSize: '0.65rem' }}
              />
            )}
          </Stack>

          {message.quotedMessage && (
            <Box
              sx={{
                mt: 0.5,
                px: 1,
                py: 0.5,
                borderLeft: '3px solid',
                borderColor: 'divider',
                backgroundColor: 'background.paper',
                borderRadius: 1,
              }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', fontWeight: 600 }}
              >
                {message.quotedMessage.author
                  ? `${message.quotedMessage.author.firstName}`
                  : message.quotedMessage.listenerDisplayName}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {message.quotedMessage.body}
              </Typography>
            </Box>
          )}

          <Typography
            variant="body2"
            sx={{
              mt: 0.5,
              textDecoration: isHidden ? 'line-through' : 'none',
            }}
          >
            {message.body}
          </Typography>
        </Box>

        <Stack direction="row" spacing={0.5} flexShrink={0}>
          <Tooltip title={t('actions.reply')}>
            <IconButton size="small" onClick={() => onReply(message)}>
              <ReplyRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={isHidden ? t('actions.unhide') : t('actions.hide')}>
            <IconButton size="small" onClick={() => onToggleHide(message)}>
              {isHidden ? (
                <VisibilityRoundedIcon fontSize="small" />
              ) : (
                <VisibilityOffRoundedIcon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
          {isListener && (
            <Tooltip title={t('actions.mute')}>
              <IconButton size="small" onClick={() => onMute(message)}>
                <BlockRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      </Stack>
    </Box>
  );
};

export default ChatMessageItem;
