import { NextResponse } from "next/server";
import { requestPasswordReset } from "@/lib/auth";
import { sendPasswordResetEmail } from "@/lib/mailer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { email?: string };
    const email = (body.email ?? "").trim();
    const result = await requestPasswordReset(email);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    if (!result.token) {
      // No account with this email — say the same thing as success so we don't leak who has an account.
      return NextResponse.json({ ok: true });
    }
    const origin = new URL(req.url).origin;
    const url = `${origin}/reset-password?token=${result.token}`;
    const sent = await sendPasswordResetEmail(email.toLowerCase(), url);
    return NextResponse.json({ ok: true, devLink: sent.devLink });
  } catch (err) {
    console.error("[LifeOS] forgot-password failed:", err);
    return NextResponse.json({ error: "Something went wrong on our end. Try again in a moment." }, { status: 500 });
  }
}
