import { z } from "zod";

export const CreateFamilySchema = z.object({
  name: z.string().trim().min(2, "Nome da família é obrigatório"),
  addressStreet: z.string().trim().optional(),
  addressNumber: z.string().trim().optional(),
  addressComplement: z.string().trim().optional(),
  addressNeighborhood: z.string().trim().optional(),
  addressCity: z.string().trim().optional(),
  addressState: z.string().trim().max(2).optional(),
  addressZipCode: z.string().trim().optional(),
});
export type CreateFamilyInput = z.infer<typeof CreateFamilySchema>;

export const UpdateFamilySchema = CreateFamilySchema.partial();
export type UpdateFamilyInput = z.infer<typeof UpdateFamilySchema>;
