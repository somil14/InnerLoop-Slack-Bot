import { pool } from "./db.js";

// Placeholder aggregation until raw events ingestion exists.

function getTargetDate() {
  if (process.env.AGGREGATE_DATE) {
    return process.env.AGGREGATE_DATE;
  }

  const now = new Date();
  const utcMidnight = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  );
  const yesterday = new Date(utcMidnight - 24 * 60 * 60 * 1000);
  return yesterday.toISOString().slice(0, 10);
}

const SQL = `
  INSERT INTO "EventDaily" ("tenantId", "date", "event", "count")
  SELECT
    t."id",
    $1::date AS date,
    e.event,
    0 AS count
  FROM "Tenant" t
  CROSS JOIN (
    VALUES ('page_view'), ('signup')
  ) AS e(event)
  ON CONFLICT ("tenantId", "date", "event")
  DO NOTHING;
`;

async function main() {
  const targetDate = getTargetDate();
  console.log(`Aggregating events for ${targetDate} (UTC)`);

  const result = await pool.query(SQL, [targetDate]);
  console.log(`Rows affected: ${result.rowCount ?? 0}`);
}

main()
  .catch((err) => {
    console.error("Aggregation failed", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
