import { App } from "@slack/bolt";
import { classifyIntent } from "./intent.js";
import { nlToSql } from "./llm.js";
import { pool } from "./db.js";

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
    const sql = await nlToSql(text);
    const normalized = sql.trim().toLowerCase();
    const banned = ["insert", "update", "delete", "drop", "alter", "create"];
    const isSelect = normalized.startsWith("select");
    const hasBanned = banned.some((kw) => normalized.includes(kw));

    if (!isSelect || hasBanned) {
      await say("Unsafe query blocked. Please ask a read-only question.");
      return;
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
