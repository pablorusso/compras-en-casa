import { AI_MODEL, getAiClient } from "@/lib/ai";

const EMOJI_REGEX = /\p{Extended_Pictographic}/u;

function extractEmoji(text: string): string | null {
  if (!text) return null;
  const match = Array.from(text).find((ch) => EMOJI_REGEX.test(ch));
  return match ?? null;
}

export type EmojiKind = "store" | "category";

function buildPrompt(kind: EmojiKind, name: string): string {
  const role =
    kind === "store" ? "a store/shopping place" : "a type of product";
  return `Return ONE single Unicode emoji that visually represents ${role} named: "${name}".
- Only the emoji, no text, no quotes, no explanations.
- Prefer concrete and recognizable emojis (e.g. 🥩 for butcher shop, 🍌 for fruit, 🧼 for cleaning supplies).
- If you're not sure, use a generic one like 🛒.`;
}

const SYSTEM_PROMPT =
  "Respond with exactly one Unicode emoji. No text, no quotes, no explanations.";

/**
 * Devuelve un emoji para la entidad indicada, o `null` si la llamada al
 * proveedor falla o no produce un emoji válido. Los callers deciden qué
 * hacer ante `null` (ej. en creación usar "🛒", en regeneración preservar
 * el emoji existente).
 */
export async function generateEmoji(
  kind: EmojiKind,
  name: string,
): Promise<string | null> {
  const ai = getAiClient();
  if (!ai) return null;
  try {
    const result = await ai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildPrompt(kind, name) },
      ],
      temperature: 0.7,
      max_tokens: 512,
    });
    const text = result.choices[0]?.message?.content ?? "";
    return extractEmoji(text);
  } catch (err) {
    console.error("[emoji] generateEmoji falló:", err);
    return null;
  }
}
