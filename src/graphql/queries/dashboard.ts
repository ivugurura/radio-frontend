import { graphql } from '../generated';

export const DASHBOARD_OVERVIEW = graphql(`
  query DashboardOverview($studioId: String!, $range: TimeRange = LAST_90_MIN) {
    listeningTrend(studioId: $studioId, range: $range) {
      points {
        ts
        active
      }
      peak {
        ts
        active
      }
    }
    listeningSummaryCount(studioId: $studioId) {
      today
      yesterday
      last7Days
      last30Days
      last30DaysChangePct
      prev30Days
      lastMonth
    }
    studioCapacity(studioId: $studioId) {
      listeningSeconds
      listeningSecondsQuota
      diskUsedGb
      diskQuotaGb
    }
    currentQueue(studioId: $studioId, limit: 4) {
      items {
        id
        title
        artist
        startedAt
        durationSec
        coverUrl
        isCurrent
      }
    }
  }
`);
