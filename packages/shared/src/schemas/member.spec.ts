import {
  CreateMemberSchema,
  QuickRegisterMemberSchema,
} from "./member";

describe("CreateMemberSchema", () => {
  it("aceita cadastro sem nenhum dado financeiro (seção 5)", () => {
    const result = CreateMemberSchema.safeParse({
      fullName: "Maria da Silva",
      termsAccepted: true,
    });
    expect(result.success).toBe(true);
  });

  it("rejeita nome muito curto", () => {
    const result = CreateMemberSchema.safeParse({
      fullName: "Jo",
      termsAccepted: true,
    });
    expect(result.success).toBe(false);
  });

  it("rejeita CPF inválido", () => {
    const result = CreateMemberSchema.safeParse({
      fullName: "Maria da Silva",
      cpf: "111.111.111-11",
      termsAccepted: true,
    });
    expect(result.success).toBe(false);
  });

  it("normaliza CPF válido removendo máscara", () => {
    const result = CreateMemberSchema.safeParse({
      fullName: "Maria da Silva",
      cpf: "529.982.247-25",
      termsAccepted: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.cpf).toBe("52998224725");
    }
  });

  it("rejeita valor sugerido negativo", () => {
    const result = CreateMemberSchema.safeParse({
      fullName: "Maria da Silva",
      termsAccepted: true,
      suggestedAmountCents: -100,
    });
    expect(result.success).toBe(false);
  });
});

describe("QuickRegisterMemberSchema", () => {
  it("exige aceite dos termos", () => {
    const result = QuickRegisterMemberSchema.safeParse({
      fullName: "João",
      termsAccepted: false,
    });
    expect(result.success).toBe(false);
  });

  it("aceita cadastro rápido mínimo válido", () => {
    const result = QuickRegisterMemberSchema.safeParse({
      fullName: "João da Silva",
      termsAccepted: true,
    });
    expect(result.success).toBe(true);
  });
});
