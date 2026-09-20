import { redirect } from "next/navigation";
import { apiFetch, SessionExpiredError } from "@/lib/api-client";
import { getSession, hasPermission } from "@/lib/session";
import { Card, ErrorState, PageHeader } from "@/components/ui";
import { Member, Family, Organization } from "@/lib/types";
import { Permission } from "@gestao-pastoral/shared";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  try {
    const canReadMembers = hasPermission(session, Permission.MEMBER_READ);
    const canReadFamilies = hasPermission(session, Permission.FAMILY_READ);

    const [organization, members, families] = await Promise.all([
      session.organizationId
        ? apiFetch<Organization>(session, `/organizations/${session.organizationId}`)
        : Promise.resolve(null),
      canReadMembers ? apiFetch<Member[]>(session, "/members") : Promise.resolve([]),
      canReadFamilies ? apiFetch<Family[]>(session, "/families") : Promise.resolve([]),
    ]);

    const activeMembers = members.filter((m) => m.status === "ATIVO").length;

    return (
      <div>
        <PageHeader
          title={`Olá, ${session.user.name.split(" ")[0]} 🙏`}
          description={organization ? organization.name : "Painel administrativo"}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {canReadMembers && (
            <Card>
              <p className="text-sm text-slate-500">Dizimistas ativos</p>
              <p className="mt-2 text-3xl font-semibold text-brand-dark">{activeMembers}</p>
            </Card>
          )}
          {canReadMembers && (
            <Card>
              <p className="text-sm text-slate-500">Total de dizimistas</p>
              <p className="mt-2 text-3xl font-semibold text-brand-dark">{members.length}</p>
            </Card>
          )}
          {canReadFamilies && (
            <Card>
              <p className="text-sm text-slate-500">Famílias cadastradas</p>
              <p className="mt-2 text-3xl font-semibold text-brand-dark">{families.length}</p>
            </Card>
          )}
        </div>

        <Card className="mt-6">
          <p className="text-sm text-slate-500">
            Indicadores financeiros, campanhas e prestação de contas chegam nas próximas fases
            do projeto.
          </p>
        </Card>
      </div>
    );
  } catch (err) {
    if (err instanceof SessionExpiredError) redirect("/login");
    return <ErrorState message={(err as Error).message} />;
  }
}
