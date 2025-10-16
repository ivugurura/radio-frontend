import { graphql } from '../generated';

export const LOGIN_MUTATION = graphql(`
  mutation LoginUser($email: String!, $password: String!) {
    loginUser(email: $email, password: $password) {
      token
      restToken
      user {
        id
        email
        firstName
        lastName
      }
    }
  }
`);
