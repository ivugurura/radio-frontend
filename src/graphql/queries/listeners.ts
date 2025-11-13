import { graphql } from '../generated';

export const LISTENER_OVERVIEW = graphql(`
  query ListenerOverview(
    $studioId: String!
    $range: TimeRange = LAST_24_HOURS
  ) {
    listenerOverview(studioId: $studioId, range: $range) {
      studioId
      activeNow
      peakLastHour
      peakLast24h
      listenerMinutesLast24h
      countries {
        code
        count
      }
    }
  }
`);
