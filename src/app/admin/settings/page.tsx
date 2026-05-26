import { eq } from "drizzle-orm";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { PageHeader } from "@/components/page-header";
import { SettingsForms } from "@/components/settings-forms";

export default async function SettingsPage() {
  const [row] = await db.select().from(settings).where(eq(settings.id, 1)).limit(1);
  const current = row ?? {
    id: 1,
    adminPasswordHash: null,
    historyLimit: 10,
    shareLinkTtlDays: 30,
    updatedAt: new Date(),
  };

  return (
    <div className="px-4 md:px-8 pt-4 md:pt-8 pb-8 max-w-2xl mx-auto w-full">
      <PageHeader eyebrow="App" title="Ajustes" subtitle="Configurá la app a tu medida." />
      <SettingsForms
        settings={{
          historyLimit: current.historyLimit,
          shareLinkTtlDays: current.shareLinkTtlDays,
        }}
      />
    </div>
  );
}
