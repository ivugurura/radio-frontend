import { graphql } from '../generated';

export const USER_PROFILE = graphql(`
  query UserProfile {
    me {
      id
      email
      firstName
      lastName
      userName
    }
  }
`);
