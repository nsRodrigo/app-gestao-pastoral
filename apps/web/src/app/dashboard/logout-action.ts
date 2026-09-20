"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { API_URL, COOKIE } from "@/lib/config";

export async function logoutAction(): Promise<void> {
  const store = await cookies();
  const refreshToken = store.get(COOKIE.refresh)?.value;

  if (refreshToken) {
    await fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    }).catch(() => undefined);
  }

  store.delete(COOKIE.access);
  store.delete(COOKIE.refresh);
  store.delete(COOKIE.session);

  redirect("/login");
}
