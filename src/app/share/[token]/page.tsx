import { getListItems } from "@/lib/lists";
import { resolveShareLink } from "@/lib/share";
import { isLoggedIn } from "@/lib/session";
import { ListView } from "@/components/list-view";
import { ExpiryBadge, ExpiredBadge } from "@/components/expiry-badge";
import { Hourglass, LeafCorner, LostBag } from "@/components/illustrations";

export const dynamic = "force-dynamic";

type Params = { token: string };

export default async function SharePage({ params }: { params: Promise<Params> }) {
  const { token } = await params;
  const [res, logged] = await Promise.all([resolveShareLink(token), isLoggedIn()]);

  if (res.kind === "not_found") {
    return (
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="max-w-sm text-center space-y-5">
          <LostBag className="w-44 h-40 mx-auto" />
          <div className="space-y-1.5">
            <h1 className="font-display text-3xl font-semibold tracking-tight">
              Link no encontrado
            </h1>
            <p className="text-sm text-muted-foreground">
              El link puede haber sido eliminado o nunca existió.
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (res.kind === "expired" && !logged) {
    return (
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="max-w-sm text-center space-y-5">
          <Hourglass className="w-32 h-40 mx-auto" />
          <div className="space-y-1.5">
            <h1 className="font-display text-3xl font-semibold tracking-tight">
              Link expirado
            </h1>
            <p className="text-sm text-muted-foreground">
              Pediles que te manden uno nuevo desde la app.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const expiredButAdmin = res.kind === "expired";
  const items = await getListItems(res.list.id);
  const expiredLabel = res.link.expiresAt.toLocaleString("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  } as Intl.DateTimeFormatOptions);

  return (
    <main className="relative isolate overflow-x-clip flex-1 px-4 md:px-8 py-8 max-w-2xl mx-auto w-full">
      <LeafCorner
        aria-hidden
        className="pointer-events-none absolute -top-4 -right-4 size-32 opacity-50 -z-10 rotate-12"
      />
      {expiredButAdmin && (
        <div className="mb-4 rounded-xl border border-amber-500/40 bg-amber-50/60 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          Este link expiró el {expiredLabel}. Solo vos lo ves porque estás logueado como admin.
        </div>
      )}
      <header className="mb-7 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-primary">
            Lista para comprar
          </p>
          <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight leading-[1.05] mt-1.5">
            {res.list.name}
          </h1>
        </div>
        {expiredButAdmin ? (
          <ExpiredBadge expiresAt={res.link.expiresAt} />
        ) : (
          <ExpiryBadge expiresAt={res.link.expiresAt} />
        )}
      </header>
      <ListView
        list={res.list}
        items={items}
        mode="shopping"
        storageKey={`comprasencasa_share_${token}`}
      />
      <p className="text-center text-xs text-muted-foreground mt-10">
        Los tildes se guardan en este dispositivo. No se envían a nadie.
      </p>
    </main>
  );
}
