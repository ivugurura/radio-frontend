import React from 'react';
import { Alert, Container, Grid, Paper, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useStudioId } from '@components/providers';
import { mergeChatMessages } from '@libs/chat';
import type { ChatMessagePayload } from '@libs/chat';
import { useChatMutesQuery } from '@graphql/hooks';
import { useChatHistory } from '../../hooks/useChatHistory';
import { useChatSocket } from '../../hooks/useChatSocket';
import ChatComposer from './ChatComposer';
import ChatMessageList from './ChatMessageList';
import MuteDialog from './MuteDialog';
import MutedListenersPanel from './MutedListenersPanel';
import { useMuteRows } from './useMuteRows';
import { useAuthorLabel } from './utils';
import type { MuteOptions } from './utils';

const ChatPage: React.FC = () => {
  const { t } = useTranslation('chat');
  const studioSlug = useStudioId();
  const getAuthorLabel = useAuthorLabel();
  const [replyTarget, setReplyTarget] = React.useState<ChatMessagePayload | null>(
    null,
  );
  const [muteTarget, setMuteTarget] = React.useState<ChatMessagePayload | null>(
    null,
  );

  const {
    messages: historyMessages,
    error: historyError,
    hasMore,
    loadingOlder,
    loadOlder,
  } = useChatHistory(studioSlug);

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

  const { rows: muteRows, mute, unmute } = useMuteRows({
    mutesData,
    mutedListenerIds,
    muteListener,
    unmuteListener,
  });

  const messages = React.useMemo(
    () =>
      mergeChatMessages(historyMessages, liveMessages, hiddenOverrides),
    [historyMessages, liveMessages, hiddenOverrides],
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

  const handleToggleHide = (message: ChatMessagePayload) => {
    if (message.isHidden) {
      unhideMessage(message.id);
    } else {
      hideMessage(message.id);
    }
  };

  const handleConfirmMute = (opts: MuteOptions) => {
    if (!muteTarget) return;
    mute(muteTarget.listenerClientId, opts);
    setMuteTarget(null);
  };

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
            <ChatMessageList
              messages={messages}
              onReply={setReplyTarget}
              onToggleHide={handleToggleHide}
              onMute={setMuteTarget}
              hasMore={hasMore}
              loadingOlder={loadingOlder}
              onLoadOlder={loadOlder}
            />
            <ChatComposer
              replyTarget={replyTarget}
              onCancelReply={() => setReplyTarget(null)}
              onSend={sendMessage}
            />
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <MutedListenersPanel
            rows={muteRows}
            listenerNameByClientId={listenerNameByClientId}
            onUnmute={unmute}
          />
        </Grid>
      </Grid>

      <MuteDialog
        open={Boolean(muteTarget)}
        listenerName={muteTarget ? getAuthorLabel(muteTarget) : ''}
        onClose={() => setMuteTarget(null)}
        onConfirm={handleConfirmMute}
      />
    </Container>
  );
};

export default ChatPage;
