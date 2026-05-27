import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { groupItems, formatItemLabel } from "@/lib/format";
import type { GroupedItems } from "@/lib/format";
import type { ShoppingList, ShoppingListItem } from "@/db/schema";

// Layout en puntos PDF (1pt = 1/72"). Sin emojis y con Helvetica incorporada (soporta
// acentos y ñ), así no hay que embeber fuentes. Cada comercio ocupa el ancho completo;
// sus categorías se reparten en dos columnas balanceadas para ocupar menos hojas.
const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    lineHeight: 1.25,
    color: "#000",
    paddingTop: 24,
    paddingBottom: 34,
    paddingHorizontal: 32,
  },
  // Header repetido en cada hoja: va en el flujo (fixed) como primer hijo, no en
  // position:absolute (que en react-pdf 4 no se renderiza de forma fiable).
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 4,
    marginBottom: 8,
    borderBottomWidth: 0.75,
    borderBottomColor: "#000",
  },
  headerTitle: { fontFamily: "Helvetica-Bold", fontSize: 13 },
  store: { marginBottom: 10 },
  storeName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    paddingBottom: 2,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#000",
  },
  addr: { fontFamily: "Helvetica-Oblique", fontSize: 8.5, color: "#333", marginBottom: 4 },
  columns: { flexDirection: "row", justifyContent: "space-between" },
  column: { width: "48%" },
  block: { marginBottom: 6 },
  storeColBlock: { marginBottom: 8 },
  catName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: "#333",
    marginBottom: 2,
  },
  itemRow: { flexDirection: "row", alignItems: "flex-start", paddingVertical: 1 },
  checkbox: {
    width: 8,
    height: 8,
    marginTop: 1.5,
    marginRight: 5,
    borderWidth: 0.75,
    borderColor: "#000",
    borderRadius: 1,
  },
  itemLabel: { flex: 1 },
  note: { fontFamily: "Helvetica-Oblique", color: "#444" },
});

// --- Estimación determinística de alturas (en pt) para repartir las dos columnas ---
// Todo es de tamaño fijo, así que se puede estimar sin medir en runtime (sin fragilidad).
const COL_CHARS = 44; // caracteres aprox. por línea en una columna de ~48% de A4 a 10pt
const ITEM_LINE = 12.5; // alto de una línea de ítem (10pt * lineHeight 1.25)
const ITEM_PAD = 2; // paddingVertical del row
const TITLE_H = 12; // alto del título de categoría + su margen
const BLOCK_GAP = 6; // marginBottom del bloque
const STORE_NAME_H = 21; // alto del encabezado de comercio (nombre + borde + márgenes)
const ADDR_H = 15; // alto de la dirección

function itemHeight(item: ShoppingListItem): number {
  const label =
    formatItemLabel(item) + (item.notes ? ` (${item.notes})` : "");
  const lines = Math.max(1, Math.ceil(label.length / COL_CHARS));
  return lines * ITEM_LINE + ITEM_PAD;
}

type Block = {
  key: string;
  title: string | null;
  items: ShoppingListItem[];
  height: number;
};

function makeBlock(key: string, title: string | null, items: ShoppingListItem[]): Block {
  const itemsH = items.reduce((h, it) => h + itemHeight(it), 0);
  return { key, title, items, height: (title ? TITLE_H : 0) + itemsH + BLOCK_GAP };
}

function storeBlocks(store: GroupedItems[number]): Block[] {
  const blocks: Block[] = [];
  if (store.directItems.length > 0) {
    blocks.push(makeBlock("direct", null, store.directItems));
  }
  for (const cat of store.categories) {
    if (cat.items.length === 0) continue;
    blocks.push(makeBlock(String(cat.categoryId ?? cat.categoryName), cat.categoryName, cat.items));
  }
  return blocks;
}

