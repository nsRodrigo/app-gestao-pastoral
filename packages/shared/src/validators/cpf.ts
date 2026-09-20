/**
 * Valida CPF (Cadastro de Pessoa Física) usando o algoritmo de dígitos
 * verificadores. Aceita string com ou sem máscara.
 */
export function isValidCpf(rawCpf: string): boolean {
  const cpf = rawCpf.replace(/\D/g, "");

  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false; // todos dígitos iguais

  const digits = cpf.split("").map(Number);

  const checkDigit = (length: number): number => {
    let sum = 0;
    for (let i = 0; i < length; i++) {
      sum += digits[i] * (length + 1 - i);
    }
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  return (
    checkDigit(9) === digits[9] && checkDigit(10) === digits[10]
  );
}

export function normalizeCpf(rawCpf: string): string {
  return rawCpf.replace(/\D/g, "");
}
