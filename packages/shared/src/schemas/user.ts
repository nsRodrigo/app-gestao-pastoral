import { z } from "zod";
import { RoleName } from "../roles";
import { PasswordSchema } from "./auth";

export const CreateStaffUserSchema = z.object({
  name: z.string().trim().min(2, "Nome é obrigatório"),
  email: z.string().trim().toLowerCase().email(),
  password: PasswordSchema,
  phone: z.string().trim().optional(),
  role: z.nativeEnum(RoleName).refine((r) => r !== RoleName.DIZIMISTA, {
    message: "Use o cadastro de dizimistas para este perfil",
  }),
  /** Obrigatório apenas quando quem chama é SUPER_ADMIN (sem organização fixa). */
  organizationId: z.string().uuid().optional(),
});
export type CreateStaffUserInput = z.infer<typeof CreateStaffUserSchema>;

export const UpdateUserRoleSchema = z.object({
  role: z.nativeEnum(RoleName),
});
export type UpdateUserRoleInput = z.infer<typeof UpdateUserRoleSchema>;

export const UpdateUserStatusSchema = z.object({
  isActive: z.boolean(),
});
export type UpdateUserStatusInput = z.infer<typeof UpdateUserStatusSchema>;
