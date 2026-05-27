import { AI_MODEL, getAiClient } from "@/lib/ai";

export type CategoryAction = "keep" | "delete" | "add";

export type RawCategorySuggestion = {
  name: string;
  action: CategoryAction;
  reason: string;
};

const SYSTEM_PROMPT =
  "You reorganize the CATEGORY taxonomy of a shop based on its real product list. " +
  "Respond ONLY with JSON. No prose, no markdown.";

function buildPrompt(
  storeName: string,
  currentCategories: string[],
  productNames: string[],
): string {
  const catList = currentCategories.length
    ? currentCategories.map((c) => `- ${c}`).join("\n")
    : "(no categories yet)";
  const prodList = productNames.map((p) => `- ${p}`).join("\n");
  return `Store: "${storeName}".

Current categories:
${catList}

Products sold here:
${prodList}

Suggest a better category taxonomy for THIS store given its products. For every
current category decide whether to "keep" or "delete" it, and propose new
categories to "add" when the products would be better grouped. Do NOT assign
products to categories — only reason about the taxonomy itself.

Return a JSON object of this exact shape:
{ "suggestions": [ { "name": "<category name>", "action": "keep|delete|add", "reason": "<short reason in Spanish>" } ] }
- For "keep" and "delete", "name" MUST be one of the current categories, copied verbatim.
- For "add", "name" is a NEW category that is not in the current list.
- Only suggest "delete" when a category is redundant, empty, or a worse fit than an added one.
- Only suggest "add" when several products clearly need a grouping that does not exist yet.
- "reason" is a single short sentence in Spanish.
- Do not invent products. Do not add explanations outside the JSON.`;
}

/**
 * Pide a la IA una propuesta de taxonomía de categorías para un comercio en base
 * a sus productos. Devuelve sugerencias crudas (mantener / borrar / agregar) sin
 * resolver contra la base. Tolerante a fallos: ante error, falta de
 * `GROQ_API_KEY` o sin productos devuelve `[]`, igual que `classifyProducts`.
 */
export async function suggestCategories(
  storeName: string,
  currentCategories: string[],
  productNames: string[],
): Promise<RawCategorySuggestion[]> {
  const ai = getAiClient();
  if (!ai || productNames.length === 0) return [];

  try {
    const completion = await ai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: buildPrompt(storeName, currentCategories, productNames),
        },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });
    const text = completion.choices[0]?.message?.content ?? "";
    const parsed = JSON.parse(text) as {
      suggestions?: { name?: unknown; action?: unknown; reason?: unknown }[];
    };
    const raw = Array.isArray(parsed.suggestions) ? parsed.suggestions : [];
    const out: RawCategorySuggestion[] = [];
    for (const s of raw) {
      const name = String(s.name ?? "").trim();
      const action = String(s.action ?? "").trim().toLowerCase();
      const reason = String(s.reason ?? "").trim();
      if (!name) continue;
      if (action !== "keep" && action !== "delete" && action !== "add") continue;
      out.push({ name, action, reason });
    }
    return out;
  } catch (err) {
    console.error("[categorize] suggestCategories falló:", err);
    return [];
  }
}
