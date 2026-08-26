import { NextResponse } from "next/server";
import { embed } from "../../../../lib/embeddings";
import { cercaMemoriaPerSomiglianza } from "../../../../lib/store";

export const dynamic = "force-dynamic";

// L'operatore di distanza vettoriale non si esprime con le query normali
// del client: la ricerca vive in match_memoria e si chiama via rpc()
// (Parte 6 / A15).
export async function POST(request) {
  const { domanda } = await request.json().catch(() => ({}));
  if (!domanda) {
    return NextResponse.json({ error: "domanda mancante" }, { status: 400 });
  }
  const embedding = await embed(domanda);
  if (!embedding) {
    return NextResponse.json({ voci: [] });
  }
  const voci = await cercaMemoriaPerSomiglianza(embedding, 20);
  return NextResponse.json({ voci });
}
