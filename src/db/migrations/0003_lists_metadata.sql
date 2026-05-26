-- Agrega:
--   * shopping_lists.emoji — emoji generado por IA al crear el draft, identifica
--     visualmente cada lista. Default '🛒' para listas existentes.
--   * settings.share_link_ttl_days — vida (en días) del share-link auto-creado al
--     publicar una lista. Default 30. Reemplaza al hardcoded de 24h que sigue
--     existiendo en createShareLink() como fallback explícito.
-- El migrator envuelve los statements en una transacción (ver migrate.ts).

ALTER TABLE "shopping_lists" ADD COLUMN "emoji" text NOT NULL DEFAULT '🛒';--> statement-breakpoint

ALTER TABLE "settings" ADD COLUMN "share_link_ttl_days" integer NOT NULL DEFAULT 30;
