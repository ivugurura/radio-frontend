import { graphql } from '../generated';

export const STREAMING_CONFIG = graphql(`
  query StreamingConfig($studioId: String!) {
    streamingConfig(studioId: $studioId) {
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
`);
