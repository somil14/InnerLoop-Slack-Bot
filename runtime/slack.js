import { App } from "@slack/bolt";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

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
