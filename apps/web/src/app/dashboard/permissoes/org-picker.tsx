"use client";

import { useRouter } from "next/navigation";

export function OrgPicker({
  organizations,
  selectedId,
}: {
  organizations: { id: string; name: string }[];
  selectedId?: string;
}) {
  const router = useRouter();

  return (
    <select
      value={selectedId ?? ""}
      onChange={(e) => {
        const value = e.target.value;
        router.push(value ? `/dashboard/permissoes?org=${value}` : "/dashboard/permissoes");
      }}
      className="w-full max-w-sm rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
    >
      <option value="">Selecione uma organização</option>
      {organizations.map((org) => (
        <option key={org.id} value={org.id}>
          {org.name}
        </option>
      ))}
    </select>
  );
}
