import { redirect } from "next/navigation";
import { getSession, hasPermission } from "@/lib/session";
import { NAV_ITEMS } from "./nav-items";
import { Sidebar } from "./sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const items = NAV_ITEMS.filter(
    (item) =>
      (!item.permission || hasPermission(session, item.permission)) &&
      (!item.roles || item.roles.includes(session.role)),
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar items={items} userName={session.user.name} role={session.role} />
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
