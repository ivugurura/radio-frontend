import React from 'react';
import { BASE_API_URL } from '@libs/constants';
import { lStorage } from '@libs/constants';
import type {
  ChatClientEvent,
  ChatMessagePayload,
  ChatServerEvent,
} from '@libs/chat';

const MAX_BACKOFF_MS = 15000;
const INITIAL_BACKOFF_MS = 1000;

const buildWsUrl = (params: {
  studioSlug: string;
  isAdmin: boolean;
  listenerClientId?: string;
  listenerDisplayName?: string;
}): string => {
  const { studioSlug, isAdmin, listenerClientId, listenerDisplayName } =
    params;

  const httpBase = BASE_API_URL || window.location.origin;
  const wsBase = httpBase.replace(/^http/i, 'ws').replace(/\/+$/, '');

  const url = new URL(`${wsBase}/ws/studios/${studioSlug}/chat/`);

  if (isAdmin) {
    const token = lStorage.get();
    if (token) url.searchParams.set('token', token);
  } else {
    if (listenerClientId) {
      url.searchParams.set('listener_client_id', listenerClientId);
    }
    if (listenerDisplayName) {
      url.searchParams.set('display_name', listenerDisplayName);
    }
  }

  return url.toString();
};

export type ChatSocketStatus = 'connecting' | 'open' | 'closed';

type UseChatSocketParams = {
  studioSlug: string;
  isAdmin: boolean;
  listenerClientId?: string;
  listenerDisplayName?: string;
};

export type UseChatSocketResult = {
  status: ChatSocketStatus;
  messages: ChatMessagePayload[];
  mutedListenerIds: Set<string>;
  selfMuted: boolean;
  sendMessage: (body: string, quotedMessageId?: string) => void;
  hideMessage: (messageId: string) => void;
  unhideMessage: (messageId: string) => void;
  muteListener: (
    listenerClientId: string,
    opts?: { reason?: string; expiresInMinutes?: number },
  ) => void;
  unmuteListener: (listenerClientId: string) => void;
};

