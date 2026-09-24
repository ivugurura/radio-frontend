import React from 'react';
import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { ChatMessagePayload } from '@libs/chat';
import ChatMessageItem from './ChatMessageItem';

type Props = {
  messages: ChatMessagePayload[];
  onReply: (message: ChatMessagePayload) => void;
  onToggleHide: (message: ChatMessagePayload) => void;
  onMute: (message: ChatMessagePayload) => void;
};

export const ChatMessageList: React.FC<Props> = ({
  messages,
  onReply,
  onToggleHide,
  onMute,
}) => {
  const { t } = useTranslation('chat');
  const messagesEndRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  return (
    <Box
      sx={{
        flex: 1,
        overflowY: 'auto',
        px: 2,
        py: 1.5,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
      }}
    >
      {messages.length === 0 ? (
        <Typography
          variant="body2"
          color="text.secondary"
          textAlign="center"
          sx={{ mt: 4 }}
        >
          {t('noMessages')}
        </Typography>
      ) : (
        messages.map((message) => (
          <ChatMessageItem
            key={message.id}
            message={message}
            onReply={onReply}
            onToggleHide={onToggleHide}
            onMute={onMute}
          />
        ))
      )}
      <div ref={messagesEndRef} />
    </Box>
  );
};

export default ChatMessageList;
