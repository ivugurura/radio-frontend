import React from 'react';
import {
  Alert,
  Box,
  Chip,
  Container,
  Divider,
  Grid,
  IconButton,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  SendRounded as SendRoundedIcon,
  ReplyRounded as ReplyRoundedIcon,
  CloseRounded as CloseRoundedIcon,
  VisibilityOffRounded as VisibilityOffRoundedIcon,
  VisibilityRounded as VisibilityRoundedIcon,
  BlockRounded as BlockRoundedIcon,
  LockOpenRounded as LockOpenRoundedIcon,
} from '@mui/icons-material';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { useStudioId } from '@components/providers';
import { mergeChatMessages, chatMessageFromQueryRow } from '@libs/chat';
import type { ChatMessagePayload } from '@libs/chat';
import { useChatMessagesQuery, useChatMutesQuery } from '@graphql/hooks';
import type { ChatMutesQuery } from '@graphql/graphql';
import { useChatSocket } from '../../hooks/useChatSocket';
import MuteDialog from './MuteDialog';

type ChatMuteResult = NonNullable<ChatMutesQuery['chatMutes']>[number];

type MuteRow = {
  listenerClientId: string;
  reason: string | null;
  expiresAt: string | null;
  mutedByName: string | null;
};

const toMuteRow = (mute: ChatMuteResult): MuteRow => ({
  listenerClientId: mute.listenerClientId,
  reason: mute.reason || null,
  expiresAt: mute.expiresAt ?? null,
  mutedByName: mute.mutedBy
    ? `${mute.mutedBy.firstName} ${mute.mutedBy.lastName}`.trim()
    : null,
});

