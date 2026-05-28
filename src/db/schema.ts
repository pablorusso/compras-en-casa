import {
  pgTable,
  serial,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
  smallint,
  uniqueIndex,
  index,
  check,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// "stores" representa el lugar de compra: verdulería, supermercado, multipasta, etc.
// (Antes se llamaba "categories"; el nombre confundía con la categoría de producto.)
export const stores = pgTable("stores", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  emoji: text("emoji").notNull().default("🛒"),
  address: text("address"),
  sortOrder: integer("sort_order").notNull().default(0),
  excludeFromAutoAdd: boolean("exclude_from_auto_add").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// "categories" representa el tipo de producto dentro de un comercio:
// frutas, verduras, carnes, lácteos, etc. (Antes se llamaba "subcategories".)
export const categories = pgTable(
  "categories",
  {
    id: serial("id").primaryKey(),
    storeId: integer("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    emoji: text("emoji").notNull().default("🛒"),
    sortOrder: integer("sort_order").notNull().default(0),
    excludeFromAutoAdd: boolean("exclude_from_auto_add").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("categories_store_name_uniq").on(t.storeId, t.name)],
);

export const products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull().unique(),
    storeId: integer("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    categoryId: integer("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    defaultQuantityValue: numeric("default_quantity_value", {
      precision: 10,
      scale: 3,
    }).notNull(),
    defaultQuantityUnit: text("default_quantity_unit").notNull(),
    isSeasonal: boolean("is_seasonal").notNull().default(false),
    seasonMonths: smallint("season_months")
      .array()
      .notNull()
      .default(sql`'{}'::smallint[]`),
    archived: boolean("archived").notNull().default(false),
    excludeFromAutoAdd: boolean("exclude_from_auto_add").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("products_store_idx").on(t.storeId),
    index("products_category_idx").on(t.categoryId),
  ],
);

export const shoppingLists = pgTable(
  "shopping_lists",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    status: text("status").notNull().default("current"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("shopping_lists_status_chk", sql`${t.status} in ('current','archived')`),
    index("shopping_lists_status_idx").on(t.status),
  ],
);

export const shoppingListItems = pgTable(
  "shopping_list_items",
  {
    id: serial("id").primaryKey(),
    listId: integer("list_id")
      .notNull()
      .references(() => shoppingLists.id, { onDelete: "cascade" }),
    productId: integer("product_id").references(() => products.id, {
      onDelete: "set null",
    }),
    productName: text("product_name").notNull(),
    categoryId: integer("category_id"),
    categoryName: text("category_name"),
    categoryEmoji: text("category_emoji"),
    categorySortOrder: integer("category_sort_order").notNull().default(0),
    storeId: integer("store_id"),
    storeName: text("store_name"),
    storeEmoji: text("store_emoji"),
    storeAddress: text("store_address"),
    storeSortOrder: integer("store_sort_order").notNull().default(0),
    quantityValue: numeric("quantity_value", { precision: 10, scale: 3 }).notNull(),
    quantityUnit: text("quantity_unit").notNull(),
    notes: text("notes"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [
    uniqueIndex("shopping_list_items_list_product_uniq").on(t.listId, t.productId),
    index("shopping_list_items_list_idx").on(t.listId),
  ],
);

export const shareLinks = pgTable(
  "share_links",
  {
    id: serial("id").primaryKey(),
    listId: integer("list_id")
      .notNull()
      .references(() => shoppingLists.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("share_links_expires_idx").on(t.expiresAt)],
);

export const settings = pgTable(
  "settings",
  {
    id: integer("id").primaryKey().default(1),
    adminPasswordHash: text("admin_password_hash"),
    historyLimit: integer("history_limit").notNull().default(10),
    shareLinkTtlDays: integer("share_link_ttl_days").notNull().default(30),
    // Días de la semana en que se hace la compra (convención Date.getDay():
    // 0 = Domingo … 6 = Sábado). Define la fecha del nombre de la lista nueva.
    shoppingDays: smallint("shopping_days")
      .array()
      .notNull()
      .default(sql`'{}'::smallint[]`),
    // Comercio que se precarga al crear un producto nuevo. Nullable: si se
    // borra el comercio referenciado, queda en NULL automáticamente.
    defaultStoreId: integer("default_store_id").references(() => stores.id, {
      onDelete: "set null",
    }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check("settings_singleton_chk", sql`${t.id} = 1`)],
);

export const storesRelations = relations(stores, ({ many }) => ({
  categories: many(categories),
  products: many(products),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  store: one(stores, {
    fields: [categories.storeId],
    references: [stores.id],
  }),
  products: many(products),
}));

export const productsRelations = relations(products, ({ one }) => ({
  store: one(stores, {
    fields: [products.storeId],
    references: [stores.id],
  }),
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
}));

export const shoppingListsRelations = relations(shoppingLists, ({ many }) => ({
  items: many(shoppingListItems),
  shareLinks: many(shareLinks),
}));

export const shoppingListItemsRelations = relations(shoppingListItems, ({ one }) => ({
  list: one(shoppingLists, {
    fields: [shoppingListItems.listId],
    references: [shoppingLists.id],
  }),
  product: one(products, {
    fields: [shoppingListItems.productId],
    references: [products.id],
  }),
}));

export const shareLinksRelations = relations(shareLinks, ({ one }) => ({
  list: one(shoppingLists, {
    fields: [shareLinks.listId],
    references: [shoppingLists.id],
  }),
}));

export type Store = typeof stores.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Product = typeof products.$inferSelect;
export type ShoppingList = typeof shoppingLists.$inferSelect;
export type ShoppingListItem = typeof shoppingListItems.$inferSelect;
export type ShareLink = typeof shareLinks.$inferSelect;
export type Settings = typeof settings.$inferSelect;
