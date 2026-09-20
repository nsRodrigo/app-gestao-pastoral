/**
 * Decodifica (sem verificar assinatura) o payload de um JWT — usado apenas
 * no servidor para saber o papel/permissões e montar a navegação. A
 * validação real de autenticidade acontece sempre na API.
 */
export function decodeJwtPayload<T>(token: string): T | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = Buffer.from(base64, "base64").toString("utf-8");
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}
