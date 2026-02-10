import { INTENTS } from "./intents.js";

export function detectIntent(text) {
  const lower = text.toLowerCase();

  for (const intent of INTENTS) {
    if (intent.patterns.some((p) => lower.includes(p))) {
      return intent.name;
    }
  }

  return "UNKNOWN";
}
