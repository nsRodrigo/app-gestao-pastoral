"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CreateFamilySchema } from "@gestao-pastoral/shared";
import { getSession } from "@/lib/session";
import { apiFetch, ApiError, SessionExpiredError } from "@/lib/api-client";

export interface FormState {
  error?: string;
}

export async function createFamilyAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await getSession();
  if (!session) redirect("/login");

  const parsed = CreateFamilySchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  try {
    await apiFetch(session, "/families", {
      method: "POST",
      body: JSON.stringify(parsed.data),
    });
    revalidatePath("/dashboard/familias");
  } catch (err) {
    if (err instanceof SessionExpiredError) redirect("/login");
    if (err instanceof ApiError) return { error: err.message };
    throw err;
  }

  return {};
}
