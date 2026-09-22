import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { deleteAccount, destroySession, SESSION_COOKIE } from "@/lib/auth";
import { currentUser } from "@/lib/require-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  await deleteAccount(user.id);
  const store = await cookies();
  await destroySession(store.get(SESSION_COOKIE)?.value);
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
