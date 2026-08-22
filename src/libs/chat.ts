import type { ChatMessagesQuery } from '@graphql/graphql';

const LISTENER_CLIENT_ID_KEY = 'listener-chat-client-id';

/**
 * Reads the persisted listener client id from localStorage, creating and
 * persisting a fresh UUID the first time this is called on a device.
 * Mirrors the try/catch-safety used for `listener-chat-name` in
 * ListenerChat.tsx so a locked-down localStorage (private browsing, etc.)
 * degrades to an in-memory id instead of throwing.
 */
export const getOrCreateListenerClientId = (): string => {
  try {
    const existing = window.localStorage.getItem(LISTENER_CLIENT_ID_KEY);
    if (existing) return existing;

    const created = crypto.randomUUID();
    window.localStorage.setItem(LISTENER_CLIENT_ID_KEY, created);
    return created;
  } catch {
    return crypto.randomUUID();
  }
};

export type ChatAuthorType = 'ADMIN' | 'LISTENER';

export type ChatAuthor = {
  firstName: string;
  lastName: string;
};

export type ChatQuotedMessage = {
  id: string;
  body: string;
  listenerDisplayName: string;
  author: ChatAuthor | null;
};

export type ChatMessagePayload = {
  id: string;
  authorType: ChatAuthorType;
  author: ChatAuthor | null;
  listenerClientId: string;
  listenerDisplayName: string;
  body: string;
  quotedMessage: ChatQuotedMessage | null;
  createdAt: string;
  /** Not present on the wire event; tracked/patched client-side from
   * message_hidden / message_unhidden events (and seeded from the
   * `isHidden` field on history fetched via GraphQL). */
  isHidden?: boolean;
};

// ---- Server -> client events ------------------------------------------------

export type ChatConnectedEvent = {
  type: 'connected';
  isAdmin: boolean;
  listenerClientId: string | null;
  isMuted: boolean;
};

export type ChatMessageCreatedEvent = {
  type: 'message_created';
  message: ChatMessagePayload;
};

export type ChatMessageHiddenEvent = {
  type: 'message_hidden';
  messageId: string;
};

export type ChatMessageUnhiddenEvent = {
  type: 'message_unhidden';
  messageId: string;
};

export type ChatListenerMutedEvent = {
  type: 'listener_muted';
  listenerClientId: string;
  reason: string;
  expiresAt: string | null;
};

export type ChatListenerUnmutedEvent = {
  type: 'listener_unmuted';
  listenerClientId: string;
};

export type ChatErrorEvent = {
  type: 'error';
  code: 'muted' | 'invalid_body' | 'forbidden' | string;
};

export type ChatServerEvent =
  | ChatConnectedEvent
  | ChatMessageCreatedEvent
  | ChatMessageHiddenEvent
  | ChatMessageUnhiddenEvent
  | ChatListenerMutedEvent
  | ChatListenerUnmutedEvent
  | ChatErrorEvent;

// ---- Client -> server events ------------------------------------------------

export type ChatSendMessageEvent = {
  type: 'send_message';
  body: string;
  quotedMessageId?: string;
  displayName?: string;
};

export type ChatHideMessageEvent = {
  type: 'hide_message';
  messageId: string;
};

export type ChatUnhideMessageEvent = {
  type: 'unhide_message';
  messageId: string;
};

export type ChatMuteListenerEvent = {
  type: 'mute_listener';
  listenerClientId: string;
  reason?: string;
  expiresInMinutes?: number;
};

export type ChatUnmuteListenerEvent = {
  type: 'unmute_listener';
  listenerClientId: string;
};

export type ChatClientEvent =
  | ChatSendMessageEvent
  | ChatHideMessageEvent
  | ChatUnhideMessageEvent
  | ChatMuteListenerEvent
  | ChatUnmuteListenerEvent;

type ChatMessageQueryRow = NonNullable<
  ChatMessagesQuery['chatMessages']
>[number];

/**
 * Adapts a `chatMessages` GraphQL row (nullable/optional fields, as any
 * query result is) into the stricter `ChatMessagePayload` shape the chat UI
 * and the WebSocket layer share, so history and live messages can sit in
 * the same array.
 */
export const chatMessageFromQueryRow = (
  row: ChatMessageQueryRow,
): ChatMessagePayload => ({
  id: String(row.id),
  authorType: row.authorType,
  author: row.author
    ? { firstName: row.author.firstName, lastName: row.author.lastName }
    : null,
  listenerClientId: row.listenerClientId,
  listenerDisplayName: row.listenerDisplayName,
  body: row.body,
  quotedMessage: row.quotedMessage
    ? {
        id: String(row.quotedMessage.id),
        body: row.quotedMessage.body,
        listenerDisplayName: row.quotedMessage.listenerDisplayName,
        author: row.quotedMessage.author
          ? {
              firstName: row.quotedMessage.author.firstName,
              lastName: row.quotedMessage.author.lastName,
            }
          : null,
      }
    : null,
  createdAt: row.createdAt ?? '',
  isHidden: row.isHidden ?? false,
});

/**
 * Merges GraphQL-fetched message history with messages received live over
 * the socket this session, oldest-first, deduped by id (history wins ties
 * since it represents the persisted state as of page load).
 *
 * `hiddenOverrides` (from `useChatSocket`) is applied on top of every
 * message regardless of whether it came from history or the live socket —
 * a hide/unhide event can target a message that was seeded from history and
 * never passed through the socket's own message list, so the override has
 * to be layered in here rather than relying on either source alone.
 */
export const mergeChatMessages = (
  history: ChatMessagePayload[],
  live: ChatMessagePayload[],
  hiddenOverrides?: Map<string, boolean>,
): ChatMessagePayload[] => {
  const seen = new Set<string>();
  const merged: ChatMessagePayload[] = [];
  for (const message of [...history, ...live]) {
    if (seen.has(message.id)) continue;
    seen.add(message.id);
    const override = hiddenOverrides?.get(message.id);
    merged.push(
      override === undefined ? message : { ...message, isHidden: override },
    );
  }
  return merged;
};
