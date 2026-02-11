import { pool } from "./db.js";

const PLAN_LIMITS = {
  free: { queries: 50, reports: 0 },
  pro: { queries: 500, reports: 30 },
  scale: { queries: Infinity, reports: Infinity },
};

function monthKey(date = new Date()) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function getLimits(plan) {
  if (!plan) return PLAN_LIMITS.free;
  return PLAN_LIMITS[plan] || PLAN_LIMITS.free;
}

export async function ensureUsageRow(tenantId, month = monthKey()) {
  await pool.query(
    `
      INSERT INTO "Usage" ("id", "tenantId", "month", "queries", "reports")
      VALUES (gen_random_uuid(), $1, $2, 0, 0)
      ON CONFLICT ("tenantId", "month") DO NOTHING
    `,
    [tenantId, month]
  );
}

export async function getUsage(tenantId, month = monthKey()) {
  await ensureUsageRow(tenantId, month);
  const res = await pool.query(
    `SELECT "queries", "reports" FROM "Usage" WHERE "tenantId" = $1 AND "month" = $2`,
    [tenantId, month]
  );
  return res.rows?.[0] || { queries: 0, reports: 0 };
}

export async function incrementUsage(tenantId, field, amount = 1, month = monthKey()) {
  await ensureUsageRow(tenantId, month);
  await pool.query(
    `
      UPDATE "Usage"
      SET "${field}" = "${field}" + $1
      WHERE "tenantId" = $2 AND "month" = $3
    `,
    [amount, tenantId, month]
  );
}

export async function checkLimit(plan, tenantId, field) {
  const limits = getLimits(plan);
  const limit = limits[field];
  if (limit === Infinity) {
    return { allowed: true, limit, used: 0 };
  }

  const usage = await getUsage(tenantId);
  const used = usage[field] ?? 0;
  return { allowed: used < limit, limit, used };
}
