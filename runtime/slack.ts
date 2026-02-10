import { App } from "@slack/bolt";
import { PrismaClient } from "@prisma/client";
import OpenAI from "openai";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true,
});

const ALLOWED_INTENTS = ["revenue", "churn", "leads", "unknown"] as const;
type AllowedIntent = (typeof ALLOWED_INTENTS)[number];

const SQL_TEMPLATES: Record<string, string> = {
  revenue_last_7_days: `
    SELECT sum(amount) as revenue
    FROM invoices
    WHERE created_at >= now() - interval '7 days'
  `,
};

async function classifyIntent(text: string): Promise<AllowedIntent> {
  if (!process.env.OPENAI_API_KEY) return "unknown";

  const prompt = [
    "Classify the user question into one of: revenue, churn, leads, unknown.",
    "Return only one word.",
    `Question: ${text}`,
  ].join("\n");

  const response = await openai.responses.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    input: prompt,
  });

  const output = response.output_text?.trim().toLowerCase() || "unknown";
  if (ALLOWED_INTENTS.includes(output as AllowedIntent)) {
    return output as AllowedIntent;
  }
  return "unknown";
}

function selectTemplate(intent: AllowedIntent): string | null {
  if (intent === "revenue") return SQL_TEMPLATES.revenue_last_7_days;
  return null;
}

async function summarizeResult(
  question: string,
  rows: unknown
): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    return `Result: ${JSON.stringify(rows)}`;
  }

  const prompt = [
    "Summarize the SQL result for the user in one short sentence.",
    `Question: ${question}`,
    `Result JSON: ${JSON.stringify(rows)}`,
  ].join("\n");

  const response = await openai.responses.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    input: prompt,
  });

  return response.output_text?.trim() || "Done.";
}

app.message(async ({ message, say }) => {
  if (!message || !("text" in message) || !message.text) return;

  const text = message.text.trim();
  const intent = await classifyIntent(text);
  const template = selectTemplate(intent);

  if (!template) {
    await say("I can only help with revenue, churn, or leads for now.");
    return;
  }

  const rows = await prisma.$queryRawUnsafe(template);
  const summary = await summarizeResult(text, rows);
  await say(summary);
});

(async () => {
  await app.start();
  console.log("⚡ Slack listener running");
})();
