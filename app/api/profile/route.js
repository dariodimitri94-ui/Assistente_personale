import { NextResponse } from "next/server";
import { getProfilo, getStriscia, updateProfilo } from "../../../lib/store";
import { today } from "../../../lib/date";

export const dynamic = "force-dynamic";

export async function GET() {
  const profilo = await getProfilo();
  if (!profilo) {
    return NextResponse.json({ profilo: null, striscia: 0 });
  }
  const striscia = await getStriscia(profilo.abitudini, today());
  return NextResponse.json({ profilo, striscia });
}

export async function PATCH(request) {
  const patch = await request.json().catch(() => ({}));
  const profilo = await updateProfilo(patch);
  return NextResponse.json({ profilo });
}
