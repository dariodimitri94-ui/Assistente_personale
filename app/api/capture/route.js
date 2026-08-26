import { NextResponse } from "next/server";
import { processCapture } from "../../../lib/capture";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const { testo } = await request.json().catch(() => ({}));
  if (!testo || typeof testo !== "string" || !testo.trim()) {
    return NextResponse.json({ error: "testo mancante" }, { status: 400 });
  }

  const { destinazione, urgenza, via, catturaId } = await processCapture(testo);
  return NextResponse.json({ destinazione, urgenza, via, id: catturaId });
}
