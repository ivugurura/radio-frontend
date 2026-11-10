import { graphql } from '../generated';

export const ADD_STUDIO_MEMBER = graphql(`
  mutation AddStudioMember(
    $studioId: String!
    $email: String!
    $role: StudioRole!
  ) {
    addStudioMember(studioId: $studioId, email: $email, role: $role) {
      member {
        id
        role
      }
    }
  }
`);

export const UPDATE_STUDIO_MEMBER_ROLE = graphql(`
  mutation UpdateStudioMemberRole(
    $studioId: String!
    $userId: UUID!
    $role: StudioRole!
  ) {
    updateStudioMemberRole(studioId: $studioId, userId: $userId, role: $role) {
      member {
        id
        role
      }
    }
  }
`);

export const REMOVE_STUDIO_MEMBER = graphql(`
  mutation RemoveStudioMember($studioId: String!, $userId: UUID!) {
    removeStudioMember(studioId: $studioId, userId: $userId) {
      ok
    }
  }
`);
