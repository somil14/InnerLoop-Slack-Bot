import { App } from "@slack/bolt";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neon } from "@neondatabase/serverless";
import { classifyIntent } from "./intent.js";

const sql = neon(process.env.DATABASE_URL);
const adapter = new PrismaNeon(sql);
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
    await say("📊 Revenue questions are coming soon.");
    return;
  }

  await say("🤔 I’m not sure yet, but I’m learning.");
});

(async () => {
  await app.start();
  console.log("⚡ InnerLoop Slack worker running");
})();
