export const QUERY_SURFACE = {
  version: 1,
  rules: [
    "Read-only queries only",
    "Always filter by tenantId",
    "Prefer aggregates over raw events",
  ],
  entities: {
    revenue: {
      tables: ["RevenueDaily"],
      fields: ["date", "total"],
      timeGrains: ["day", "week", "month"],
      aggregations: ["sum", "avg"],
      defaultCurrency: "USD",
    },
    users: {
      tables: ["UserDaily"],
      fields: ["date", "active", "new"],
      timeGrains: ["day", "week", "month"],
      aggregations: ["sum", "avg"],
    },
    events: {
      tables: ["EventDaily"],
      fields: ["date", "event", "count"],
      timeGrains: ["day", "week"],
      aggregations: ["sum"],
    },
  },
  intents: {
    REVENUE_7D: {
      description: "Total revenue over the last 7 days",
      entity: "revenue",
      usesAggregate: true,
      requiredFilters: ["tenantId", "last_7_days"],
      sqlTemplate: `
        SELECT COALESCE(SUM("total"), 0) AS revenue
        FROM "RevenueDaily"
        WHERE "tenantId" = $1
          AND "date" >= (CURRENT_DATE - INTERVAL '6 days')
          AND "date" <= CURRENT_DATE
      `,
      examples: ["show revenue", "revenue last 7 days", "sales this week"],
    },
    REVENUE_30D: {
      description: "Total revenue over the last 30 days",
      entity: "revenue",
      usesAggregate: true,
      requiredFilters: ["tenantId", "last_30_days"],
      sqlTemplate: `
        SELECT COALESCE(SUM("total"), 0) AS revenue
        FROM "RevenueDaily"
        WHERE "tenantId" = $1
          AND "date" >= (CURRENT_DATE - INTERVAL '29 days')
          AND "date" <= CURRENT_DATE
      `,
      examples: ["revenue last month", "sales last 30 days"],
    },
    REVENUE_WOW: {
      description: "Week-over-week revenue comparison",
      entity: "revenue",
      usesAggregate: true,
      requiredFilters: ["tenantId", "last_14_days"],
      sqlTemplate: `
        WITH last_14 AS (
          SELECT "date", "total"
          FROM "RevenueDaily"
          WHERE "tenantId" = $1
            AND "date" >= (CURRENT_DATE - INTERVAL '13 days')
            AND "date" <= CURRENT_DATE
        )
        SELECT
          COALESCE(SUM(CASE WHEN "date" >= (CURRENT_DATE - INTERVAL '6 days') THEN "total" END), 0) AS this_week,
          COALESCE(SUM(CASE WHEN "date" < (CURRENT_DATE - INTERVAL '6 days') THEN "total" END), 0) AS last_week
        FROM last_14
      `,
      examples: ["compare revenue week over week", "revenue wow"],
    },
    USERS_7D: {
      description: "Active users over the last 7 days",
      entity: "users",
      usesAggregate: true,
      requiredFilters: ["tenantId", "last_7_days"],
      sqlTemplate: `
        SELECT COALESCE(SUM("active"), 0) AS active
        FROM "UserDaily"
        WHERE "tenantId" = $1
          AND "date" >= (CURRENT_DATE - INTERVAL '6 days')
          AND "date" <= CURRENT_DATE
      `,
      examples: ["active users", "users last 7 days"],
    },
    NEW_USERS_7D: {
      description: "New users over the last 7 days",
      entity: "users",
      usesAggregate: true,
      requiredFilters: ["tenantId", "last_7_days"],
      sqlTemplate: `
        SELECT COALESCE(SUM("new"), 0) AS new_users
        FROM "UserDaily"
        WHERE "tenantId" = $1
          AND "date" >= (CURRENT_DATE - INTERVAL '6 days')
          AND "date" <= CURRENT_DATE
      `,
      examples: ["new users last 7 days", "new users this week"],
    },
    EVENTS_COUNT_7D: {
      description: "Total events over the last 7 days",
      entity: "events",
      usesAggregate: true,
      requiredFilters: ["tenantId", "last_7_days"],
      sqlTemplate: `
        SELECT COALESCE(SUM("count"), 0) AS total_events
        FROM "EventDaily"
        WHERE "tenantId" = $1
          AND "date" >= (CURRENT_DATE - INTERVAL '6 days')
          AND "date" <= CURRENT_DATE
      `,
      examples: ["events count", "usage last 7 days", "activity this week"],
    },
    TOP_EVENTS_7D: {
      description: "Top events over the last 7 days",
      entity: "events",
      usesAggregate: true,
      requiredFilters: ["tenantId", "last_7_days"],
      sqlTemplate: `
        SELECT "event", COALESCE(SUM("count"), 0) AS total
        FROM "EventDaily"
        WHERE "tenantId" = $1
          AND "date" >= (CURRENT_DATE - INTERVAL '6 days')
          AND "date" <= CURRENT_DATE
        GROUP BY "event"
        ORDER BY total DESC
        LIMIT 5
      `,
      examples: ["top events", "top usage events", "most common events"],
    },
  },
  cache: {
    scope: "tenant",
    keys: ["intent", "normalizedQuestion"],
    ttlSeconds: 86400,
  },
};
