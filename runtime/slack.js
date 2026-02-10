import { App } from "@slack/bolt";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { classifyIntent } from "./intent.js";

neonConfig.webSocketConstructor = ws;
const databaseUrl = process.env.DATABASE_URL;
console.log("DATABASE_URL present:", Boolean(databaseUrl));
const pool = new Pool({ connectionString: databaseUrl });
const adapter = new PrismaNeon(pool);
const prisma = new PrismaClient({ adapter });

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

    const since = new Date();
    since.setDate(since.getDate() - 7);

    const events = await prisma.revenueEvent.findMany({
      where: {
        createdAt: { gte: since },
      },
    });

    const total = events.reduce((sum, e) => sum + e.amount, 0);

    await say(`📊 Revenue (last 7 days): $${total}`);
    return;
  }

  await say("🤔 I’m not sure yet, but I’m learning.");
});

(async () => {
  await app.start();
  console.log("⚡ InnerLoop Slack worker running");
})();
