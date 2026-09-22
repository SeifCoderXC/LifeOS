import { NextResponse } from "next/server";
import { readLedger } from "@/lib/db";
import { currentUser } from "@/lib/require-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const ledger = await readLedger(user.id);
  return NextResponse.json({ events: [...ledger.events].reverse(), intakes: [...ledger.intakes].reverse() });
}
