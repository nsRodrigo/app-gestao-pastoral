import { redirect } from "next/navigation";
import { RoleName, RolePermissionsEntry } from "@gestao-pastoral/shared";
import { apiFetch, SessionExpiredError } from "@/lib/api-client";
import { getSession } from "@/lib/session";
import { Card, EmptyState, ErrorState, PageHeader } from "@/components/ui";
import { OrgPicker } from "./org-picker";
import { RolePermissionsForm } from "./role-permissions-form";

interface OrganizationSummary {
  id: string;
  name: string;
  slug: string;
}

export default async function PermissoesPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== RoleName.PAROCO && session.role !== RoleName.SUPER_ADMIN) {
    redirect("/dashboard");
  }

  try {
    let organizations: OrganizationSummary[] = [];
    let targetOrgId: string | null = null;

    if (session.role === RoleName.SUPER_ADMIN) {
      organizations = await apiFetch<OrganizationSummary[]>(session, "/organizations");
      const requested = (await searchParams).org;
      targetOrgId = requested && organizations.some((org) => org.id === requested) ? requested : null;
    } else {
      targetOrgId = session.organizationId;
    }

    const entries = targetOrgId
      ? await apiFetch<RolePermissionsEntry[]>(session, `/organizations/${targetOrgId}/role-permissions`)
      : null;

    return (
      <div>
        <PageHeader
          title="Perfis e Permissões"
          description="Escolha o que cada perfil da equipe pode ver, ou ver e editar, nesta organização."
        />

        {session.role === RoleName.SUPER_ADMIN && (
          <Card className="mb-6">
            <label className="mb-2 block text-sm font-medium text-slate-700">Organização</label>
            <OrgPicker organizations={organizations} selectedId={targetOrgId ?? undefined} />
          </Card>
        )}

        {!targetOrgId ? (
          <EmptyState
            title="Selecione uma organização"
            description="Escolha uma paróquia acima para gerenciar as permissões dela."
          />
        ) : (
          <RolePermissionsForm organizationId={targetOrgId} entries={entries ?? []} />
        )}
      </div>
    );
  } catch (err) {
    if (err instanceof SessionExpiredError) redirect("/login");
    return <ErrorState message={(err as Error).message} />;
  }
}
