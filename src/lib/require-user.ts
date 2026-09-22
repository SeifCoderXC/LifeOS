import { cookies } from "next/headers";
import { getUserBySession, SESSION_COOKIE, type AuthUser } from "./auth";

export async function currentUser(): Promise<AuthUser | null> {
  const store = await cookies();
  return await getUserBySession(store.get(SESSION_COOKIE)?.value);
}
