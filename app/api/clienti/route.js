import { NextResponse } from "next/server";
import { addPersona, getClientiPerNewsletter, getPersone } from "../../../lib/store";

export const dynamic = "force-dynamic";

// ?perNewsletter=1&tag=a&tag=b → solo clienti con consenso ed email,
// filtrati per tag (usato dalla scheda Newsletter per l'anteprima).
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get("perNewsletter") === "1") {
    const tag = searchParams.getAll("tag").filter(Boolean);
    const clienti = await getClientiPerNewsletter(tag);
    return NextResponse.json({ clienti });
  }
  const clienti = await getPersone();
  return NextResponse.json({ clienti });
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const { nome, email, telefono, organizzazione, tipo, tag, consenso_newsletter, metadati } = body;
  if (!nome || typeof nome !== "string") {
    return NextResponse.json({ error: "nome mancante" }, { status: 400 });
  }
  const cliente = await addPersona({
    nome,
    email: email || null,
    telefono: telefono || null,
    organizzazione: organizzazione || null,
    tipo: tipo || "cliente",
    tag: Array.isArray(tag) ? tag : [],
    consenso_newsletter: consenso_newsletter !== false,
    metadati: metadati || {},
  });
  return NextResponse.json({ cliente });
}
