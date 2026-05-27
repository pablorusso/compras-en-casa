import { requireAdmin } from "@/lib/session";
import { AdminShell } from "@/components/admin-shell";

export default async function AdminAppLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return <AdminShell>{children}</AdminShell>;
}
