import { graphql } from '../generated';

// Adding a member is `inviteUser` with a studio and role (mutations/users.ts).

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
