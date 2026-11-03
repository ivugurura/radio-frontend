import { graphql } from '../generated';

export const UPDATE_PROFILE = graphql(`
  mutation UpdateProfile(
    $firstName: String!
    $lastName: String!
    $userName: String!
    $email: String!
    $timezone: String!
    $currentPassword: String
  ) {
    updateProfile(
      firstName: $firstName
      lastName: $lastName
      userName: $userName
      email: $email
      timezone: $timezone
      currentPassword: $currentPassword
    ) {
      user {
        id
        email
        firstName
        lastName
        userName
        timezone
      }
    }
  }
`);

export const CHANGE_PASSWORD = graphql(`
  mutation ChangePassword($currentPassword: String!, $newPassword: String!) {
    changePassword(
      currentPassword: $currentPassword
      newPassword: $newPassword
    ) {
      token
      refreshToken
    }
  }
`);

export const UPDATE_STUDIO_SETTINGS = graphql(`
  mutation UpdateStudioSettings(
    $studioId: String!
    $displayName: String!
    $description: String!
    $autoNormalize: Boolean!
    $loudnessTargetLufs: Float!
  ) {
    updateStudioSettings(
      studioId: $studioId
      displayName: $displayName
      description: $description
      autoNormalize: $autoNormalize
      loudnessTargetLufs: $loudnessTargetLufs
    ) {
      studioSettings {
        studioId
        displayName
        description
        autoNormalize
        loudnessTargetLufs
        bitrateKbps
        sampleRateHz
        channels
        canEdit
      }
    }
  }
`);
