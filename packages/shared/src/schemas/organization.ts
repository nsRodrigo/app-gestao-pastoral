import { z } from "zod";
import { PasswordSchema } from "./auth";

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
