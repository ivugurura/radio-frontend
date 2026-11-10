import { graphql } from '../generated';

export const STUDIO_MEMBERS = graphql(`
  query StudioMembers($studioId: String!) {
    studioMembers(studioId: $studioId) {
      id
      role
      createdAt
      canManage
      user {
        id
        email
        firstName
        lastName
      }
    }
  }
`);
