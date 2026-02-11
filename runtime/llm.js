import OpenAI from "openai";
import { QUERY_SURFACE } from "./querySurface.js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function classifyIntent(question) {
  const intentKeys = Object.keys(QUERY_SURFACE.intents || {});
  const intentList = intentKeys.length > 0 ? intentKeys : ["UNKNOWN"];

  const prompt = `
You are an intent classifier for analytics queries.

Return ONLY valid JSON in this format:
{"intent":"REVENUE_7D"}

Allowed intents:
${intentList.map((i) => `- ${i}`).join("\n")}

If the question does not match any intent, return:
{"intent":"UNKNOWN"}

User question: "${question}"
`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0,
  });

  return response.choices[0].message.content.trim();
}
