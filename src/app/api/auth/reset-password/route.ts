import { NextResponse } from "next/server";
import { createSession, resetPassword, SESSION_COOKIE } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { token?: string; password?: string };
    const result = await resetPassword(body.token ?? "", body.password ?? "");
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    const session = await createSession(result.user.id);
    const res = NextResponse.json({ user: result.user });
    res.cookies.set(SESSION_COOKIE, session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: session.expiresAt,
    });
    return res;
  } catch (err) {
    console.error("[LifeOS] reset-password failed:", err);
    return NextResponse.json({ error: "Something went wrong on our end. Try again in a moment." }, { status: 500 });
  }
}
