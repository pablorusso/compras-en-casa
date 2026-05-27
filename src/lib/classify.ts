import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { stores, categories } from "@/db/schema";
import { AI_MODEL, getAiClient } from "@/lib/ai";

export type ClassifyCategory = { id: number; name: string };
export type ClassifyProduct = { id: number; name: string };

const SYSTEM_PROMPT =
  "You classify supermarket/shop products into the provided categories. " +
  "Respond ONLY with JSON. No prose, no markdown.";

function buildPrompt(
  storeName: string,
  cats: ClassifyCategory[],
  prods: ClassifyProduct[],
): string {
  const catList = cats.map((c) => `- ${c.name}`).join("\n");
  const prodList = prods.map((p) => `- ${p.name}`).join("\n");
  return `Store: "${storeName}".

Allowed categories (use EXACTLY these names, copy them verbatim):
${catList}

Products to classify:
${prodList}

Return a JSON object of this exact shape:
{ "assignments": [ { "product": "<product name>", "category": "<one allowed category name, or empty string if none fits>" } ] }
- Include every product exactly once, copying its name verbatim.
- "category" MUST be one of the allowed names above, copied verbatim, or "" if no category fits.
- Do not invent categories. Do not add explanations.`;
}

/**
 * Clasifica productos dentro de las categorías permitidas usando la IA.
 * Devuelve un mapa `productId -> categoryId | null`, donde `null` significa
 * "sin categoría" (la IA no asignó, asignó algo fuera de la lista, o la
 * llamada falló). Tolerante a fallos: ante cualquier error devuelve todos
 * `null`, igual que `generateEmoji`.
 */
export async function classifyProducts(
  storeName: string,
  cats: ClassifyCategory[],
  prods: ClassifyProduct[],
): Promise<Map<number, number | null>> {
  const result = new Map<number, number | null>();
  for (const p of prods) result.set(p.id, null);

  const ai = getAiClient();
  if (!ai || cats.length === 0 || prods.length === 0) return result;

  // Índice por nombre normalizado para resolver lo que devuelva la IA.
  const byName = new Map<string, number>();
  for (const c of cats) byName.set(c.name.trim().toLowerCase(), c.id);
  const productByName = new Map<string, number>();
  for (const p of prods) productByName.set(p.name.trim().toLowerCase(), p.id);

  try {
    const completion = await ai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildPrompt(storeName, cats, prods) },
      ],
      temperature: 0.2,
      response_format: { type: "json_object" },
    });
    const text = completion.choices[0]?.message?.content ?? "";
    const parsed = JSON.parse(text) as {
      assignments?: { product?: unknown; category?: unknown }[];
    };
    const assignments = Array.isArray(parsed.assignments)
      ? parsed.assignments
      : [];
    for (const a of assignments) {
      const prodName = String(a.product ?? "").trim().toLowerCase();
      const catName = String(a.category ?? "").trim().toLowerCase();
      const productId = productByName.get(prodName);
      if (productId === undefined) continue;
      const categoryId = catName ? (byName.get(catName) ?? null) : null;
      result.set(productId, categoryId);
    }
  } catch (err) {
    console.error("[classify] classifyProducts falló:", err);
    // result ya tiene todos null
  }
  return result;
}

/**
 * Resuelve la categoría a usar al crear un producto cuando el usuario no eligió
 * ninguna. Si ya hay categoría explícita la respeta; si el comercio no tiene
 * categorías devuelve `null`; de lo contrario le pide a la IA que clasifique el
 * único producto y devuelve el id resuelto (o `null` si no encaja).
 */
export async function resolveAutoCategoryId(
  storeId: number,
  productName: string,
  explicitCategoryId: number | null,
): Promise<number | null> {
  if (explicitCategoryId != null) return explicitCategoryId;

  const [store] = await db
    .select({ name: stores.name })
    .from(stores)
    .where(eq(stores.id, storeId))
    .limit(1);
  if (!store) return null;

  const cats = await db
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .where(eq(categories.storeId, storeId))
    .orderBy(asc(categories.sortOrder), asc(categories.name));
  if (cats.length === 0) return null;

  const map = await classifyProducts(store.name, cats, [
    { id: 0, name: productName },
  ]);
  return map.get(0) ?? null;
}
