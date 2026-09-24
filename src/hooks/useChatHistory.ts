import React from 'react';
import { chatMessageFromQueryRow } from '@libs/chat';
import type { ChatMessagePayload } from '@libs/chat';
import { useChatMessagesLazyQuery, useChatMessagesQuery } from '@graphql/hooks';

export const CHAT_PAGE_SIZE = 10;

type OlderPages = {
  studioSlug: string;
  messages: ChatMessagePayload[];
  hasMore: boolean;
};

/**
 * Chat history paged backwards with the `before` cursor: the newest page loads
 * up front and `loadOlder` prepends the page before the oldest loaded message.
 */
export function useChatHistory(studioSlug: string) {
  const { data, error, loading } = useChatMessagesQuery({
    variables: { studioSlug, limit: CHAT_PAGE_SIZE },
    fetchPolicy: 'network-only',
  });
  const [fetchPage] = useChatMessagesLazyQuery({ fetchPolicy: 'network-only' });

  // Keyed by studio so switching language/studio starts from a clean slate.
  const [olderPages, setOlderPages] = React.useState<OlderPages | null>(null);
  const [loadingOlder, setLoadingOlder] = React.useState(false);
  const loadingOlderRef = React.useRef(false);

  const latestPage = React.useMemo(
    () => (data?.chatMessages ?? []).map(chatMessageFromQueryRow),
    [data],
  );
  const current = olderPages?.studioSlug === studioSlug ? olderPages : null;

  const messages = React.useMemo(
    () => (current ? [...current.messages, ...latestPage] : latestPage),
    [current, latestPage],
  );
  const hasMore = current
    ? current.hasMore
    : latestPage.length === CHAT_PAGE_SIZE;

  const loadOlder = React.useCallback(async () => {
    const oldest = messages[0];
    if (!oldest || !hasMore || loadingOlderRef.current) return;

    loadingOlderRef.current = true;
    setLoadingOlder(true);
    try {
      const result = await fetchPage({
        variables: {
          studioSlug,
          before: oldest.createdAt,
          limit: CHAT_PAGE_SIZE,
        },
      });
      if (result.error) return;
      const page = (result.data?.chatMessages ?? []).map(
        chatMessageFromQueryRow,
      );
      setOlderPages((prev) => ({
        studioSlug,
        messages: [
          ...page,
          ...(prev?.studioSlug === studioSlug ? prev.messages : []),
        ],
        hasMore: page.length === CHAT_PAGE_SIZE,
      }));
    } catch {
      // Leave hasMore untouched so scrolling back to the top retries.
    } finally {
      loadingOlderRef.current = false;
      setLoadingOlder(false);
    }
  }, [messages, hasMore, fetchPage, studioSlug]);

  return { messages, error, loading, loadingOlder, hasMore, loadOlder };
}
