import { z } from "zod";
import { isValidCpf, normalizeCpf } from "../validators/cpf";

export const ContributionFrequency = {
  MENSAL: "MENSAL",
  TRIMESTRAL: "TRIMESTRAL",
  ANUAL: "ANUAL",
  AVULSO: "AVULSO",
} as const;
export type ContributionFrequency =
  (typeof ContributionFrequency)[keyof typeof ContributionFrequency];

export const ContributionPreference = {
  PIX: "PIX",
  CARTAO: "CARTAO",
  DINHEIRO: "DINHEIRO",
  TRANSFERENCIA: "TRANSFERENCIA",
} as const;
export type ContributionPreference =
  (typeof ContributionPreference)[keyof typeof ContributionPreference];

export const MemberStatus = {
  ATIVO: "ATIVO",
  INATIVO: "INATIVO",
  ARQUIVADO: "ARQUIVADO",
} as const;
export type MemberStatus = (typeof MemberStatus)[keyof typeof MemberStatus];

const optionalCpf = z
  .string()
  .trim()
  .transform((v) => (v ? normalizeCpf(v) : v))
  .refine((v) => !v || isValidCpf(v), { message: "CPF inválido" })
  .optional();

const optionalEmail = z
  .string()
  .trim()
  .toLowerCase()
  .email("E-mail inválido")
  .optional()
  .or(z.literal("").transform(() => undefined));

/**
 * Cadastro completo do dizimista (seção 5). IMPORTANTE: nenhum campo
 * financeiro é obrigatório — não se exige valor de contribuição para ser
 * considerado dizimista.
 */
export const CreateMemberSchema = z.object({
  fullName: z.string().trim().min(3, "Nome completo é obrigatório"),
  socialName: z.string().trim().optional(),
  cpf: optionalCpf,
  birthDate: z.coerce.date().optional(),
  sex: z.enum(["MASCULINO", "FEMININO", "NAO_INFORMADO"]).optional(),
  phone: z.string().trim().optional(),
  whatsapp: z.string().trim().optional(),
  email: optionalEmail,
  addressStreet: z.string().trim().optional(),
  addressNumber: z.string().trim().optional(),
  addressComplement: z.string().trim().optional(),
  addressNeighborhood: z.string().trim().optional(),
  addressCity: z.string().trim().optional(),
  addressState: z.string().trim().max(2).optional(),
  addressZipCode: z.string().trim().optional(),

  familyId: z.string().uuid().optional(),
  communityId: z.string().uuid().optional(),
  pastoral: z.string().trim().optional(),
  ministry: z.string().trim().optional(),
  group: z.string().trim().optional(),
  entryDate: z.coerce.date().optional(),
  baptismDate: z.coerce.date().optional(),
  pastoralNotes: z.string().trim().optional(),

  status: z.nativeEnum(MemberStatus).default(MemberStatus.ATIVO),
  contributionFrequency: z.nativeEnum(ContributionFrequency).optional(),
  suggestedAmountCents: z.number().int().nonnegative().optional(),
  contributionPreference: z.nativeEnum(ContributionPreference).optional(),

  termsAccepted: z.boolean(),
  communicationConsent: z.boolean().default(false),
});
export type CreateMemberInput = z.infer<typeof CreateMemberSchema>;

export const UpdateMemberSchema = CreateMemberSchema.partial().omit({
  termsAccepted: true,
});
export type UpdateMemberInput = z.infer<typeof UpdateMemberSchema>;

/**
 * Cadastro rápido (seção 12) — usado pelo botão "Novo Dizimista" e pelo
 * app do Apoiador durante celebrações.
 */
export const QuickRegisterMemberSchema = z.object({
  fullName: z.string().trim().min(3, "Nome completo é obrigatório"),
  phone: z.string().trim().optional(),
  whatsapp: z.string().trim().optional(),
  email: optionalEmail,
  birthDate: z.coerce.date().optional(),
  familyId: z.string().uuid().optional(),
  familyName: z.string().trim().optional(),
  termsAccepted: z.literal(true, {
    errorMap: () => ({ message: "É necessário aceitar os termos" }),
  }),
  communicationConsent: z.boolean().default(false),
});
export type QuickRegisterMemberInput = z.infer<
  typeof QuickRegisterMemberSchema
>;
