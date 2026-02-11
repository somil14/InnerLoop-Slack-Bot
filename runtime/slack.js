import { App } from "@slack/bolt";
import { classifyIntent } from "./llm.js";
import { pool } from "./db.js";
import { HELP_TEXT } from "./help.js";
import { detectIntent } from "./intentMatcher.js";
import { getCache, setCache } from "./cache.js";
import { QUERY_SURFACE } from "./querySurface.js";
import { checkLimit, incrementUsage } from "./usage.js";

const REVENUE_INTENTS = QUERY_SURFACE?.intents || {};
const CACHE_TTL_SECONDS = QUERY_SURFACE?.cache?.ttlSeconds ?? 86400;

function normalizeText(text) {
  return text.trim().toLowerCase();
}

function getSqlForIntent(intentKey) {
  const intent = REVENUE_INTENTS[intentKey];
  return intent?.sqlTemplate?.trim() || null;
}

async function resolveTenant(teamId) {
  const tenantResult = await pool.query(
    `SELECT "id", "plan" FROM "Tenant" WHERE "slackTeamId" = $1 LIMIT 1`,
    [teamId]
  );
  return tenantResult.rows?.[0] || null;
}

const app = new App({
  appToken: process.env.SLACK_APP_TOKEN,
  token: process.env.SLACK_BOT_TOKEN,
  socketMode: true,
});

app.message(async ({ message, say, context }) => {
  if (!message || !("text" in message) || !message.text) return;

  const text = message.text || "";
  const intent = detectIntent(text);
  const normalizedText = normalizeText(text);

  if (normalizedText === "help") {
    await say(HELP_TEXT);
    return;
  }

  if (intent === "REVENUE") {
    const teamId = context?.teamId || message.team;
    if (!teamId) {
      await say("Missing team context. Please reinstall the app.");
      return;
    }

    const tenant = await resolveTenant(teamId);

    if (!tenant?.id) {
      await say("Workspace not registered. Please reinstall the app.");
      return;
    }
    const tenantId = tenant.id;

    const limit = await checkLimit(tenant.plan, tenantId, "queries");
    if (!limit.allowed) {
      await say(
        `⚠️ Query limit reached (${limit.used}/${limit.limit}). Please upgrade your plan.`
      );
      return;
    }

    const hardcodedIntent =
      normalizedText === "show revenue" ? "REVENUE_7D" : null;
    const cached = getCache(`${tenantId}:${normalizedText}`);
    let intentKey = hardcodedIntent || cached?.intent;
    let sql = intentKey ? getSqlForIntent(intentKey) : null;

    if (!sql) {
      try {
        const raw = await classifyIntent(text);
        let parsed;
        try {
          parsed = JSON.parse(raw);
        } catch {
          await say("⚠️ Could not understand the question. Try simpler wording.");
          return;
        }

        const llmIntent = parsed?.intent;
        if (!llmIntent || !REVENUE_INTENTS[llmIntent]) {
          await say("⚠️ I can only help with revenue questions right now.");
          return;
        }

        intentKey = llmIntent;
        sql = getSqlForIntent(intentKey);
        if (!sql) {
          await say("⚠️ Intent recognized but no SQL template found.");
          return;
        }
      } catch (err) {
        console.error("LLM error:", err);
        await say("⚠️ AI is temporarily unavailable. Try predefined commands.");
        return;
      }
    }

    const normalizedSql = sql.trim().toLowerCase();
    const banned = ["insert", "update", "delete", "drop", "alter", "create"];
    const isSelect = normalizedSql.startsWith("select");
    const hasBanned = banned.some((kw) => normalizedSql.includes(kw));
    const hasTenantFilter = normalizedSql.includes("tenantid") || normalizedSql.includes("tenant_id");

    if (!isSelect || hasBanned || !hasTenantFilter) {
      await say("Unsafe query blocked. Please ask a read-only question.");
      return;
    }

    if (!hardcodedIntent && !cached) {
      setCache(
        `${tenantId}:${normalizedText}`,
        { intent: intentKey },
        CACHE_TTL_SECONDS
      );
    }

    const result = await pool.query(sql, [tenantId]);
    const row = result.rows?.[0] || {};

    if (row.this_week !== undefined || row.last_week !== undefined) {
      await say(
        `📊 This week: $${row.this_week ?? 0}, last week: $${row.last_week ?? 0}`
      );
      await incrementUsage(tenantId, "queries", 1);
      return;
    }

    const value = row.revenue ?? row.sum ?? 0;
    await say(`📊 Result: $${value}`);
    await incrementUsage(tenantId, "queries", 1);
    return;
  }

  if (intent === "USERS") {
    await say("👥 User metrics are coming soon.");
    return;
  }

  if (intent === "EVENTS") {
    await say("📈 Events metrics are coming soon.");
    return;
  }

  await say("🤔 I’m not sure yet, but I’m learning.");
});

(async () => {
  await app.start();
  console.log("⚡ InnerLoop Slack worker running");
})();
