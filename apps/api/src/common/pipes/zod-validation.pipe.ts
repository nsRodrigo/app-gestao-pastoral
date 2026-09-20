import { BadRequestException, PipeTransform } from "@nestjs/common";
import { ZodSchema } from "zod";

/**
 * Valida o corpo da requisição usando um schema Zod compartilhado com o
 * frontend (packages/shared), garantindo uma única fonte de verdade para
 * as regras de validação.
 */
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));
      throw new BadRequestException({
        message: "Dados inválidos",
        errors,
      });
    }
    return result.data;
  }
}
