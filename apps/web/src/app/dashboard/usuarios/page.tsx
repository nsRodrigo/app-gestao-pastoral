import { redirect } from "next/navigation";
import { apiFetch, SessionExpiredError } from "@/lib/api-client";
import { getSession } from "@/lib/session";
import { Card, EmptyState, ErrorState, PageHeader } from "@/components/ui";
import { StaffUser } from "@/lib/types";
import { CreateUserForm } from "./create-user-form";

export default async function UsuariosPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  try {
    const users = session.organizationId
      ? await apiFetch<StaffUser[]>(session, "/users")
      : [];

    return (
      <div>
        <PageHeader
          title="Usuários"
          description="Equipe com acesso ao painel administrativo e ao app do apoiador."
        />

        <Card className="mb-6">
          <CreateUserForm organizationId={session.organizationId} />
        </Card>

        {users.length === 0 ? (
          <EmptyState title="Nenhum usuário cadastrado ainda" />
        ) : (
          <Card className="overflow-hidden p-0">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">E-mail</th>
                  <th className="px-4 py-3">Perfil</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium text-slate-800">{user.name}</td>
                    <td className="px-4 py-3 text-slate-600">{user.email}</td>
                    <td className="px-4 py-3 text-slate-600">{user.role ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          user.isActive
                            ? "bg-success/10 text-success"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {user.isActive ? "Ativo" : "Inativo"}
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