// Reparte bloques en dos columnas buscando el punto medio de altura, preservando el orden:
// se llena la izquierda hasta cruzar la mitad y el resto va a la derecha. Así dos categorías
// chicas quedan juntas a la izquierda en vez de bajar debajo de ambas columnas.
function splitBlocks(blocks: Block[]): [Block[], Block[]] {
  const target = blocks.reduce((s, b) => s + b.height, 0) / 2;
  const left: Block[] = [];
  const right: Block[] = [];
  let lh = 0;
  let toRight = false;
  for (const b of blocks) {
    if (!toRight && (left.length === 0 || lh + b.height / 2 <= target)) {
      left.push(b);
      lh += b.height;
    } else {
      toRight = true;
      right.push(b);
    }
  }
  return [left, right];
}

// Parte los ítems de un único bloque en dos mitades por altura, para no desperdiciar la
// columna derecha cuando un comercio tiene una sola categoría (o solo ítems sueltos) larga.
function splitItems(items: ShoppingListItem[]): [ShoppingListItem[], ShoppingListItem[]] {
  const target = items.reduce((h, it) => h + itemHeight(it), 0) / 2;
  let acc = 0;
  let i = 0;
  for (; i < items.length; i++) {
    if (i > 0 && acc + itemHeight(items[i]) / 2 > target) break;
    acc += itemHeight(items[i]);
  }
  return [items.slice(0, i), items.slice(i)];
}

function columnsFor(store: GroupedItems[number]): [Block[], Block[]] {
  const hasCategories = store.categories.some((c) => c.items.length > 0);
  // Comercio sin categorías: se parten directamente sus ítems sueltos entre las dos
  // columnas (no hay bloques de categoría que repartir). Con un solo ítem, splitItems lo
  // deja todo a la izquierda (no hay nada que partir).
  if (!hasCategories) {
    const [li, ri] = splitItems(store.directItems);
    return [
      [makeBlock("direct-l", null, li)],
      ri.length > 0 ? [makeBlock("direct-r", null, ri)] : [],
    ];
  }
  // Con categorías: se reparten los bloques (ítems sueltos + cada categoría) por columnas,
  // manteniendo cada categoría entera.
  return splitBlocks(storeBlocks(store));
}

function storeColHeight(store: GroupedItems[number]): number {
  const itemsH = store.directItems.reduce((h, it) => h + itemHeight(it), 0);
  return STORE_NAME_H + (store.storeAddress ? ADDR_H : 0) + itemsH + BLOCK_GAP;
}

// Reparte comercios enteros en dos columnas por altura, preservando el orden (mismo
// criterio que splitBlocks pero a nivel comercio).
function splitStores(stores: GroupedItems): [GroupedItems, GroupedItems] {
  const heights = stores.map(storeColHeight);
  const target = heights.reduce((a, b) => a + b, 0) / 2;
  const left: GroupedItems = [];
  const right: GroupedItems = [];
  let lh = 0;
  let toRight = false;
  stores.forEach((s, i) => {
    if (!toRight && (left.length === 0 || lh + heights[i] / 2 <= target)) {
      left.push(s);
      lh += heights[i];
    } else {
      toRight = true;
      right.push(s);
    }
  });
  return [left, right];
}

type Section =
  | { type: "cat"; store: GroupedItems[number] }
  | { type: "nocat"; stores: GroupedItems };

// Agrupa la lista en secciones: cada comercio con categorías es su propia sección a ancho
// completo; las corridas de comercios consecutivos SIN categorías se juntan para poder
// acomodarlos enteros en dos columnas.
function buildSections(grouped: GroupedItems): Section[] {
  const sections: Section[] = [];
  for (const store of grouped) {
    const hasCats = store.categories.some((c) => c.items.length > 0);
    if (hasCats) {
      sections.push({ type: "cat", store });
      continue;
    }
    const last = sections[sections.length - 1];
    if (last && last.type === "nocat") last.stores.push(store);
    else sections.push({ type: "nocat", stores: [store] });
  }
  return sections;
}

function ItemRow({ item }: { item: ShoppingListItem }) {
  return (
    <View style={styles.itemRow} wrap={false}>
      <View style={styles.checkbox} />
      <Text style={styles.itemLabel}>
        {formatItemLabel(item)}
        {item.notes ? <Text style={styles.note}> ({item.notes})</Text> : null}
      </Text>
    </View>
  );
}

