import { pool } from "./db.js";

// Placeholder aggregation until raw user/events ingestion exists.

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
  INSERT INTO "UserDaily" ("tenantId", "date", "active", "new")
  SELECT
    "tenantId",
    $1::date AS date,
    0 AS active,
    0 AS new
  FROM "Tenant"
  ON CONFLICT ("tenantId", "date")
  DO NOTHING;
`;

async function main() {
  const targetDate = getTargetDate();
  console.log(`Aggregating users for ${targetDate} (UTC)`);

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
