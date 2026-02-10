import { App } from "@slack/bolt";
import { classifyIntent } from "./intent.js";
import { nlToSql } from "./llm.js";
import { pool } from "./db.js";

const sqlCache = new Map([
  [
    "show revenue",
    `SELECT COALESCE(SUM("amount"), 0) AS revenue
     FROM "RevenueEvent"
     WHERE "createdAt" >= NOW() - INTERVAL '7 days'`,
  ],
]);

function needsLLM(text) {
  const t = text.toLowerCase();
  return t.includes("revenue") || t.includes("sales") || t.includes("compare");
}

const app = new App({
  appToken: process.env.SLACK_APP_TOKEN,
  token: process.env.SLACK_BOT_TOKEN,
  socketMode: true,
});

app.message(async ({ message, say }) => {
  if (!message || !("text" in message) || !message.text) return;

  const text = message.text || "";
  const intent = classifyIntent(text);

  if (intent === "smalltalk") {
    await say("👋 Hey! How can I help you with your business data?");
    return;
  }

  if (intent === "revenue") {
    const normalizedText = text.trim().toLowerCase();
    const cached = sqlCache.get(normalizedText);
    let sql = cached;

    if (!sql) {
      if (!needsLLM(text)) {
        await say("I can help with revenue and metrics.");
        return;
      }

      try {
        sql = await nlToSql(text);
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

    if (!isSelect || hasBanned) {
      await say("Unsafe query blocked. Please ask a read-only question.");
      return;
    }

    if (!cached) {
      sqlCache.set(normalizedText, sql);
    }

    const result = await pool.query(sql);
    const value = result.rows?.[0]?.revenue ?? result.rows?.[0]?.sum ?? 0;
    await say(`📊 Result: $${value}`);
    return;
  }

  await say("🤔 I’m not sure yet, but I’m learning.");
});

(async () => {
  await app.start();
  console.log("⚡ InnerLoop Slack worker running");
})();
