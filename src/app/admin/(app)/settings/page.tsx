import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { settings, stores } from "@/db/schema";
import { PageHeader } from "@/components/page-header";
import { SettingsForms } from "@/components/settings-forms";
import { getCurrentList } from "@/lib/lists";

export default async function SettingsPage() {
  const [[row], storeRows, currentList] = await Promise.all([
    db.select().from(settings).where(eq(settings.id, 1)).limit(1),
    db.select().from(stores).orderBy(asc(stores.sortOrder), asc(stores.name)),
    getCurrentList(),
  ]);
  const current = row ?? {
    id: 1,
    adminPasswordHash: null,
    historyLimit: 10,
    shareLinkTtlDays: 30,
    shoppingDays: [],
    defaultStoreId: null,
    updatedAt: new Date(),
  };
  const storeOptions = storeRows.map((s) => ({ id: s.id, name: s.name, emoji: s.emoji }));

  return (
    <div className="px-4 md:px-8 pt-4 md:pt-8 pb-8 max-w-3xl mx-auto w-full">
      <PageHeader eyebrow="App" title="Ajustes" subtitle="Configurá la app a tu medida." />
      <SettingsForms
        settings={{
          historyLimit: current.historyLimit,
          shareLinkTtlDays: current.shareLinkTtlDays,
          shoppingDays: current.shoppingDays,
          defaultStoreId: current.defaultStoreId,
        }}
        stores={storeOptions}
        currentListName={currentList?.name ?? null}
      />
    </div>
  );
}
