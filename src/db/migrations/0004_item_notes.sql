-- Aclaración por ítem dentro de una lista de compras (ej: "manzanas rojas, no
-- verdes"). Nullable. Solo editable desde /admin/list. Se importa desde la
-- última lista publicada al crear una nueva (ver createDraftListFromMaster).

ALTER TABLE "shopping_list_items" ADD COLUMN "notes" text;
