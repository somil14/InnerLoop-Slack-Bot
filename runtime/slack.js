import { App } from "@slack/bolt";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neon } from "@neondatabase/serverless";

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

  await say(`👋 I heard you say: "${message.text}"`);
});

(async () => {
  await app.start();
  console.log("⚡ InnerLoop Slack worker running");
})();
