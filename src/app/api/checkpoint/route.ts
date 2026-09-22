import { NextResponse } from "next/server";
import { markCheckpoint } from "@/lib/pipeline";
import { currentUser } from "@/lib/require-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const snap = await markCheckpoint(user.id);
  return NextResponse.json({ ok: true, snapshot: snap });
}
