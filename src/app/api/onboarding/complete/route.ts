import { NextResponse } from "next/server";
import { assembleSnapshot } from "@/lib/pipeline";
import { markOnboarded, setDisplayName } from "@/lib/auth";
import { currentUser } from "@/lib/require-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

    const body = (await req.json().catch(() => ({}))) as { displayName?: string };
    const displayName = (body.displayName ?? "").trim();
    if (displayName) await setDisplayName(user.id, displayName);

    await markOnboarded(user.id);
    const snapshot = await assembleSnapshot(user.id);
    return NextResponse.json({ ok: true, snapshot });
  } catch (err) {
    console.error("[LifeOS] onboarding complete failed:", err);
    return NextResponse.json({ error: "Something went wrong on our end. Try again in a moment." }, { status: 500 });
  }
}
