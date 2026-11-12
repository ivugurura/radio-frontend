import { graphql } from '../generated';

export const INVITE_USER = graphql(`
  mutation InviteUser(
    $email: String!
    $firstName: String
    $lastName: String
    $studioId: String
    $role: StudioRole
  ) {
    inviteUser(
      email: $email
      firstName: $firstName
      lastName: $lastName
      studioId: $studioId
      role: $role
    ) {
      created
      inviteLink
      emailed
      user {
        id
        email
        isPending
      }
    }
  }
`);

export const UPDATE_USER = graphql(`
  mutation UpdateUser(
    $userId: UUID!
    $firstName: String!
    $lastName: String!
    $userName: String!
    $email: String!
    $phone: String
  ) {
    updateUser(
      userId: $userId
      firstName: $firstName
      lastName: $lastName
      userName: $userName
      email: $email
      phone: $phone
    ) {
      user {
        id
        email
        firstName
        lastName
        userName
        phone
      }
    }
  }
`);

export const SET_USER_ACTIVE = graphql(`
  mutation SetUserActive($userId: UUID!, $active: Boolean!) {
    setUserActive(userId: $userId, active: $active) {
      user {
        id
        status
      }
    }
  }
`);

export const SEND_PASSWORD_RESET = graphql(`
  mutation SendPasswordReset($userId: UUID!) {
    sendPasswordReset(userId: $userId) {
      purpose
      link
      emailed
    }
  }
`);

export const SIGN_OUT_USER = graphql(`
  mutation SignOutUser($userId: UUID!) {
    signOutUser(userId: $userId) {
      ok
    }
  }
`);

export const ACCEPT_INVITE = graphql(`
  mutation AcceptInvite($token: String!, $password: String!) {
    acceptInvite(token: $token, password: $password) {
      token
      refreshToken
    }
  }
`);

export const RESET_PASSWORD = graphql(`
  mutation ResetPassword($token: String!, $newPassword: String!) {
    resetPassword(token: $token, newPassword: $newPassword) {
      token
      refreshToken
    }
  }
`);

export const REQUEST_PASSWORD_RESET = graphql(`
  mutation RequestPasswordReset($email: String!) {
    requestPasswordReset(email: $email) {
      ok
    }
  }
`);
