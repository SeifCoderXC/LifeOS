import { NextResponse } from "next/server";
import { readLedger } from "@/lib/db";
import { currentUser } from "@/lib/require-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const ledger = await readLedger(user.id);
  return new NextResponse(JSON.stringify(ledger, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="lifeos-export.json"`,
    },
  });
}
