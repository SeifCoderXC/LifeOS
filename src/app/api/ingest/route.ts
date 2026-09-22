import { NextResponse } from "next/server";
import { ingestReality } from "@/lib/pipeline";
import { currentUser } from "@/lib/require-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  try {
    const body = (await req.json()) as { text?: string; deep?: boolean };
    const text = (body.text ?? "").trim();
    if (!text) {
      return NextResponse.json({ error: "text required" }, { status: 400 });
    }
    const result = await ingestReality(user, text, { deep: Boolean(body.deep) });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
