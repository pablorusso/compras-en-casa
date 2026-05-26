import { canonicalize } from "./units";

export type ParsedProduct = {
  name: string;
  emoji: string;
  defaultQuantityValue: string;
  defaultQuantityUnit: string;
  isSeasonal: boolean;
  seasonMonths: number[];
  sourceLine: number;
};

export type ParsedCategory = {
  name: string;
  emoji: string;
  products: ParsedProduct[];
};

export type ParsedStore = {
  name: string;
  emoji: string;
  address: string | null;
  categories: ParsedCategory[];
  directProducts: ParsedProduct[];
};

export type ParseError = { line: number; message: string };

export type ParseResult =
  | { ok: true; stores: ParsedStore[] }
  | { ok: false; errors: ParseError[] };

const MONTH_MAP: Record<string, number> = {
  ene: 1, enero: 1,
  feb: 2, febrero: 2,
  mar: 3, marzo: 3,
  abr: 4, abril: 4,
  may: 5, mayo: 5,
  jun: 6, junio: 6,
  jul: 7, julio: 7,
  ago: 8, agosto: 8,
  sep: 9, sept: 9, septiembre: 9, set: 9,
  oct: 10, octubre: 10,
  nov: 11, noviembre: 11,
  dic: 12, diciembre: 12,
};

const UNIT_TOKEN_RE = /^(kg|kilos?|gr|g|gramos?|ml|mililitros?|litros?|l|paq\.?|paquetes?|latas?|cajas?|docenas?|atados?|maples?|unidades?|u|un)$/i;

function parseQtyToken(token: string): number | null {
  // "1/2" → 0.5
  if (/^\d+\/\d+$/.test(token)) {
    const [a, b] = token.split("/").map(Number);
    if (b === 0) return null;
    return a / b;
  }
  // "1,5" → 1.5
  const normalized = token.replace(",", ".");
  const n = Number(normalized);
  if (!Number.isFinite(n)) return null;
  return n;
}

function parseSeasonString(raw: string): number[] {
  const out = new Set<number>();
  // Normalizar dashes (en-dash, em-dash) a hyphen.
  const normalized = raw.replace(/[–—]/g, "-").toLowerCase();
  // Trocear por comas o "y".
  const parts = normalized.split(/[,;]|\s+y\s+/);
  for (const partRaw of parts) {
    const part = partRaw.trim();
    if (!part) continue;
    const rangeMatch = part.match(/^([a-záéíóú]+)\s*-\s*([a-záéíóú]+)$/);
    if (rangeMatch) {
      const start = MONTH_MAP[rangeMatch[1]];
      const end = MONTH_MAP[rangeMatch[2]];
      if (!start || !end) continue;
      let cur = start;
      // Loop con wrap-around (ej. nov-feb).
      for (let i = 0; i < 12; i++) {
        out.add(cur);
        if (cur === end) break;
        cur = cur === 12 ? 1 : cur + 1;
      }
      continue;
    }
    const single = MONTH_MAP[part];
    if (single) out.add(single);
  }
  return Array.from(out).sort((a, b) => a - b);
}

// Extrae el primer grapheme cluster (un emoji compuesto cuenta como uno solo).
const SEGMENTER =
  typeof Intl !== "undefined" && "Segmenter" in Intl
    ? new Intl.Segmenter("und", { granularity: "grapheme" })
    : null;

function extractEmojiAndName(text: string): { emoji: string; name: string } {
  const trimmed = text.trim();
  if (!trimmed) return { emoji: "🛒", name: "" };
  let firstGrapheme: string;
  if (SEGMENTER) {
    const it = SEGMENTER.segment(trimmed)[Symbol.iterator]();
    firstGrapheme = it.next().value?.segment ?? trimmed[0] ?? "";
  } else {
    firstGrapheme = trimmed[0] ?? "";
  }
  // Si el primer grapheme es ascii (letra), no es un emoji: no separamos.
  if (/^[A-Za-zÁÉÍÓÚáéíóúÑñ0-9]/.test(firstGrapheme)) {
    return { emoji: "🛒", name: trimmed };
  }
  const rest = trimmed.slice(firstGrapheme.length).trim();
  return { emoji: firstGrapheme, name: rest || firstGrapheme };
}

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toLocaleUpperCase("es") + s.slice(1);
}

function parseProductLine(
  body: string,
  lineNo: number,
): { product: Omit<ParsedProduct, "emoji"> } | { error: ParseError } {
  let raw = body.trim();

  // 1) Marcador estacional al final: *(temporada: ...)*
  let isSeasonal = false;
  let seasonMonths: number[] = [];
  const seasonMatch = raw.match(/\s*\*\(\s*temporada:\s*([^)]+?)\s*\)\*\s*$/i);
  if (seasonMatch) {
    raw = raw.slice(0, seasonMatch.index!).trim();
    isSeasonal = true;
    seasonMonths = parseSeasonString(seasonMatch[1]);
    if (seasonMonths.length === 0) {
      return {
        error: { line: lineNo, message: "Marcador de temporada inválido: " + seasonMatch[1] },
      };
    }
  }

  // 2) Cantidad al inicio. Si no hay número, asumo 1 unidad.
  let qty = 1;
  let rest = raw;
  const qtyMatch = raw.match(/^(\d+(?:\/\d+|[.,]\d+)?)\s+(.+)$/);
  if (qtyMatch) {
    const parsed = parseQtyToken(qtyMatch[1]);
    if (parsed == null || parsed <= 0) {
      return { error: { line: lineNo, message: "Cantidad inválida: " + qtyMatch[1] } };
    }
    qty = parsed;
    rest = qtyMatch[2];
  }

  // 3) Unidad opcional como siguiente token. Canonicalizo y aplico el factor
  //    multiplicador (docena ×12, maple ×30, etc.) sobre qty.
  let rawUnit = "unidad";
  const firstSpace = rest.indexOf(" ");
  const firstToken = firstSpace === -1 ? rest : rest.slice(0, firstSpace);
  if (UNIT_TOKEN_RE.test(firstToken)) {
    rawUnit = firstToken;
    rest = firstSpace === -1 ? "" : rest.slice(firstSpace + 1).trim();
  }
  const canon = canonicalize(qty, rawUnit);

  // 4) Quitar "de " inicial.
  rest = rest.replace(/^de\s+/i, "").trim();
  if (!rest) {
    return { error: { line: lineNo, message: "Falta el nombre del producto" } };
  }

  const name = capitalize(rest);

  return {
    product: {
      name,
      defaultQuantityValue: String(canon.value),
      defaultQuantityUnit: canon.unit,
      isSeasonal,
      seasonMonths,
      sourceLine: lineNo,
    },
  };
}

