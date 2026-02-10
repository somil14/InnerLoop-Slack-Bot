import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function nlToSql(question) {
  const prompt = `
You are a SQL generator.

Rules:
- PostgreSQL only
- Read-only queries (SELECT)
- Use table: "RevenueEvent"("amount", "createdAt")
- Never explain
- Output ONLY SQL

User question:
"${question}"
`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0,
  });

  return response.choices[0].message.content.trim();
}
