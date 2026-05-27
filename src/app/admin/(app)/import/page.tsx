import { PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/lib/session";
import { ImportClient } from "./import-client";

export default async function ImportPage() {
  await requireAdmin();
  return (
    <div className="px-4 md:px-8 pt-4 md:pt-8 pb-8 max-w-3xl mx-auto w-full">
      <PageHeader
        eyebrow="Maestro"
        title="Importar / Exportar catálogo"
        subtitle="Exportá el maestro actual a markdown o pegá una lista para reemplazar todos los comercios, categorías y productos."
      />
      <ImportClient />
    </div>
  );
}
