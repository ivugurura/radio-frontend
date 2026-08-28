import { graphql } from '../generated';

export const REGENERATE_STREAMING_CREDENTIAL = graphql(`
  mutation RegenerateStreamingCredential($studioId: String!) {
    regenerateStreamingCredential(studioId: $studioId) {
      streamingConfig {
        studioId
        host
        port
        mount
        protocol
        username
        password
        format
        bitrateKbps
        sampleRateHz
        channels
        rotatedAt
      }
    }
  }
`);
