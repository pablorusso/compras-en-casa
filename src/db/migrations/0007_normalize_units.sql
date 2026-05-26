-- Canonicaliza unidades a un set acotado: kg, gr, unidad, litro, ml.
-- Aplica multiplicadores cuando corresponde (docena × 12, maple × 30).
-- Las unidades libres no contempladas pasan a "unidad" sin cambiar la cantidad.

-- products.default_quantity_*
UPDATE "products" SET "default_quantity_value" = "default_quantity_value" * 12, "default_quantity_unit" = 'unidad'
  WHERE "default_quantity_unit" IN ('docena','docenas');--> statement-breakpoint
UPDATE "products" SET "default_quantity_value" = "default_quantity_value" * 30, "default_quantity_unit" = 'unidad'
  WHERE "default_quantity_unit" IN ('maple','maples');--> statement-breakpoint
UPDATE "products" SET "default_quantity_unit" = 'gr'
  WHERE "default_quantity_unit" IN ('g','gramo','gramos');--> statement-breakpoint
UPDATE "products" SET "default_quantity_unit" = 'kg'
  WHERE "default_quantity_unit" IN ('kilo','kilos');--> statement-breakpoint
UPDATE "products" SET "default_quantity_unit" = 'litro'
  WHERE "default_quantity_unit" IN ('litros','l');--> statement-breakpoint
UPDATE "products" SET "default_quantity_unit" = 'ml'
  WHERE "default_quantity_unit" IN ('mililitro','mililitros');--> statement-breakpoint
UPDATE "products" SET "default_quantity_unit" = 'unidad'
  WHERE "default_quantity_unit" IN ('unidades','u','un');--> statement-breakpoint
UPDATE "products" SET "default_quantity_unit" = 'unidad'
  WHERE "default_quantity_unit" NOT IN ('kg','gr','unidad','litro','ml');--> statement-breakpoint

-- shopping_list_items.quantity_*
UPDATE "shopping_list_items" SET "quantity_value" = "quantity_value" * 12, "quantity_unit" = 'unidad'
  WHERE "quantity_unit" IN ('docena','docenas');--> statement-breakpoint
UPDATE "shopping_list_items" SET "quantity_value" = "quantity_value" * 30, "quantity_unit" = 'unidad'
  WHERE "quantity_unit" IN ('maple','maples');--> statement-breakpoint
UPDATE "shopping_list_items" SET "quantity_unit" = 'gr'
  WHERE "quantity_unit" IN ('g','gramo','gramos');--> statement-breakpoint
UPDATE "shopping_list_items" SET "quantity_unit" = 'kg'
  WHERE "quantity_unit" IN ('kilo','kilos');--> statement-breakpoint
UPDATE "shopping_list_items" SET "quantity_unit" = 'litro'
  WHERE "quantity_unit" IN ('litros','l');--> statement-breakpoint
UPDATE "shopping_list_items" SET "quantity_unit" = 'ml'
  WHERE "quantity_unit" IN ('mililitro','mililitros');--> statement-breakpoint
UPDATE "shopping_list_items" SET "quantity_unit" = 'unidad'
  WHERE "quantity_unit" IN ('unidades','u','un');--> statement-breakpoint
UPDATE "shopping_list_items" SET "quantity_unit" = 'unidad'
  WHERE "quantity_unit" NOT IN ('kg','gr','unidad','litro','ml');
