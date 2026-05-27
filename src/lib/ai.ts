import OpenAI from "openai";

/**
 * Cliente de IA compartido. Apunta a la API de Groq mediante el SDK de OpenAI.
 * Se instancia de forma perezosa y se cachea; devuelve `null` si no hay
 * `GROQ_API_KEY` configurada, de modo que los callers puedan degradar con
 * gracia (ver `generateEmoji` en `emoji.ts` o `classifyProducts` en
 * `classify.ts`).
 */

export const AI_MODEL = "openai/gpt-oss-120b";
const BASE_URL = "https://api.groq.com/openai/v1";

let client: OpenAI | null = null;

export function getAiClient(): OpenAI | null {
  if (!process.env.GROQ_API_KEY) return null;
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: BASE_URL,
    });
  }
  return client;
}
