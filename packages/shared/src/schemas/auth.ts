import { z } from "zod";

export const LoginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1, "Senha é obrigatória"),
});
export type LoginInput = z.infer<typeof LoginSchema>;

/**
 * Política de senha (seção 32/LGPD): mínimo 8 caracteres, ao menos uma
 * letra e um número. Mantém simples para não frustrar usuários leigos,
 * mas evita senhas triviais.
 */
export const PasswordSchema = z
  .string()
  .min(8, "A senha deve ter no mínimo 8 caracteres")
  .regex(/[A-Za-z]/, "A senha deve conter ao menos uma letra")
  .regex(/[0-9]/, "A senha deve conter ao menos um número");

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshTokenInput = z.infer<typeof RefreshTokenSchema>;
