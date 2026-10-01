import { NextResponse } from "next/server";
import { costruisciCervello } from "../../../lib/brain";

export const dynamic = "force-dynamic";
export const maxDuration = 20;

export async function GET() {
  const cervello = await costruisciCervello();
  return NextResponse.json(cervello, { headers: { "Cache-Control": "no-store" } });
}
