import { App } from "@slack/bolt";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { classifyIntent } from "./intent.js";

neonConfig.webSocketConstructor = ws;
const databaseUrl = process.env.DATABASE_URL;
console.log("DATABASE_URL present:", Boolean(databaseUrl));
const pool = new Pool({ connectionString: databaseUrl });

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
    if (!databaseUrl) {
      await say("Database is not configured yet. Please set DATABASE_URL.");
      return;
    }

    const result = await pool.query(
      `SELECT COALESCE(SUM("amount"), 0) AS revenue
       FROM "RevenueEvent"
       WHERE "createdAt" >= NOW() - INTERVAL '7 days'`
    );
    const total = Number(result.rows?.[0]?.revenue ?? 0);

    await say(`📊 Revenue (last 7 days): $${total}`);
    return;
  }

  await say("🤔 I’m not sure yet, but I’m learning.");
});

(async () => {
  await app.start();
  console.log("⚡ InnerLoop Slack worker running");
})();
