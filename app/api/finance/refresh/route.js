import { NextResponse } from "next/server";
import { estraiFinanze } from "../../../../lib/finance";
import { getFinanceFile, saveFinanzeGiorno } from "../../../../lib/store";
import { today } from "../../../../lib/date";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// L'estrazione parte SOLO da qui — un pulsante che l'utente preme — mai
// dal caricamento di una pagina (Parte 5.8, la regola ferrea). È la
// chiamata più costosa del sistema: dentro ci passa il foglio intero.
export async function POST() {
  const file = await getFinanceFile();
  if (!file) {
    return NextResponse.json({ error: "nessun file caricato ancora" }, { status: 400 });
  }

  try {
    const estratto = await estraiFinanze(file.content_base64, file.mime_type);
    const oggi = today();
    await saveFinanzeGiorno(oggi, { ...estratto, estratto_il: new Date().toISOString() });
    return NextResponse.json({ data: oggi, finanze: estratto });
  } catch (e) {
    return NextResponse.json({ error: "estrazione non riuscita: " + e.message }, { status: 502 });
  }
}
