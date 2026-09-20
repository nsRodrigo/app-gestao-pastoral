import { customAlphabet } from "nanoid";

// Alfabeto sem caracteres ambíguos (0/O, 1/I) para leitura/digitação manual.
const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const generate = customAlphabet(alphabet, 8);

/**
 * Gera um identificador seguro para a carteirinha digital (seção 6).
 * Nunca deve derivar de CPF, telefone ou qualquer dado pessoal — é apenas
 * um token opaco que o backend resolve para o dizimista correspondente.
 * Exemplo: DIZ-8F4A92X7
 */
export function generateQrCodeToken(): string {
  return `DIZ-${generate()}`;
}
