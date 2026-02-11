import { pool } from "./db.js";

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
  INSERT INTO "RevenueDaily" ("tenantId", "date", "total")
  SELECT
    "tenantId",
    $1::date AS date,
    SUM("amount") AS total
  FROM "RevenueEvent"
  WHERE "createdAt" >= $1::date
    AND "createdAt" < ($1::date + INTERVAL '1 day')
  GROUP BY "tenantId"
  ON CONFLICT ("tenantId", "date")
  DO UPDATE SET "total" = EXCLUDED."total";
`;

async function main() {
  const targetDate = getTargetDate();
  console.log(`Aggregating revenue for ${targetDate} (UTC)`);

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
