import Link from "next/link";
import { redirect } from "next/navigation";
import { apiFetch, SessionExpiredError } from "@/lib/api-client";
import { getSession } from "@/lib/session";
import { Card, EmptyState, ErrorState, PageHeader } from "@/components/ui";
import { Member } from "@/lib/types";

const STATUS_LABEL: Record<Member["status"], string> = {
  ATIVO: "Ativo",
  INATIVO: "Inativo",
  ARQUIVADO: "Arquivado",
};

const STATUS_BADGE: Record<Member["status"], string> = {
  ATIVO: "bg-success/10 text-success",
  INATIVO: "bg-slate-100 text-slate-600",
  ARQUIVADO: "bg-slate-200 text-slate-500",
};

export default async function DizimistasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  try {
    const query = (await searchParams).q?.trim();
    const members = await apiFetch<Member[]>(
      session,
      `/members${query ? `?search=${encodeURIComponent(query)}` : ""}`,
    );

    return (
      <div>
        <div className="mb-6 flex items-center justify-between">
          <PageHeader
            title="Dizimistas"
            description="Comunidade cadastrada — famílias, contato e carteirinha digital."
          />
          <Link
            href="/dashboard/dizimistas/novo"
            className="h-fit rounded-xl bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-dark"
          >
            Novo Dizimista
          </Link>
        </div>

        <form className="mb-4" action="/dashboard/dizimistas">
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Buscar por nome, CPF, telefone, e-mail ou código"
            className="w-full max-w-md rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </form>

        {members.length === 0 ? (
          <EmptyState
            title="Nenhum dizimista encontrado"
            description="Cadastre o primeiro dizimista da comunidade usando o botão acima."
          />
        ) : (
          <Card className="overflow-hidden p-0">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">Contato</th>
                  <th className="px-4 py-3">Código</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/dizimistas/${member.id}`}
                        prefetch={false}
                        className="font-medium text-brand hover:underline"
                      >
                        {member.fullName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {member.email ?? member.phone ?? member.whatsapp ?? "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">
                      {member.qrCodeToken}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_BADGE[member.status]}`}
                      >
                        {STATUS_LABEL[member.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    );
  } catch (err) {
    if (err instanceof SessionExpiredError) redirect("/login");
    return <ErrorState message={(err as Error).message} />;
  }
}
