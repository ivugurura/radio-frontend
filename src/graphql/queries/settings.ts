import { graphql } from '../generated';

export const STUDIO_SETTINGS = graphql(`
  query StudioSettings($studioId: String!) {
    studioSettings(studioId: $studioId) {
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
`);
