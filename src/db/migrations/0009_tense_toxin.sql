-- Drop el check constraint viejo para poder actualizar valores de status.
ALTER TABLE "shopping_lists" DROP CONSTRAINT "shopping_lists_status_chk";--> statement-breakpoint

-- Data migration: la última lista no-archivada (por created_at) queda 'current',
-- el resto pasa a 'archived'. Cubre los casos donde había un draft + una published.
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at DESC) AS rn
  FROM "shopping_lists"
  WHERE status IN ('draft','published')
)
UPDATE "shopping_lists" s
SET status = CASE WHEN r.rn = 1 THEN 'current' ELSE 'archived' END
FROM ranked r
WHERE s.id = r.id;--> statement-breakpoint

-- Toda lista que se archivó pierde sus share-links (cumple invariante: sólo
-- la vigente puede tener link público).
DELETE FROM "share_links"
WHERE list_id IN (SELECT id FROM "shopping_lists" WHERE status = 'archived');--> statement-breakpoint

ALTER TABLE "shopping_lists" ALTER COLUMN "status" SET DEFAULT 'current';--> statement-breakpoint
ALTER TABLE "shopping_lists" DROP COLUMN "published_at";--> statement-breakpoint
ALTER TABLE "shopping_lists" ADD CONSTRAINT "shopping_lists_status_chk" CHECK ("shopping_lists"."status" in ('current','archived'));
