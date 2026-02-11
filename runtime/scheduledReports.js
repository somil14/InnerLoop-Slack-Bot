import { WebClient } from "@slack/web-api";
import { pool } from "./db.js";

const SUPPORTED_TYPES = new Set(["executive_summary"]);

async function sendMessage(token, channel, text) {
  if (!token || !channel) return;
  const client = new WebClient(token);
  await client.chat.postMessage({ channel, text });
}

async function getRevenueMetrics(tenantId) {
  const revenue7d = await pool.query(
    `
      SELECT COALESCE(SUM("total"), 0) AS revenue
      FROM "RevenueDaily"
      WHERE "tenantId" = $1
        AND "date" >= CURRENT_DATE - INTERVAL '6 days'
        AND "date" <= CURRENT_DATE
    `,
    [tenantId]
  );

  const revenue30d = await pool.query(
    `
      SELECT COALESCE(SUM("total"), 0) AS revenue
      FROM "RevenueDaily"
      WHERE "tenantId" = $1
        AND "date" >= CURRENT_DATE - INTERVAL '29 days'
        AND "date" <= CURRENT_DATE
    `,
    [tenantId]
  );

  const wow = await pool.query(
    `
      WITH last_14 AS (
        SELECT "date", "total"
        FROM "RevenueDaily"
        WHERE "tenantId" = $1
          AND "date" >= CURRENT_DATE - INTERVAL '13 days'
          AND "date" <= CURRENT_DATE
      )
      SELECT
        COALESCE(SUM(CASE WHEN "date" >= CURRENT_DATE - INTERVAL '6 days' THEN "total" END), 0) AS this_week,
        COALESCE(SUM(CASE WHEN "date" < CURRENT_DATE - INTERVAL '6 days' THEN "total" END), 0) AS last_week
      FROM last_14
    `,
    [tenantId]
  );

  return {
    revenue7d: Number(revenue7d.rows?.[0]?.revenue ?? 0),
    revenue30d: Number(revenue30d.rows?.[0]?.revenue ?? 0),
    wowThis: Number(wow.rows?.[0]?.this_week ?? 0),
    wowLast: Number(wow.rows?.[0]?.last_week ?? 0),
  };
}

async function getUserMetrics(tenantId) {
  const users7d = await pool.query(
    `
      SELECT
        COALESCE(SUM("active"), 0) AS active,
        COALESCE(SUM("new"), 0) AS new
      FROM "UserDaily"
      WHERE "tenantId" = $1
        AND "date" >= CURRENT_DATE - INTERVAL '6 days'
        AND "date" <= CURRENT_DATE
    `,
    [tenantId]
  );

  return {
    active7d: Number(users7d.rows?.[0]?.active ?? 0),
    new7d: Number(users7d.rows?.[0]?.new ?? 0),
  };
}

function formatExecutiveSummary(metrics) {
  const wowDelta = metrics.wowLast > 0
    ? ((metrics.wowThis - metrics.wowLast) / metrics.wowLast) * 100
    : null;
  const wowText =
    wowDelta === null
      ? "n/a"
      : `${wowDelta >= 0 ? "+" : ""}${wowDelta.toFixed(1)}%`;

  return (
    `📊 Daily Executive Summary\n` +
    `• Revenue (7d): $${metrics.revenue7d.toFixed(2)}\n` +
    `• Revenue (30d): $${metrics.revenue30d.toFixed(2)}\n` +
    `• WoW: ${wowText} (this week $${metrics.wowThis.toFixed(2)} vs last week $${metrics.wowLast.toFixed(2)})\n` +
    `• Active users (7d): ${metrics.active7d}\n` +
    `• New users (7d): ${metrics.new7d}`
  );
}

async function main() {
  const frequency = process.env.REPORT_FREQUENCY || "daily";
  const reports = await pool.query(
    `
      SELECT "ScheduledReport"."id", "ScheduledReport"."tenantId", "ScheduledReport"."frequency",
             "ScheduledReport"."channelId", "ScheduledReport"."type",
             "Tenant"."botToken"
      FROM "ScheduledReport"
      JOIN "Tenant" ON "Tenant"."id" = "ScheduledReport"."tenantId"
      WHERE "ScheduledReport"."active" = true
        AND "ScheduledReport"."frequency" = $1
    `,
    [frequency]
  );

  for (const report of reports.rows) {
    if (!SUPPORTED_TYPES.has(report.type)) {
      continue;
    }

    const metrics = {
      ...(await getRevenueMetrics(report.tenantId)),
      ...(await getUserMetrics(report.tenantId)),
    };

    const text = formatExecutiveSummary(metrics);
    await sendMessage(report.botToken, report.channelId, text);
  }
}

main()
  .catch((err) => {
    console.error("Scheduled report failed", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