export function parseMarkdown(input: string): ParseResult {
  const lines = input.split(/\r?\n/);
  const errors: ParseError[] = [];
  const stores: ParsedStore[] = [];
  let currentStore: ParsedStore | null = null;
  let currentCategory: ParsedCategory | null = null;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();
    const lineNo = i + 1;
    if (!line) continue;

    // Comercio: "## emoji Nombre"
    if (line.startsWith("## ")) {
      const text = line.slice(3).trim();
      const { emoji, name } = extractEmojiAndName(text);
      if (!name) {
        errors.push({ line: lineNo, message: "Comercio sin nombre" });
        continue;
      }
      currentStore = { name, emoji, address: null, categories: [], directProducts: [] };
      currentCategory = null;
      stores.push(currentStore);
      continue;
    }

    // Header de mayor nivel: "# Lista" → ignorar.
    if (line.startsWith("# ")) continue;

    // Dirección opcional del comercio: "> Av. Cabildo 1234". Sólo se acepta antes
    // de cualquier categoría/producto del comercio actual; si se repite, gana la primera.
    if (line.startsWith("> ")) {
      if (
        currentStore &&
        !currentStore.address &&
        currentStore.categories.length === 0 &&
        currentStore.directProducts.length === 0
      ) {
        const addr = line.slice(2).trim();
        if (addr) currentStore.address = addr;
      }
      continue;
    }

    // Categoría: "**emoji Nombre**"
    const catMatch = line.match(/^\*\*(.+?)\*\*$/);
    if (catMatch) {
      if (!currentStore) {
        errors.push({
          line: lineNo,
          message: "Categoría fuera de cualquier comercio",
        });
        continue;
      }
      const { emoji, name } = extractEmojiAndName(catMatch[1]);
      if (!name) {
        errors.push({ line: lineNo, message: "Categoría sin nombre" });
        continue;
      }
      currentCategory = { name, emoji, products: [] };
      currentStore.categories.push(currentCategory);
      continue;
    }

    // Producto: "- [ ] ..." o "- [x] ..."
    const itemMatch = line.match(/^[-*]\s*\[(?:[ xX])\]\s+(.+)$/);
    if (itemMatch) {
      if (!currentStore) {
        errors.push({
          line: lineNo,
          message: "Producto fuera de cualquier comercio",
        });
        continue;
      }
      const parsed = parseProductLine(itemMatch[1], lineNo);
      if ("error" in parsed) {
        errors.push(parsed.error);
        continue;
      }
      // Emoji vacío = marcador "needs generation". El action de import lo resolverá
      // con generateEmoji por producto. Antes se heredaba el del padre, lo que hacía
      // que todos los productos de la misma categoría compartieran emoji.
      const product: ParsedProduct = { ...parsed.product, emoji: "" };
      if (currentCategory) {
        currentCategory.products.push(product);
      } else {
        currentStore.directProducts.push(product);
      }
      continue;
    }
  }

  // Validaciones globales: nombres únicos.
  if (errors.length === 0) {
    const storeNames = new Set<string>();
    const productNames = new Set<string>();
    for (const store of stores) {
      const lowered = store.name.toLowerCase();
      if (storeNames.has(lowered)) {
        errors.push({ line: 0, message: `Comercio duplicado: "${store.name}"` });
      }
      storeNames.add(lowered);

      const catNames = new Set<string>();
      for (const cat of store.categories) {
        const key = cat.name.toLowerCase();
        if (catNames.has(key)) {
          errors.push({
            line: 0,
            message: `Categoría duplicada "${cat.name}" dentro de "${store.name}"`,
          });
        }
        catNames.add(key);

        for (const p of cat.products) {
          const pk = p.name.toLowerCase();
          if (productNames.has(pk)) {
            errors.push({
              line: p.sourceLine,
              message: `Producto duplicado: "${p.name}"`,
            });
          }
          productNames.add(pk);
        }
      }
      for (const p of store.directProducts) {
        const pk = p.name.toLowerCase();
        if (productNames.has(pk)) {
          errors.push({
            line: p.sourceLine,
            message: `Producto duplicado: "${p.name}"`,
          });
        }
        productNames.add(pk);
      }
    }
  }

  if (errors.length > 0) return { ok: false, errors };
  if (stores.length === 0) {
    return {
      ok: false,
      errors: [{ line: 0, message: "No se detectó ningún comercio (usá '## Emoji Nombre')." }],
    };
  }
  return { ok: true, stores };
}

export function countParsed(stores: ParsedStore[]): {
  stores: number;
  categories: number;
  products: number;
} {
  let categories = 0;
  let products = 0;
  for (const s of stores) {
    categories += s.categories.length;
    products += s.directProducts.length;
    for (const c of s.categories) products += c.products.length;
  }
  return { stores: stores.length, categories, products };
}
