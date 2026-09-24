import React from 'react';
import {
  Box,
  Chip,
  CircularProgress,
  Divider,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { ChatMessagePayload } from '@libs/chat';
import ChatMessageItem from './ChatMessageItem';
import { groupMessagesByDay, useDayLabel } from './utils';

type Props = {
  messages: ChatMessagePayload[];
  onReply: (message: ChatMessagePayload) => void;
  onToggleHide: (message: ChatMessagePayload) => void;
  onMute: (message: ChatMessagePayload) => void;
  hasMore: boolean;
  loadingOlder: boolean;
  onLoadOlder: () => void;
};

// Within this distance of the bottom, new messages keep the view pinned there.
const NEAR_BOTTOM_PX = 80;

export const ChatMessageList: React.FC<Props> = ({
  messages,
  onReply,
  onToggleHide,
  onMute,
  hasMore,
  loadingOlder,
  onLoadOlder,
}) => {
  const { t } = useTranslation('chat');
  const getDayLabel = useDayLabel();
  const dayGroups = React.useMemo(() => groupMessagesByDay(messages), [messages]);
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const topSentinelRef = React.useRef<HTMLDivElement | null>(null);
  const nearBottomRef = React.useRef(true);
  const snapshotRef = React.useRef<{
    firstId: string | null;
    lastId: string | null;
    scrollHeight: number;
  }>({ firstId: null, lastId: null, scrollHeight: 0 });

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    nearBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
  };

  // Runs before paint so prepending an older page never visibly jumps.
  React.useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const prev = snapshotRef.current;
    const firstId = messages[0]?.id ?? null;
    const lastId = messages[messages.length - 1]?.id ?? null;

    if (prev.lastId === null) {
      el.scrollTop = el.scrollHeight;
    } else if (lastId !== prev.lastId && nearBottomRef.current) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    } else if (firstId !== prev.firstId) {
      el.scrollTop += el.scrollHeight - prev.scrollHeight;
    }
    snapshotRef.current = { firstId, lastId, scrollHeight: el.scrollHeight };
  }, [messages]);

  React.useEffect(() => {
    const root = scrollRef.current;
    const target = topSentinelRef.current;
    if (!root || !target || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onLoadOlder();
      },
      { root, rootMargin: '200px 0px 0px 0px' },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, onLoadOlder]);

  return (
    <Box
      ref={scrollRef}
      onScroll={handleScroll}
      sx={{
        overflowAnchor: 'none',
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
        <>
          <Box
            ref={topSentinelRef}
            sx={{ display: 'flex', justifyContent: 'center', minHeight: 24 }}
          >
            {loadingOlder && <CircularProgress size={18} />}
            {!hasMore && (
              <Typography variant="caption" color="text.secondary">
                {t('startOfConversation')}
              </Typography>
            )}
          </Box>
          {dayGroups.map((group) => (
          <React.Fragment key={group.dayKey}>
            <Divider sx={{ my: 0.5 }}>
              <Chip
                label={getDayLabel(group.date)}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.7rem', color: 'text.secondary' }}
              />
            </Divider>
            {group.messages.map((message) => (
              <ChatMessageItem
                key={message.id}
                message={message}
                onReply={onReply}
                onToggleHide={onToggleHide}
                onMute={onMute}
              />
            ))}
          </React.Fragment>
          ))}
        </>
      )}
    </Box>
  );
};

export default ChatMessageList;
