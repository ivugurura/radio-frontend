import React from 'react';
import { Box, IconButton, Stack, TextField, Typography } from '@mui/material';
import {
  SendRounded as SendRoundedIcon,
  ReplyRounded as ReplyRoundedIcon,
  CloseRounded as CloseRoundedIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import type { ChatMessagePayload } from '@libs/chat';
import { useAuthorLabel } from './utils';

type Props = {
  replyTarget: ChatMessagePayload | null;
  onCancelReply: () => void;
  onSend: (body: string, quotedMessageId?: string) => void;
};

export const ChatComposer: React.FC<Props> = ({
  replyTarget,
  onCancelReply,
  onSend,
}) => {
  const { t } = useTranslation('chat');
  const getAuthorLabel = useAuthorLabel();
  const [messageDraft, setMessageDraft] = React.useState('');

  const handleSend = () => {
    const trimmed = messageDraft.trim();
    if (!trimmed) return;
    onSend(trimmed, replyTarget?.id);
    setMessageDraft('');
    onCancelReply();
  };

  return (
    <>
      {replyTarget && (
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{
            px: 2,
            py: 1,
            borderTop: '1px solid',
            borderColor: 'divider',
            backgroundColor: 'action.hover',
          }}
        >
          <ReplyRoundedIcon fontSize="small" color="action" />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="caption" fontWeight={600} display="block">
              {t('replyingTo', { name: getAuthorLabel(replyTarget) })}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              noWrap
              display="block"
            >
              {replyTarget.body}
            </Typography>
          </Box>
          <IconButton size="small" onClick={onCancelReply}>
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </Stack>
      )}

      <Stack
        direction="row"
        spacing={1}
        alignItems="flex-end"
        sx={{ p: 1.5, borderTop: '1px solid', borderColor: 'divider' }}
      >
        <TextField
          fullWidth
          size="small"
          placeholder={t('typeMessage')}
          value={messageDraft}
          onChange={(event) => setMessageDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              handleSend();
            }
          }}
          multiline
          maxRows={3}
        />
        <IconButton
          onClick={handleSend}
          disabled={!messageDraft.trim()}
          color="primary"
          aria-label={t('sendMessage')}
        >
          <SendRoundedIcon fontSize="small" />
        </IconButton>
      </Stack>
    </>
  );
};

export default ChatComposer;
