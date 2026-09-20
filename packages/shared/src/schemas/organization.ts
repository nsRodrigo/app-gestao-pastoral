import { z } from "zod";
import { PasswordSchema } from "./auth";
import { Permission } from "../permissions";
import { RoleName } from "../roles";

const slugify = (v: string) =>
  v
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export const CreateOrganizationSchema = z.object({
  name: z.string().trim().min(2, "Nome da organização é obrigatório"),
  slug: z
    .string()
    .trim()
    .min(2)
    .transform(slugify)
    .optional(),
  address: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  email: z.string().trim().toLowerCase().email().optional(),
  admin: z.object({
    name: z.string().trim().min(2, "Nome do administrador é obrigatório"),
    email: z.string().trim().toLowerCase().email(),
    password: PasswordSchema,
  }),
});
export type CreateOrganizationInput = z.infer<typeof CreateOrganizationSchema>;

export const UpdateOrganizationSettingsSchema = z.object({
  parocoPodeVerValoresIndividuais: z.boolean().optional(),
});
export type UpdateOrganizationSettingsInput = z.infer<
  typeof UpdateOrganizationSettingsSchema
>;

/**
 * Papéis cuja matriz de permissões pode ser customizada por organização
 * (seção 3). SUPER_ADMIN (bypass total), PAROCO e DIZIMISTA ficam fixos —
 * o Pároco gerencia esta tela, então seu próprio acesso não passa por ela
 * (evita autoexclusão acidental).
 */
export const CUSTOMIZABLE_ROLES = [
  RoleName.TESOUREIRO,
  RoleName.SECRETARIA,
  RoleName.COORDENADOR_DIZIMO,
  RoleName.APOIADOR,
] as const;

/** Ações de plataforma que nunca podem ser delegadas a um papel de organização. */
const NON_ASSIGNABLE_PERMISSIONS: Permission[] = [Permission.ORGANIZATION_MANAGE];

export const RolePermissionsEntrySchema = z.object({
  role: z.enum(CUSTOMIZABLE_ROLES),
  permissions: z
    .array(z.nativeEnum(Permission))
    .refine((perms) => perms.every((p) => !NON_ASSIGNABLE_PERMISSIONS.includes(p)), {
      message: "Esta permissão não pode ser atribuída por esta tela.",
    }),
});
export type RolePermissionsEntry = z.infer<typeof RolePermissionsEntrySchema>;

export const UpdateRolePermissionsSchema = z.object({
  roles: z.array(RolePermissionsEntrySchema),
});
export type UpdateRolePermissionsInput = z.infer<typeof UpdateRolePermissionsSchema>;
