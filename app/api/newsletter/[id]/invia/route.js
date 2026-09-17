import { NextResponse } from "next/server";
import { addRegistro, getClientiPerNewsletter, getNewsletter, updateNewsletter } from "../../../../../lib/store";
import { inviaEmail } from "../../../../../lib/mail";

export const dynamic = "force-dynamic";

// Invio vero e proprio: parte solo da qui, su pressione esplicita del
// pulsante nella scheda Newsletter — mai da un caricamento di pagina o da
// un cron, per lo stesso motivo per cui la classificazione non parte da sola.
export async function POST(request, { params }) {
  const { id } = await params;
  const newsletter = await getNewsletter(id);
  if (newsletter.stato === "inviata") {
    return NextResponse.json({ error: "già inviata" }, { status: 409 });
  }

  const clienti = await getClientiPerNewsletter(newsletter.tag_filtro || []);
  if (!clienti.length) {
    return NextResponse.json({ error: "nessun destinatario con email e consenso per questi tag" }, { status: 400 });
  }

  const falliti = [];
  // Un invio per volta, mai in copia: ogni cliente vede solo la propria email.
  for (const cliente of clienti) {
    try {
      await inviaEmail({ to: cliente.email, oggetto: newsletter.oggetto, corpo: newsletter.corpo });
    } catch (e) {
      falliti.push({ email: cliente.email, errore: e.message });
    }
  }

  const aggiornata = await updateNewsletter(id, {
    stato: "inviata",
    destinatari: clienti.length - falliti.length,
    falliti,
    inviata_il: new Date().toISOString(),
  });

  await addRegistro("newsletter.inviata", {
    id,
    oggetto: newsletter.oggetto,
    destinatari: aggiornata.destinatari,
    falliti: falliti.length,
  });

  return NextResponse.json({ newsletter: aggiornata });
}
