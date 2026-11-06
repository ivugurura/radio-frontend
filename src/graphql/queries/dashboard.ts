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
      uniqueToday
      uniqueYesterday
      uniqueLast7Days
      uniqueLast30Days
      uniqueLastMonth
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
    listenerOverview(studioId: $studioId) {
      activeNow
    }
  }
`);

export const STUDIO_CAPACITY = graphql(`
  query StudioCapacity($studioId: String!) {
    studioCapacity(studioId: $studioId) {
      listeningSeconds
      listeningSecondsQuota
      diskUsedGb
      diskQuotaGb
    }
  }
`);
