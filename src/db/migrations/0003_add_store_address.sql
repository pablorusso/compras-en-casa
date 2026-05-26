-- Dirección opcional del comercio. Se denormaliza en shopping_list_items igual
-- que storeName/storeEmoji para que las listas viejas conserven la dirección
-- que tenía el comercio al armarse.

ALTER TABLE "stores" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "shopping_list_items" ADD COLUMN "store_address" text;