function BlockView({ block }: { block: Block }) {
  return (
    <View style={styles.block}>
      {block.title ? (
        // minPresenceAhead: si no entra el título con algo de contenido al pie de la hoja,
        // se baja entero a la siguiente (evita títulos huérfanos en saltos de página).
        <Text style={styles.catName} minPresenceAhead={TITLE_H + 2 * ITEM_LINE}>
          {block.title}
        </Text>
      ) : null}
      {block.items.map((item) => (
        <ItemRow key={item.id} item={item} />
      ))}
    </View>
  );
}

// Comercio a ancho completo: encabezado arriba y su contenido (categorías o ítems sueltos)
// repartido en dos columnas. Para comercios con categorías y para un comercio suelto aislado.
function FullWidthStore({ store }: { store: GroupedItems[number] }) {
  const [left, right] = columnsFor(store);
  return (
    <View style={styles.store}>
      {/* minPresenceAhead evita que el encabezado del comercio quede huérfano al pie. */}
      <Text style={styles.storeName} minPresenceAhead={28}>
        {store.storeName}
      </Text>
      {store.storeAddress ? <Text style={styles.addr}>{store.storeAddress}</Text> : null}
      <View style={styles.columns}>
        <View style={styles.column}>
          {left.map((b) => (
            <BlockView key={b.key} block={b} />
          ))}
        </View>
        <View style={styles.column}>
          {right.map((b) => (
            <BlockView key={b.key} block={b} />
          ))}
        </View>
      </View>
    </View>
  );
}

// Comercio entero como bloque de columna (encabezado + ítems), usado al empaquetar varios
// comercios sin categoría uno por columna.
function StoreColumnBlock({ store }: { store: GroupedItems[number] }) {
  return (
    <View style={styles.storeColBlock}>
      <Text style={styles.storeName} minPresenceAhead={28}>
        {store.storeName}
      </Text>
      {store.storeAddress ? <Text style={styles.addr}>{store.storeAddress}</Text> : null}
      {store.directItems.map((item) => (
        <ItemRow key={item.id} item={item} />
      ))}
    </View>
  );
}

// Varios comercios sin categoría: se acomodan enteros, uno por columna (Ritz a la izquierda,
// Ilulight a la derecha), en vez de ocupar cada uno una fila a ancho completo.
function NoCatGroup({ stores }: { stores: GroupedItems }) {
  const [left, right] = splitStores(stores);
  return (
    <View style={styles.store}>
      <View style={styles.columns}>
        <View style={styles.column}>
          {left.map((s) => (
            <StoreColumnBlock key={s.storeId ?? s.storeName} store={s} />
          ))}
        </View>
        <View style={styles.column}>
          {right.map((s) => (
            <StoreColumnBlock key={s.storeId ?? s.storeName} store={s} />
          ))}
        </View>
      </View>
    </View>
  );
}

export function ListPdfDocument({
  list,
  items,
}: {
  list: Pick<ShoppingList, "name">;
  items: ShoppingListItem[];
}) {
  const grouped = groupItems(items).filter(
    (s) => s.directItems.length > 0 || s.categories.some((c) => c.items.length > 0),
  );

  return (
    <Document title={`Compras en Casa - ${list.name}`}>
      <Page size="A4" style={styles.page}>
        {/* El footer (fecha + número de página) se estampa después con pdf-lib: el prop
            `render` de react-pdf 4.5 no se pinta, así que el número de página no puede
            generarse acá. Ver stampFooter en render-list-pdf. */}
        <View style={styles.header} fixed>
          <Text style={styles.headerTitle}>{list.name}</Text>
        </View>

        {buildSections(grouped).map((section, i) =>
          section.type === "cat" ? (
            <FullWidthStore key={i} store={section.store} />
          ) : section.stores.length === 1 ? (
            // Un único comercio sin categoría aislado: ancho completo, ítems en dos columnas.
            <FullWidthStore key={i} store={section.stores[0]} />
          ) : (
            // Varios comercios sin categoría seguidos: enteros, uno por columna.
            <NoCatGroup key={i} stores={section.stores} />
          ),
        )}
      </Page>
    </Document>
  );
}