export function useChatSocket(
  params: UseChatSocketParams,
): UseChatSocketResult {
  const { studioSlug, isAdmin, listenerClientId, listenerDisplayName } =
    params;

  const [status, setStatus] = React.useState<ChatSocketStatus>('connecting');
  const [messages, setMessages] = React.useState<ChatMessagePayload[]>([]);
  const [mutedListenerIds, setMutedListenerIds] = React.useState<Set<string>>(
    () => new Set(),
  );
  const [selfMuted, setSelfMuted] = React.useState(false);

  const wsRef = React.useRef<WebSocket | null>(null);
  const pendingRef = React.useRef<ChatClientEvent[]>([]);
  const reconnectAttemptRef = React.useRef(0);
  const reconnectTimeoutRef = React.useRef<number | null>(null);
  const closedByEffectRef = React.useRef(false);

  const send = React.useCallback((event: ChatClientEvent) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(event));
    } else {
      pendingRef.current.push(event);
    }
  }, []);

  React.useEffect(() => {
    // Listener sessions must know who they are before connecting.
    if (!isAdmin && !listenerClientId) {
      return undefined;
    }

    closedByEffectRef.current = false;
    reconnectAttemptRef.current = 0;
    pendingRef.current = [];
    setMessages([]);
    setMutedListenerIds(new Set());
    setSelfMuted(false);

    const connect = () => {
      setStatus('connecting');
      const url = buildWsUrl({
        studioSlug,
        isAdmin,
        listenerClientId,
        listenerDisplayName,
      });
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        reconnectAttemptRef.current = 0;
        setStatus('open');
        if (pendingRef.current.length) {
          const queued = pendingRef.current;
          pendingRef.current = [];
          for (const event of queued) {
            ws.send(JSON.stringify(event));
          }
        }
      };

      ws.onmessage = (event) => {
        let parsed: ChatServerEvent | null = null;
        try {
          parsed = JSON.parse(event.data as string) as ChatServerEvent;
        } catch {
          return;
        }
        if (!parsed || typeof parsed.type !== 'string') return;

        switch (parsed.type) {
          case 'connected': {
            setSelfMuted(Boolean(parsed.isMuted));
            break;
          }
          case 'message_created': {
            const incoming = parsed.message;
            setMessages((prev) => {
              if (prev.some((m) => m.id === incoming.id)) return prev;
              return [...prev, incoming];
            });
            break;
          }
          case 'message_hidden': {
            const { messageId } = parsed;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === messageId ? { ...m, isHidden: true } : m,
              ),
            );
            break;
          }
          case 'message_unhidden': {
            const { messageId } = parsed;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === messageId ? { ...m, isHidden: false } : m,
              ),
            );
            break;
          }
          case 'listener_muted': {
            const { listenerClientId: mutedId } = parsed;
            setMutedListenerIds((prev) => new Set(prev).add(mutedId));
            if (!isAdmin && listenerClientId && mutedId === listenerClientId) {
              setSelfMuted(true);
            }
            break;
          }
          case 'listener_unmuted': {
            const { listenerClientId: unmutedId } = parsed;
            setMutedListenerIds((prev) => {
              const next = new Set(prev);
              next.delete(unmutedId);
              return next;
            });
            if (
              !isAdmin &&
              listenerClientId &&
              unmutedId === listenerClientId
            ) {
              setSelfMuted(false);
            }
            break;
          }
          case 'error':
            // Surfaced via status/selfMuted state; nothing else to do here.
            break;
          default:
            break;
        }
      };

      ws.onclose = () => {
        wsRef.current = null;
        setStatus('closed');
        if (closedByEffectRef.current) return;

        const attempt = reconnectAttemptRef.current + 1;
        reconnectAttemptRef.current = attempt;
        const delay = Math.min(
          MAX_BACKOFF_MS,
          INITIAL_BACKOFF_MS * 2 ** (attempt - 1),
        );
        reconnectTimeoutRef.current = window.setTimeout(connect, delay);
      };

      ws.onerror = () => {
        // onclose will fire right after; reconnect logic lives there.
      };
    };

    connect();

    return () => {
      closedByEffectRef.current = true;
      if (reconnectTimeoutRef.current !== null) {
        window.clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [studioSlug, isAdmin, listenerClientId, listenerDisplayName]);

  const sendMessage = React.useCallback(
    (body: string, quotedMessageId?: string) => {
      const trimmed = body.trim();
      if (!trimmed) return;
      send({
        type: 'send_message',
        body: trimmed,
        ...(quotedMessageId ? { quotedMessageId } : {}),
        ...(listenerDisplayName ? { displayName: listenerDisplayName } : {}),
      });
    },
    [send, listenerDisplayName],
  );

  const hideMessage = React.useCallback(
    (messageId: string) => {
      send({ type: 'hide_message', messageId });
    },
    [send],
  );

  const unhideMessage = React.useCallback(
    (messageId: string) => {
      send({ type: 'unhide_message', messageId });
    },
    [send],
  );

  const muteListener = React.useCallback(
    (
      targetListenerClientId: string,
      opts?: { reason?: string; expiresInMinutes?: number },
    ) => {
      send({
        type: 'mute_listener',
        listenerClientId: targetListenerClientId,
        ...(opts?.reason ? { reason: opts.reason } : {}),
        ...(opts?.expiresInMinutes !== undefined
          ? { expiresInMinutes: opts.expiresInMinutes }
          : {}),
      });
    },
    [send],
  );

  const unmuteListener = React.useCallback(
    (targetListenerClientId: string) => {
      send({ type: 'unmute_listener', listenerClientId: targetListenerClientId });
    },
    [send],
  );

  return {
    status,
    messages,
    mutedListenerIds,
    selfMuted,
    sendMessage,
    hideMessage,
    unhideMessage,
    muteListener,
    unmuteListener,
  };
}
