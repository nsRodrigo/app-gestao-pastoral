import { redirect } from "next/navigation";
import { apiFetch, SessionExpiredError } from "@/lib/api-client";
import { getSession } from "@/lib/session";
import { Card, EmptyState, ErrorState, PageHeader } from "@/components/ui";
import { AuditLog } from "@/lib/types";

const ACTION_LABELS: Record<string, string> = {
  "organization.create": "Organização criada",
  "organization.settings.update": "Configurações da organização alteradas",
  "user.create": "Usuário criado",
  "user.role.update": "Papel do usuário alterado",
  "user.activate": "Usuário ativado",
  "user.deactivate": "Usuário desativado",
  "family.create": "Família criada",
  "family.update": "Família atualizada",
  "member.create": "Dizimista cadastrado",
  "member.quick_create": "Dizimista cadastrado (cadastro rápido)",
  "member.update": "Dizimista atualizado",
  "member.archive": "Dizimista arquivado",
};

export default async function AuditoriaPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  try {
    const logs = await apiFetch<AuditLog[]>(session, "/audit-logs");

    return (
      <div>
        <PageHeader
          title="Auditoria"
          description="Registro de operações sensíveis — histórico completo, sem exclusão."
        />

        {logs.length === 0 ? (
          <EmptyState title="Nenhum registro de auditoria ainda" />
        ) : (
          <Card className="overflow-hidden p-0">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Ação</th>
                  <th className="px-4 py-3">Entidade</th>
                  <th className="px-4 py-3">Data</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {ACTION_LABELS[log.action] ?? log.action}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {log.entityType}
                      {log.entityId ? ` · ${log.entityId.slice(0, 8)}` : ""}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(log.createdAt).toLocaleString("pt-BR")}
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
