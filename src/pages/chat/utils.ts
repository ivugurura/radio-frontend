import React from 'react';
import { useTranslation } from 'react-i18next';
import type { ChatMessagePayload } from '@libs/chat';
import type { ChatMutesQuery } from '@graphql/graphql';

export type ChatMuteResult = NonNullable<ChatMutesQuery['chatMutes']>[number];

export type MuteRow = {
  listenerClientId: string;
  reason: string | null;
  expiresAt: string | null;
  mutedByName: string | null;
};

export type MuteOptions = {
  reason?: string;
  expiresInMinutes?: number;
};

export const toMuteRow = (mute: ChatMuteResult): MuteRow => ({
  listenerClientId: mute.listenerClientId,
  reason: mute.reason || null,
  expiresAt: mute.expiresAt ?? null,
  mutedByName: mute.mutedBy
    ? `${mute.mutedBy.firstName} ${mute.mutedBy.lastName}`.trim()
    : null,
});

export const authorLabel = (
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

export const useAuthorLabel = () => {
  const { t } = useTranslation('chat');
  const studio = t('roleStudio');
  const listener = t('roleListener');
  return React.useCallback(
    (message: ChatMessagePayload) =>
      authorLabel(message, { studio, listener }),
    [studio, listener],
  );
};
