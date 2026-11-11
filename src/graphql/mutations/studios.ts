import { graphql } from '../generated';

export const CREATE_STUDIO = graphql(`
  mutation CreateStudio(
    $studioId: String!
    $displayName: String!
    $description: String
    $ownerUserId: UUID
  ) {
    createStudio(
      studioId: $studioId
      displayName: $displayName
      description: $description
      ownerUserId: $ownerUserId
    ) {
      studio {
        studioId
        displayName
        isActive
      }
    }
  }
`);

export const SET_STUDIO_ACTIVE = graphql(`
  mutation SetStudioActive($studioId: String!, $active: Boolean!) {
    setStudioActive(studioId: $studioId, active: $active) {
      studio {
        studioId
        isActive
      }
    }
  }
`);
