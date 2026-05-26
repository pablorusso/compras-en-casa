-- Rename `categories` (lugar de compra) → `stores`,
-- y `subcategories` (tipo de producto) → `categories`.
-- Los datos no se mueven: las celdas con "Verdulería"/"Frutas" ya están en el
-- lugar correcto; este migration sólo relabela columnas, tablas, secuencias,
-- índices y FKs. shopping_list_items conserva su denormalización histórica.
-- El migrator envuelve todos los statements en una transacción (ver migrate.ts).

ALTER TABLE "products" DROP CONSTRAINT "products_category_id_categories_id_fk";--> statement-breakpoint
ALTER TABLE "products" DROP CONSTRAINT "products_subcategory_id_subcategories_id_fk";--> statement-breakpoint
ALTER TABLE "subcategories" DROP CONSTRAINT "subcategories_category_id_categories_id_fk";--> statement-breakpoint

ALTER TABLE "categories" RENAME TO "stores";--> statement-breakpoint
ALTER TABLE "subcategories" RENAME TO "categories";--> statement-breakpoint

ALTER SEQUENCE IF EXISTS "categories_id_seq" RENAME TO "stores_id_seq";--> statement-breakpoint
ALTER SEQUENCE IF EXISTS "subcategories_id_seq" RENAME TO "categories_id_seq";--> statement-breakpoint

ALTER TABLE "products" RENAME COLUMN "category_id" TO "store_id";--> statement-breakpoint
ALTER TABLE "products" RENAME COLUMN "subcategory_id" TO "category_id";--> statement-breakpoint

-- En la ex-subcategories (ahora categories) la columna que apuntaba a la
-- ex-categories pasa a llamarse store_id, ya que ahora apunta a stores.
ALTER TABLE "categories" RENAME COLUMN "category_id" TO "store_id";--> statement-breakpoint

ALTER TABLE "shopping_list_items" RENAME COLUMN "category_id" TO "store_id";--> statement-breakpoint
ALTER TABLE "shopping_list_items" RENAME COLUMN "category_name" TO "store_name";--> statement-breakpoint
ALTER TABLE "shopping_list_items" RENAME COLUMN "category_emoji" TO "store_emoji";--> statement-breakpoint
ALTER TABLE "shopping_list_items" RENAME COLUMN "subcategory_id" TO "category_id";--> statement-breakpoint
ALTER TABLE "shopping_list_items" RENAME COLUMN "subcategory_name" TO "category_name";--> statement-breakpoint
ALTER TABLE "shopping_list_items" RENAME COLUMN "subcategory_emoji" TO "category_emoji";--> statement-breakpoint

ALTER INDEX "products_category_idx" RENAME TO "products_store_idx";--> statement-breakpoint
ALTER INDEX "products_subcategory_idx" RENAME TO "products_category_idx";--> statement-breakpoint
ALTER INDEX "subcategories_cat_name_uniq" RENAME TO "categories_store_name_uniq";--> statement-breakpoint

ALTER TABLE "stores" RENAME CONSTRAINT "categories_name_unique" TO "stores_name_unique";--> statement-breakpoint

ALTER TABLE "products" ADD CONSTRAINT "products_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;
