ALTER TABLE "categories" ADD COLUMN "exclude_from_auto_add" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "exclude_from_auto_add" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "exclude_from_auto_add" boolean DEFAULT false NOT NULL;