const authorLabel = (
  message: ChatMessagePayload,
  labels: { studio: string; listener: string },
) => {
  if (message.authorType === 'ADMIN') {
    const name = [message.author?.firstName, message.author?.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();
    return name || labels.studio;
  }
  return message.listenerDisplayName || labels.listener;
};

const ChatPage: React.FC = () => {
  const { t } = useTranslation('chat');
  const studioSlug = useStudioId();
  const roleLabels = {
    studio: t('roleStudio'),
    listener: t('roleListener'),
  };
  const [messageDraft, setMessageDraft] = React.useState('');
  const [replyTarget, setReplyTarget] = React.useState<ChatMessagePayload | null>(
    null,
  );
  const [muteTarget, setMuteTarget] = React.useState<ChatMessagePayload | null>(
    null,
  );
  const [muteRows, setMuteRows] = React.useState<Map<string, MuteRow>>(
    new Map(),
  );
  const prevMutedIdsRef = React.useRef<Set<string>>(new Set());
  const messagesEndRef = React.useRef<HTMLDivElement | null>(null);

  const { data: historyData, error: historyError } = useChatMessagesQuery({
    variables: { studioSlug },
    fetchPolicy: 'network-only',
  });

  const { data: mutesData, error: mutesError } = useChatMutesQuery({
    variables: { studioSlug },
    fetchPolicy: 'network-only',
  });

  const {
    messages: liveMessages,
    hiddenOverrides,
    mutedListenerIds,
    sendMessage,
    hideMessage,
    unhideMessage,
    muteListener,
    unmuteListener,
  } = useChatSocket({ studioSlug, isAdmin: true });

  // Seed muted-listener panel from GraphQL; the socket has no memory of past mutes.
  React.useEffect(() => {
    if (mutesData) {
      const mutes = mutesData.chatMutes ?? [];
      setMuteRows(new Map(mutes.map((m) => [m.listenerClientId, toMuteRow(m)])));
    }
  }, [mutesData]);

  // Keep the panel in sync with live mute/unmute events from any admin session.
  React.useEffect(() => {
    const prev = prevMutedIdsRef.current;
    setMuteRows((current) => {
      let changed = false;
      const next = new Map(current);
      mutedListenerIds.forEach((id) => {
        if (!prev.has(id) && !next.has(id)) {
          next.set(id, {
            listenerClientId: id,
            reason: null,
            expiresAt: null,
            mutedByName: null,
          });
          changed = true;
        }
      });
      prev.forEach((id) => {
        if (!mutedListenerIds.has(id) && next.has(id)) {
          next.delete(id);
          changed = true;
        }
      });
      return changed ? next : current;
    });
    prevMutedIdsRef.current = new Set(mutedListenerIds);
  }, [mutedListenerIds]);

  const messages = React.useMemo(
    () =>
      mergeChatMessages(
        (historyData?.chatMessages ?? []).map(chatMessageFromQueryRow),
        liveMessages,
        hiddenOverrides,
      ),
    [historyData, liveMessages, hiddenOverrides],
  );

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = () => {
    const trimmed = messageDraft.trim();
    if (!trimmed) return;
    sendMessage(trimmed, replyTarget?.id);
    setMessageDraft('');
    setReplyTarget(null);
  };

  const handleToggleHide = (message: ChatMessagePayload) => {
    if (message.isHidden) {
      unhideMessage(message.id);
    } else {
      hideMessage(message.id);
    }
  };

  const handleConfirmMute = (opts: {
    reason?: string;
    expiresInMinutes?: number;
  }) => {
    if (!muteTarget) return;
    const targetId = muteTarget.listenerClientId;
    muteListener(targetId, opts);
    setMuteRows((prev) => {
      const next = new Map(prev);
      next.set(targetId, {
        listenerClientId: targetId,
        reason: opts.reason ?? null,
        expiresAt:
          opts.expiresInMinutes != null
            ? dayjs().add(opts.expiresInMinutes, 'minute').toISOString()
            : null,
        mutedByName: null,
      });
      return next;
    });
    prevMutedIdsRef.current.add(targetId);
    setMuteTarget(null);
  };

  const handleUnmute = (listenerClientId: string) => {
    unmuteListener(listenerClientId);
    setMuteRows((prev) => {
      if (!prev.has(listenerClientId)) return prev;
      const next = new Map(prev);
      next.delete(listenerClientId);
      return next;
    });
    prevMutedIdsRef.current.delete(listenerClientId);
  };

  const muteRowsList = React.useMemo(
    () => Array.from(muteRows.values()),
    [muteRows],
  );

  // ChatMute has no display name; recover one from that listener's messages.
  const listenerNameByClientId = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const message of messages) {
      if (message.authorType === 'LISTENER' && message.listenerClientId) {
        map.set(message.listenerClientId, message.listenerDisplayName || 'Listener');
      }
    }
    return map;
  }, [messages]);

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Typography variant="h5" fontWeight={700} mb={2}>
        {t('title')}
      </Typography>

      {historyError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {t('historyLoadFailed', { message: historyError.message })}
        </Alert>
      )}
      {mutesError && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {t('mutesLoadFailed', { message: mutesError.message })}
        </Alert>
      )}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper
            elevation={0}
            variant="outlined"
            sx={{
              display: 'flex',
              flexDirection: 'column',
              height: 560,
              borderRadius: 2,
            }}
          >
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
                messages.map((message) => {
                  const isHidden = message.isHidden ?? false;
                  const isListener = message.authorType === 'LISTENER';

                  return (
                    <Box
                      key={message.id}
                      sx={{
                        px: 1.5,
                        py: 1,
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: isHidden ? 'divider' : 'transparent',
                        backgroundColor: isHidden
                          ? 'action.hover'
                          : isListener
                            ? 'grey.50'
                            : 'primary.50',
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
                              {authorLabel(message, roleLabels)}
                            </Typography>
                            <Chip
                              label={
                                isListener ? t('roleListener') : t('roleAdmin')
                              }
                              size="small"
                              color={isListener ? 'default' : 'primary'}
                              variant="outlined"
                              sx={{ height: 18, fontSize: '0.65rem' }}
                            />
                            <Typography variant="caption" color="text.secondary">
                              {dayjs(message.createdAt).format('MMM D, HH:mm')}
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
                            <IconButton
                              size="small"
                              onClick={() => setReplyTarget(message)}
                            >
                              <ReplyRoundedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip
                            title={
                              isHidden ? t('actions.unhide') : t('actions.hide')
                            }
                          >
                            <IconButton
                              size="small"
                              onClick={() => handleToggleHide(message)}
                            >
                              {isHidden ? (
                                <VisibilityRoundedIcon fontSize="small" />
                              ) : (
                                <VisibilityOffRoundedIcon fontSize="small" />
                              )}
                            </IconButton>
                          </Tooltip>
                          {isListener && (
                            <Tooltip title={t('actions.mute')}>
                              <IconButton
                                size="small"
                                onClick={() => setMuteTarget(message)}
                              >
                                <BlockRoundedIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Stack>
                      </Stack>
                    </Box>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </Box>

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
                    {t('replyingTo', {
                      name: authorLabel(replyTarget, roleLabels),
                    })}
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
                <IconButton size="small" onClick={() => setReplyTarget(null)}>
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
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Paper
            elevation={0}
            variant="outlined"
            sx={{ p: 2, borderRadius: 2 }}
          >
            <Typography variant="h6" fontWeight={600} mb={1}>
              {t('mutedListeners')}
            </Typography>
            <Divider sx={{ mb: 1.5 }} />
            {muteRowsList.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                {t('noMutedListeners')}
              </Typography>
            ) : (
              <Stack spacing={1.5}>
                {muteRowsList.map((row) => (
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
                                date: dayjs(row.expiresAt).format(
                                  'MMM D, HH:mm',
                                ),
                              })
                            : t('mutedPermanent')}
                          {row.mutedByName ? ` · by ${row.mutedByName}` : ''}
                        </Typography>
                      </Box>
                      <Tooltip title={t('actions.unmute')}>
                        <IconButton
                          size="small"
                          onClick={() => handleUnmute(row.listenerClientId)}
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
        </Grid>
      </Grid>

      <MuteDialog
        open={Boolean(muteTarget)}
        listenerName={muteTarget ? authorLabel(muteTarget, roleLabels) : ''}
        onClose={() => setMuteTarget(null)}
        onConfirm={handleConfirmMute}
      />
    </Container>
  );
};

export default ChatPage;
