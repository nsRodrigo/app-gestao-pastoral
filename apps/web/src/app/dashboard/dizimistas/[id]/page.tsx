import { redirect } from "next/navigation";
import { Permission } from "@gestao-pastoral/shared";
import { apiFetch, ApiError, SessionExpiredError } from "@/lib/api-client";
import { getSession, hasPermission } from "@/lib/session";
import { Card, ErrorState, PageHeader } from "@/components/ui";
import { generateQrCodeSvg } from "@/lib/qrcode";
import { Member } from "@/lib/types";
import { archiveMemberAction } from "../actions";

const STATUS_LABEL: Record<Member["status"], string> = {
  ATIVO: "Ativo",
  INATIVO: "Inativo",
  ARQUIVADO: "Arquivado",
};

export default async function DizimistaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");

  try {
    const member = await apiFetch<Member & { family?: { name: string } | null }>(
      session,
      `/members/${id}`,
    );
    const qrSvg = await generateQrCodeSvg(member.qrCodeToken);
    const canArchive = hasPermission(session, Permission.MEMBER_ARCHIVE);

    return (
      <div className="max-w-3xl">
        <PageHeader title={member.fullName} description={member.family?.name ?? "Sem família vinculada"} />

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <Card>
            <p className="text-sm font-medium text-slate-500">Carteirinha digital</p>
            <div
              className="mx-auto mt-4 h-40 w-40"
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
            <p className="mt-3 text-center font-mono text-sm text-brand-dark">
              {member.qrCodeToken}
            </p>
          </Card>

          <Card>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-slate-500">Status</dt>
                <dd className="font-medium text-slate-800">{STATUS_LABEL[member.status]}</dd>
              </div>
              <div>
                <dt className="text-slate-500">E-mail</dt>
                <dd className="font-medium text-slate-800">{member.email ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Telefone</dt>
                <dd className="font-medium text-slate-800">{member.phone ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-500">WhatsApp</dt>
                <dd className="font-medium text-slate-800">{member.whatsapp ?? "—"}</dd>
              </div>
              {member.suggestedAmountCents !== undefined && (
                <div>
                  <dt className="text-slate-500">Valor sugerido</dt>
                  <dd className="font-medium text-slate-800">
                    {member.suggestedAmountCents
                      ? (member.suggestedAmountCents / 100).toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })
                      : "Não informado"}
                  </dd>
                </div>
              )}
            </dl>
          </Card>
        </div>

        {canArchive && member.status !== "ARQUIVADO" ? (
          <form action={archiveMemberAction.bind(null, member.id)} className="mt-6">
            <button
              type="submit"
              className="rounded-xl border border-danger/30 px-4 py-2.5 text-sm font-medium text-danger hover:bg-danger/5"
            >
              Arquivar dizimista
            </button>
          </form>
        ) : null}
      </div>
    );
  } catch (err) {
    if (err instanceof SessionExpiredError) redirect("/login");
    if (err instanceof ApiError && err.status === 404) {
      return <ErrorState message="Dizimista não encontrado." />;
    }
    return <ErrorState message={(err as Error).message} />;
  }
}
