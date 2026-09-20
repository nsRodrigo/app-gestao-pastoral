import { redirect } from "next/navigation";
import { Permission } from "@gestao-pastoral/shared";
import { apiFetch, SessionExpiredError } from "@/lib/api-client";
import { getSession, hasPermission } from "@/lib/session";
import { Card, EmptyState, ErrorState, PageHeader } from "@/components/ui";
import { Family } from "@/lib/types";
import { CreateFamilyForm } from "./create-family-form";

export default async function FamiliasPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  try {
    const families = await apiFetch<Family[]>(session, "/families");
    const canCreate = hasPermission(session, Permission.FAMILY_CREATE);

    return (
      <div>
        <PageHeader title="Famílias" description="Famílias cadastradas na comunidade." />

        {canCreate && (
          <Card className="mb-6">
            <CreateFamilyForm />
          </Card>
        )}

        {families.length === 0 ? (
          <EmptyState
            title="Nenhuma família cadastrada"
            description="Cadastre a primeira família usando o formulário acima."
          />
        ) : (
          <Card className="overflow-hidden p-0">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Família</th>
                  <th className="px-4 py-3">Cidade</th>
                  <th className="px-4 py-3">Membros</th>
                </tr>
              </thead>
              <tbody>
                {families.map((family) => (
                  <tr key={family.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium text-slate-800">{family.name}</td>
                    <td className="px-4 py-3 text-slate-600">{family.addressCity ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {family._count?.members ?? 0}
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
