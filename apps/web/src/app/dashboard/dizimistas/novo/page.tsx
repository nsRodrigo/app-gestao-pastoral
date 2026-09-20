import { redirect } from "next/navigation";
import { Permission } from "@gestao-pastoral/shared";
import { getSession, hasPermission } from "@/lib/session";
import { Card, PageHeader } from "@/components/ui";
import { QuickRegisterForm } from "./form";

export default async function NovoDizimistaPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasPermission(session, Permission.MEMBER_CREATE)) redirect("/dashboard/dizimistas");

  return (
    <div className="max-w-xl">
      <PageHeader
        title="Novo Dizimista"
        description="Cadastro rápido — não é necessário informar valor de contribuição."
      />
      <Card>
        <QuickRegisterForm />
      </Card>
    </div>
  );
}
