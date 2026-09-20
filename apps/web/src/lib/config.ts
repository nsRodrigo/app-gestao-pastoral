export const API_URL = process.env.API_URL ?? "http://localhost:3001/api";

export const COOKIE = {
  access: "access_token",
  refresh: "refresh_token",
  session: "session",
} as const;
