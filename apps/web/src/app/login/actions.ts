"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LoginSchema } from "@gestao-pastoral/shared";
import { API_URL, COOKIE } from "@/lib/config";

export interface LoginState {
  error?: string;
}

const REFRESH_MAX_AGE = 30 * 24 * 60 * 60; // dias -> segundos, espelha JWT_REFRESH_EXPIRES_IN_DAYS
const ACCESS_MAX_AGE = 15 * 60; // espelha JWT_ACCESS_EXPIRES_IN

export async function loginAction(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Informe e-mail e senha válidos." };
  }

  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(parsed.data),
    cache: "no-store",
  });

  if (!res.ok) {
    if (res.status === 401) {
      return { error: "E-mail ou senha inválidos." };
    }
    return { error: "Não foi possível entrar agora. Tente novamente em instantes." };
  }

  const data = await res.json();
  const store = await cookies();
  const isProd = process.env.NODE_ENV === "production";

  store.set(COOKIE.access, data.accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: ACCESS_MAX_AGE,
  });
  store.set(COOKIE.refresh, data.refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: REFRESH_MAX_AGE,
  });
  store.set(
    COOKIE.session,
    JSON.stringify({ id: data.user.id, name: data.user.name, email: data.user.email }),
    {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: REFRESH_MAX_AGE,
    },
  );

  redirect("/dashboard");
}
