import { graphql } from '../generated';

/** Active studios; decides which studio each language plays. No login needed. */
export const PUBLIC_STUDIOS = graphql(`
  query PublicStudios {
    publicStudios {
      studioId
      displayName
    }
  }
`);

/** Every studio, for the superuser studio management page. */
export const STUDIOS = graphql(`
  query Studios {
    studios(includeInactive: true) {
      studioId
      displayName
      description
      isActive
      bitrateKbps
      sampleRateHz
      channels
      memberCount
      trackCount
      hasStreamingCredential
      createdAt
    }
    availableStudioSlugs
  }
`);
