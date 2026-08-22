import { graphql } from '../generated';

export const CHAT_MESSAGES = graphql(`
  query ChatMessages($studioSlug: String!, $before: DateTime, $limit: Int) {
    chatMessages(studioSlug: $studioSlug, before: $before, limit: $limit) {
      id
      authorType
      author {
        id
        firstName
        lastName
      }
      listenerClientId
      listenerDisplayName
      body
      quotedMessage {
        id
        body
        listenerDisplayName
        author {
          firstName
          lastName
        }
      }
      isHidden
      createdAt
    }
  }
`);

export const CHAT_MUTES = graphql(`
  query ChatMutes($studioSlug: String!) {
    chatMutes(studioSlug: $studioSlug) {
      id
      listenerClientId
      reason
      expiresAt
      mutedBy {
        firstName
        lastName
      }
      createdAt
    }
  }
`);
