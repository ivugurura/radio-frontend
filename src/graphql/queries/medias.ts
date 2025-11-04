import { graphql } from '../generated';

export const TRACKS_QUERY = graphql(`
  query Tracks(
    $studioSlug: String!
    $search: String
    $first: Int!
    $after: String
  ) {
    tracks(
      studioSlug: $studioSlug
      search: $search
      first: $first
      after: $after
    ) {
      totalCount
      pageInfo {
        endCursor
        hasNextPage
      }
      edges {
        node {
          id
          title
          artist
          album
          genre
          year
          state
          durationSeconds
          bitrateKbps
          processedRelPath
          createdAt
        }
      }
    }
  }
`);
