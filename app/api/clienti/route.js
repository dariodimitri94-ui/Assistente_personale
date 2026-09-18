import { NextResponse } from "next/server";
import { addPersona, getPersone } from "../../../lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
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
