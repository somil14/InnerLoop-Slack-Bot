import { randomUUID } from "crypto";
import { WebClient } from "@slack/web-api";
import { pool } from "./db.js";

const THRESHOLD_RATIO = 0.8;

async function sendSlackAlert(token, channel, text) {
  if (!token || !channel) return;
  const client = new WebClient(token);
  await client.chat.postMessage({ channel, text });
}

async function main() {
  const tenants = await pool.query(
    `SELECT "id", "botToken", "alertChannelId" FROM "Tenant"`
  );

  for (const row of tenants.rows) {
    const tenantId = row.id;

    const todayRes = await pool.query(
      `
        SELECT COALESCE(SUM("total"), 0) AS today
        FROM "RevenueDaily"
        WHERE "tenantId" = $1
          AND "date" = CURRENT_DATE
      `,
      [tenantId]
    );
    const today = Number(todayRes.rows[0]?.today ?? 0);

    const baselineRes = await pool.query(
      `
        SELECT COALESCE(AVG("total"), 0) AS baseline
        FROM "RevenueDaily"
        WHERE "tenantId" = $1
          AND "date" >= CURRENT_DATE - INTERVAL '7 days'
          AND "date" < CURRENT_DATE
      `,
      [tenantId]
    );
    const baseline = Number(baselineRes.rows[0]?.baseline ?? 0);

    if (baseline <= 0 || today >= baseline * THRESHOLD_RATIO) {
      continue;
    }

    const existing = await pool.query(
      `
        SELECT 1
        FROM "Anomaly"
        WHERE "tenantId" = $1
          AND "type" = 'revenue_drop'
          AND "metric" = 'revenue'
          AND "createdAt"::date = CURRENT_DATE
        LIMIT 1
      `,
      [tenantId]
    );

    if (existing.rowCount > 0) {
      continue;
    }

    await pool.query(
      `
        INSERT INTO "Anomaly" ("id", "tenantId", "type", "metric", "value", "baseline")
        VALUES ($1, $2, 'revenue_drop', 'revenue', $3, $4)
      `,
      [randomUUID(), tenantId, today, baseline]
    );

    const pct = Math.round((1 - today / baseline) * 100);
    await sendSlackAlert(
      row.botToken,
      row.alertChannelId,
      `🚨 Revenue dropped ${pct}% vs 7-day average. Today: $${today.toFixed(
        2
      )}, baseline: $${baseline.toFixed(2)}.`
    );
  }
}

main()
  .catch((err) => {
    console.error("Anomaly detection failed", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
