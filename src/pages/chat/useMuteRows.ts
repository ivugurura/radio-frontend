import React from 'react';
import dayjs from 'dayjs';
import type { ChatMutesQuery } from '@graphql/graphql';
import { toMuteRow } from './utils';
import type { MuteOptions, MuteRow } from './utils';

type Params = {
  mutesData: ChatMutesQuery | undefined;
  mutedListenerIds: Set<string>;
  muteListener: (listenerClientId: string, opts: MuteOptions) => void;
  unmuteListener: (listenerClientId: string) => void;
};

/**
 * Tracks the muted-listener panel: seeded from GraphQL, kept in sync with
 * live socket mute/unmute events, and updated optimistically on local actions.
 */
export const useMuteRows = ({
  mutesData,
  mutedListenerIds,
  muteListener,
  unmuteListener,
}: Params) => {
  const [muteRows, setMuteRows] = React.useState<Map<string, MuteRow>>(
    new Map(),
  );
  const prevMutedIdsRef = React.useRef<Set<string>>(new Set());

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

  const mute = (listenerClientId: string, opts: MuteOptions) => {
    muteListener(listenerClientId, opts);
    setMuteRows((prev) => {
      const next = new Map(prev);
      next.set(listenerClientId, {
        listenerClientId,
        reason: opts.reason ?? null,
        expiresAt:
          opts.expiresInMinutes != null
            ? dayjs().add(opts.expiresInMinutes, 'minute').toISOString()
            : null,
        mutedByName: null,
      });
      return next;
    });
    prevMutedIdsRef.current.add(listenerClientId);
  };

  const unmute = (listenerClientId: string) => {
    unmuteListener(listenerClientId);
    setMuteRows((prev) => {
      if (!prev.has(listenerClientId)) return prev;
      const next = new Map(prev);
      next.delete(listenerClientId);
      return next;
    });
    prevMutedIdsRef.current.delete(listenerClientId);
  };

  const rows = React.useMemo(() => Array.from(muteRows.values()), [muteRows]);

  return { rows, mute, unmute };
};
