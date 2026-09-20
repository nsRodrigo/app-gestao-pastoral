"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { QuickRegisterMemberSchema } from "@gestao-pastoral/shared";
import { getSession } from "@/lib/session";
import { apiFetch, ApiError, SessionExpiredError } from "@/lib/api-client";
import { Member } from "@/lib/types";

export interface FormState {
  error?: string;
}

export async function quickRegisterMemberAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await getSession();
  if (!session) redirect("/login");

  const raw = {
    fullName: formData.get("fullName"),
    phone: formData.get("phone") || undefined,
    whatsapp: formData.get("whatsapp") || undefined,
    email: formData.get("email") || undefined,
    familyName: formData.get("familyName") || undefined,
    termsAccepted: formData.get("termsAccepted") === "on",
    communicationConsent: formData.get("communicationConsent") === "on",
  };

  const parsed = QuickRegisterMemberSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  try {
    const member = await apiFetch<Member>(session, "/members/quick", {
      method: "POST",
      body: JSON.stringify(parsed.data),
    });
    revalidatePath("/dashboard/dizimistas");
    redirect(`/dashboard/dizimistas/${member.id}`);
  } catch (err) {
    if (err instanceof SessionExpiredError) redirect("/login");
    if (err instanceof ApiError) return { error: err.message };
    throw err;
  }

  return {};
}

export async function archiveMemberAction(memberId: string): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");

  await apiFetch(session, `/members/${memberId}/archive`, { method: "PATCH" });
  revalidatePath("/dashboard/dizimistas");
  revalidatePath(`/dashboard/dizimistas/${memberId}`);
}
