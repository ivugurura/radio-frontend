import { graphql } from '../generated';

export const USERS = graphql(`
  query Users($search: String, $status: UserStatus, $limit: Int, $offset: Int) {
    users(search: $search, status: $status, limit: $limit, offset: $offset) {
      totalCount
      items {
        id
        email
        firstName
        lastName
        userName
        phone
        isSuperuser
        status
        lastLogin
        createdAt
        studios {
          studioId
          displayName
          role
        }
      }
    }
  }
`);

export const ACCOUNT_LINK = graphql(`
  query AccountLink($token: String!) {
    accountLink(token: $token) {
      valid
      purpose
      email
      firstName
    }
  }
`);

export const AUTH_OPTIONS = graphql(`
  query AuthOptions {
    authOptions {
      passwordResetAvailable
    }
  }
`);
