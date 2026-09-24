import React from 'react';
import dayjs from 'dayjs';
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

export type MessageDayGroup = {
  dayKey: string;
  date: dayjs.Dayjs;
  messages: ChatMessagePayload[];
};

export const groupMessagesByDay = (
  messages: ChatMessagePayload[],
): MessageDayGroup[] => {
  const groups = new Map<string, MessageDayGroup>();
  for (const message of messages) {
    const date = dayjs(message.createdAt).startOf('day');
    const dayKey = date.format('YYYY-MM-DD');
    const group = groups.get(dayKey);
    if (group) {
      group.messages.push(message);
    } else {
      groups.set(dayKey, { dayKey, date, messages: [message] });
    }
  }
  return Array.from(groups.values());
};

// en-GB gives "Thu 22 Sept"; the year is only shown for past years.
const DAY_LABEL_LOCALES: Record<string, string> = { en: 'en-GB', rw: 'rw' };

export const useDayLabel = () => {
  const { t, i18n } = useTranslation('chat');
  const locale = DAY_LABEL_LOCALES[i18n.language] ?? i18n.language;
  return React.useCallback(
    (date: dayjs.Dayjs) => {
      const today = dayjs().startOf('day');
      if (date.isSame(today, 'day')) return t('today');
      if (date.isSame(today.subtract(1, 'day'), 'day')) return t('yesterday');
      const withYear = !date.isSame(today, 'year');
      return new Intl.DateTimeFormat(locale, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: withYear ? 'numeric' : undefined,
      }).format(date.toDate());
    },
    [t, locale],
  );
};
