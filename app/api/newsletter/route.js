import { NextResponse } from "next/server";
import { addNewsletter, getNewsletters } from "../../../lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const newsletters = await getNewsletters();
  return NextResponse.json({ newsletters });
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const { oggetto, corpo, tag_filtro } = body;
  if (!oggetto || typeof oggetto !== "string") {
    return NextResponse.json({ error: "oggetto mancante" }, { status: 400 });
  }
  if (!corpo || typeof corpo !== "string") {
    return NextResponse.json({ error: "corpo mancante" }, { status: 400 });
  }
  const bozza = await addNewsletter({
    oggetto,
    corpo,
    tag_filtro: Array.isArray(tag_filtro) ? tag_filtro : [],
    stato: "bozza",
  });
  return NextResponse.json({ newsletter: bozza });
}
