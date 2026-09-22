import { NextResponse } from "next/server";
import { ingestReality } from "@/lib/pipeline";
import { currentUser } from "@/lib/require-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  if (!user.deepModeEnabled) {
    return NextResponse.json({ error: "Deep Mode research is invite-only right now." }, { status: 403 });
  }
  const body = (await req.json()) as { text?: string };
  const text = (body.text ?? "Research current world conditions relevant to my latest life state.").trim();
  const result = await ingestReality(user, `RESEARCH REQUEST: ${text}`, { deep: true });
  return NextResponse.json(result);
}
