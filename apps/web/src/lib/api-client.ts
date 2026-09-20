import { API_URL } from "./config";
import { Session } from "./session";

export class SessionExpiredError extends Error {
  constructor() {
    super("Sessão expirada");
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
  ) {
    super(
      typeof body === "object" && body && "message" in body
        ? String((body as { message: unknown }).message)
        : "Erro ao comunicar com o servidor",
    );
  }
}

/**
 * Chama a API a partir do servidor (Server Component / Server Action),
 * anexando o access token da sessão. Se o token expirou (401), sinaliza
 * com SessionExpiredError para a página redirecionar ao login — o
 * refresh automático fica para uma iteração futura da UI.
 */
export async function apiFetch<T>(
  session: Session,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      Authorization: `Bearer ${session.accessToken}`,
      ...init.headers,
    },
    cache: "no-store",
  });

  if (res.status === 401) throw new SessionExpiredError();

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await res.json() : undefined;

  if (!res.ok) throw new ApiError(res.status, body);

  return body as T;
}
