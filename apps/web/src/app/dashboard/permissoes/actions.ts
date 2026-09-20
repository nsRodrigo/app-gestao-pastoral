"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  CUSTOMIZABLE_ROLES,
  PERMISSION_RESOURCE_GROUPS,
  UpdateRolePermissionsSchema,
} from "@gestao-pastoral/shared";
import { getSession } from "@/lib/session";
import { apiFetch, ApiError, SessionExpiredError } from "@/lib/api-client";
import { AccessLevel, levelPermissions } from "./level";

export interface FormState {
  error?: string;
  success?: boolean;
}

export async function updateRolePermissionsAction(
  organizationId: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await getSession();
  if (!session) redirect("/login");

  const roles = CUSTOMIZABLE_ROLES.map((role) => {
    const permissions = PERMISSION_RESOURCE_GROUPS.flatMap((group) => {
      const level = (formData.get(`level__${group.key}__${role}`) as AccessLevel) ?? "nada";
      return levelPermissions(group, level);
    });
    return { role, permissions: Array.from(new Set(permissions)) };
  });

  const parsed = UpdateRolePermissionsSchema.safeParse({ roles });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  try {
    await apiFetch(session, `/organizations/${organizationId}/role-permissions`, {
      method: "PATCH",
      body: JSON.stringify(parsed.data),
    });
    revalidatePath("/dashboard/permissoes");
  } catch (err) {
    if (err instanceof SessionExpiredError) redirect("/login");
    if (err instanceof ApiError) return { error: err.message };
    throw err;
  }

  return { success: true };
}
