import React from 'react';
import {
  Avatar,
  Badge,
  Box,
  Fab,
  Grow,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  ForumRounded as ForumRoundedIcon,
  CloseRounded as CloseRoundedIcon,
  SendRounded as SendRoundedIcon,
  BlockRounded as BlockRoundedIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useStudioId } from '@components/providers';
import {
  getOrCreateListenerClientId,
  mergeChatMessages,
  chatMessageFromQueryRow,
} from '@libs/chat';
import type { ChatMessagePayload } from '@libs/chat';
import { useChatMessagesQuery } from '@graphql/hooks';
import { useChatSocket } from '../hooks/useChatSocket';

const LISTENER_NAME_KEY = 'listener-chat-name';

const formatTime = (isoOrTimestamp: string | number) =>
  new Date(isoOrTimestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

const getInitial = (name: string) => name.trim().charAt(0).toUpperCase() || '?';

const authorLabel = (
  message: ChatMessagePayload,
  labels: { studio: string; listener: string },
) => {
  if (message.authorType === 'ADMIN') {
    const first = message.author?.firstName?.trim();
    return first || labels.studio;
  }
  return message.listenerDisplayName || labels.listener;
};

const ListenerChat: React.FC = () => {
  const { t } = useTranslation('chat');
  const studioSlug = useStudioId();
  const roleLabels = {
    studio: t('roleStudio'),
    listener: t('roleListener'),
  };
  const [isOpen, setIsOpen] = React.useState(false);
  const [listenerName, setListenerName] = React.useState(
    () => window.localStorage.getItem(LISTENER_NAME_KEY) || '',
  );
  const [nameDraft, setNameDraft] = React.useState('');
  const [messageDraft, setMessageDraft] = React.useState('');
  const [listenerClientId] = React.useState(() => getOrCreateListenerClientId());
  const messagesEndRef = React.useRef<HTMLDivElement | null>(null);

  const hasName = Boolean(listenerName);

  const { data: historyData } = useChatMessagesQuery(
    hasName
      ? { variables: { studioSlug }, fetchPolicy: 'network-only' }
      : undefined,
  );

  const {
    messages: liveMessages,
    hiddenOverrides,
    selfMuted,
    sendMessage,
  } = useChatSocket({
    studioSlug,
    isAdmin: false,
    listenerClientId: hasName ? listenerClientId : undefined,
    listenerDisplayName: hasName ? listenerName : undefined,
  });

  const messages = React.useMemo(() => {
    const merged = mergeChatMessages(
      (historyData?.chatMessages ?? []).map(chatMessageFromQueryRow),
      liveMessages,
      hiddenOverrides,
    );
    // Listeners never see moderated content; the admin view greys it out instead.
    return merged.filter((message) => !message.isHidden);
  }, [historyData, liveMessages, hiddenOverrides]);

  React.useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleToggle = () => setIsOpen((prev) => !prev);

  const handleSaveName = () => {
    const trimmed = nameDraft.trim();
    if (!trimmed) return;
    window.localStorage.setItem(LISTENER_NAME_KEY, trimmed);
    setListenerName(trimmed);
  };

  const handleSend = () => {
    const trimmed = messageDraft.trim();
    if (!trimmed || selfMuted) return;

    sendMessage(trimmed);
    setMessageDraft('');
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        right: { xs: 16, sm: 24 },
        bottom: { xs: 16, sm: 24 },
        zIndex: 1300,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 2,
      }}
    >
      <Grow in={isOpen} unmountOnExit>
        <Paper
          elevation={0}
          sx={{
            width: { xs: 'calc(100vw - 32px)', sm: 340 },
            maxWidth: 340,
            height: 460,
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 3,
            overflow: 'hidden',
            border: '1px solid #d9e2ee',
            boxShadow: '0 18px 40px rgba(45, 87, 133, 0.22)',
          }}
        >
          <Box
            sx={{
              px: 2,
              py: 1.5,
              background: 'linear-gradient(180deg, #66b6ef 0%, #53a9e7 100%)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box>
              <Typography variant="subtitle1" fontWeight={700} lineHeight={1.2}>
                {t('widget.title')}
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: 'rgba(255, 255, 255, 0.85)' }}
              >
                {t('widget.subtitle')}
              </Typography>
            </Box>
            <IconButton
              onClick={handleToggle}
              aria-label={t('widget.close')}
              size="small"
              sx={{ color: '#fff' }}
            >
              <CloseRoundedIcon fontSize="small" />
            </IconButton>
          </Box>

          {hasName ? (
            <>
              <Box
                sx={{
                  flex: 1,
                  overflowY: 'auto',
                  px: 2,
                  py: 1.5,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1.25,
                  backgroundColor: '#f7fbff',
                }}
              >
                {messages.length === 0 ? (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    textAlign="center"
                    sx={{ mt: 4 }}
                  >
                    {t('noMessagesListener')}
                  </Typography>
                ) : (
                  messages.map((message) => {
                    const isSelf =
                      message.authorType === 'LISTENER' &&
                      message.listenerDisplayName === listenerName;

                    return (
                      <Stack
                        key={message.id}
                        direction="row"
                        spacing={1}
                        alignSelf={isSelf ? 'flex-end' : 'flex-start'}
                        sx={{ maxWidth: '85%' }}
                      >
                        {!isSelf && (
                          <Avatar
                            sx={{
                              width: 28,
                              height: 28,
                              fontSize: '0.75rem',
                              bgcolor: '#53a9e7',
                            }}
                          >
                            {getInitial(authorLabel(message, roleLabels))}
                          </Avatar>
                        )}
                        <Box>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{
                              display: 'block',
                              textAlign: isSelf ? 'right' : 'left',
                              mb: 0.25,
                            }}
                          >
                            {isSelf
                              ? t('widget.you')
                              : authorLabel(message, roleLabels)}{' '}
                            · {formatTime(message.createdAt)}
                          </Typography>
                          {message.quotedMessage && (
                            <Box
                              sx={{
                                px: 1.25,
                                py: 0.5,
                                mb: 0.5,
                                borderLeft: '3px solid #b8d6f0',
                                backgroundColor: 'rgba(83, 169, 231, 0.08)',
                                borderRadius: 1,
                              }}
                            >
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ display: 'block', fontWeight: 600 }}
                              >
                                {message.quotedMessage.author
                                  ? message.quotedMessage.author.firstName
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
                          <Box
                            sx={{
                              px: 1.5,
                              py: 1,
                              borderRadius: 2,
                              backgroundColor: isSelf ? '#53a9e7' : '#fff',
                              color: isSelf ? '#fff' : 'text.primary',
                              border: isSelf ? 'none' : '1px solid #e1e9f3',
                            }}
                          >
                            <Typography variant="body2">
                              {message.body}
                            </Typography>
                          </Box>
                        </Box>
                      </Stack>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </Box>

              {selfMuted && (
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  sx={{
                    px: 2,
                    py: 1,
                    borderTop: '1px solid #e1e9f3',
                    backgroundColor: '#fff6f6',
                  }}
                >
                  <BlockRoundedIcon fontSize="small" sx={{ color: '#c0392b' }} />
                  <Typography variant="caption" color="#c0392b">
                    {t('widget.mutedNow')}
                  </Typography>
                </Stack>
              )}

              <Stack
                direction="row"
                spacing={1}
                alignItems="flex-end"
                sx={{
                  p: 1.5,
                  borderTop: '1px solid #e1e9f3',
                  backgroundColor: '#fff',
                }}
              >
                <TextField
                  fullWidth
                  size="small"
                  placeholder={
                    selfMuted
                      ? t('widget.youAreMuted')
                      : t('widget.typeYourMessage')
                  }
                  value={messageDraft}
                  disabled={selfMuted}
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
                  disabled={!messageDraft.trim() || selfMuted}
                  aria-label={t('sendMessage')}
                  sx={{
                    backgroundColor: '#53a9e7',
                    color: '#fff',
                    '&:hover': { backgroundColor: '#4498d6' },
                    '&.Mui-disabled': {
                      backgroundColor: '#d9e2ee',
                      color: '#fff',
                    },
                  }}
                >
                  <SendRoundedIcon fontSize="small" />
                </IconButton>
              </Stack>
            </>
          ) : (
            <Stack
              spacing={1.5}
              sx={{ flex: 1, p: 2.5, justifyContent: 'center' }}
            >
              <Typography variant="body1" fontWeight={600}>
                {t('widget.joinTitle')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('identityPrompt')}
              </Typography>
              <TextField
                autoFocus
                size="small"
                label={t('widget.yourName')}
                value={nameDraft}
                onChange={(event) => setNameDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    handleSaveName();
                  }
                }}
              />
              <IconButton
                onClick={handleSaveName}
                disabled={!nameDraft.trim()}
                aria-label={t('widget.continue')}
                sx={{
                  alignSelf: 'flex-start',
                  px: 2,
                  borderRadius: 2,
                  backgroundColor: '#53a9e7',
                  color: '#fff',
                  '&:hover': { backgroundColor: '#4498d6' },
                  '&.Mui-disabled': {
                    backgroundColor: '#d9e2ee',
                    color: '#fff',
                  },
                }}
              >
                <Typography variant="body2" fontWeight={600} sx={{ px: 0.5 }}>
                  {t('widget.continue')}
                </Typography>
              </IconButton>
            </Stack>
          )}
        </Paper>
      </Grow>

      <Badge color="error" variant="dot" invisible={isOpen || messages.length === 0}>
        <Fab
          onClick={handleToggle}
          aria-label={isOpen ? t('widget.close') : t('widget.open')}
          sx={{
            background: 'linear-gradient(180deg, #66b6ef 0%, #53a9e7 100%)',
            color: '#fff',
            boxShadow: '0 10px 24px rgba(66, 142, 207, 0.35)',
            '&:hover': {
              background: 'linear-gradient(180deg, #6cbcf4 0%, #5aaeea 100%)',
            },
          }}
        >
          {isOpen ? (
            <CloseRoundedIcon />
          ) : (
            <ForumRoundedIcon />
          )}
        </Fab>
      </Badge>
    </Box>
  );
};

export default ListenerChat;
