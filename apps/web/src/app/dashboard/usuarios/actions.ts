"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CreateStaffUserSchema } from "@gestao-pastoral/shared";
import { getSession } from "@/lib/session";
import { apiFetch, ApiError, SessionExpiredError } from "@/lib/api-client";

export interface FormState {
  error?: string;
}

export async function createStaffUserAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await getSession();
  if (!session) redirect("/login");

  const parsed = CreateStaffUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    phone: formData.get("phone") || undefined,
    role: formData.get("role"),
    organizationId: formData.get("organizationId") || session.organizationId || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  try {
    await apiFetch(session, "/users", {
      method: "POST",
      body: JSON.stringify(parsed.data),
    });
    revalidatePath("/dashboard/usuarios");
  } catch (err) {
    if (err instanceof SessionExpiredError) redirect("/login");
    if (err instanceof ApiError) return { error: err.message };
    throw err;
  }

  return {};
}
