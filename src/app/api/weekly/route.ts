import { NextResponse } from "next/server";
import { getWeekly } from "@/lib/pipeline";
import { currentUser } from "@/lib/require-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  return NextResponse.json(await getWeekly(user.id));
}
