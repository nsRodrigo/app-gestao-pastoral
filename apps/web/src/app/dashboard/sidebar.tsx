"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavItem } from "./nav-items";
import { logoutAction } from "./logout-action";

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Administrador",
  PAROCO: "Pároco",
  TESOUREIRO: "Tesoureiro",
  SECRETARIA: "Secretaria",
  COORDENADOR_DIZIMO: "Coordenador do Dízimo",
  APOIADOR: "Apoiador",
  DIZIMISTA: "Dizimista",
};

export function Sidebar({
  items,
  userName,
  role,
}: {
  items: NavItem[];
  userName: string;
  role: string;
}) {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-6 py-5">
        <p className="text-lg font-semibold text-brand-dark">Dízimo Conectado</p>
        <p className="text-xs text-slate-500">Mais fé, mais pessoas, mais missão.</p>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-xl px-3 py-2 text-sm font-medium transition ${
                active
                  ? "bg-brand text-white"
                  : "text-slate-600 hover:bg-brand-light hover:text-brand-dark"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 px-4 py-4">
        <p className="truncate text-sm font-medium text-slate-800">{userName}</p>
        <p className="text-xs text-slate-500">{ROLE_LABELS[role] ?? role}</p>
        <form action={logoutAction} className="mt-3">
          <button
            type="submit"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Sair
          </button>
        </form>
      </div>
    </aside>
  );
}
