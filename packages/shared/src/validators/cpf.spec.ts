import { isValidCpf, normalizeCpf } from "./cpf";

describe("isValidCpf", () => {
  it("aceita um CPF válido (com máscara)", () => {
    expect(isValidCpf("529.982.247-25")).toBe(true);
  });

  it("aceita um CPF válido (sem máscara)", () => {
    expect(isValidCpf("52998224725")).toBe(true);
  });

  it("rejeita CPF com dígitos verificadores incorretos", () => {
    expect(isValidCpf("52998224700")).toBe(false);
  });

  it("rejeita CPF com todos os dígitos iguais", () => {
    expect(isValidCpf("11111111111")).toBe(false);
    expect(isValidCpf("00000000000")).toBe(false);
  });

  it("rejeita CPF com tamanho incorreto", () => {
    expect(isValidCpf("123456789")).toBe(false);
    expect(isValidCpf("123456789012")).toBe(false);
  });

  it("rejeita string vazia", () => {
    expect(isValidCpf("")).toBe(false);
  });
});

describe("normalizeCpf", () => {
  it("remove máscara mantendo apenas dígitos", () => {
    expect(normalizeCpf("529.982.247-25")).toBe("52998224725");
  });
});
