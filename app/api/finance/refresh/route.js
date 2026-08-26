import { NextResponse } from "next/server";
import { estraiFinanze, scaricaDaGoogleDrive } from "../../../../lib/finance";
import { getFinanceFile, saveFinanzeGiorno } from "../../../../lib/store";
import { today } from "../../../../lib/date";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MIME_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

// L'estrazione parte SOLO da qui — un pulsante che l'utente preme (o il
// cron) — mai dal caricamento di una pagina (Parte 5.8, la regola
// ferrea). Se è configurato un file su Google Drive lo scarica da lì
// (niente da ricaricare a mano ogni volta); altrimenti usa l'ultimo file
// caricato dalla dashboard.
export async function POST() {
  let contentBase64;
  let mimeType;

  const driveFileId = process.env.FINANCE_DRIVE_FILE_ID;
  if (driveFileId) {
    try {
      contentBase64 = await scaricaDaGoogleDrive(driveFileId);
      mimeType = MIME_XLSX;
    } catch (e) {
      return NextResponse.json({ error: e.message }, { status: 502 });
    }
  } else {
    const file = await getFinanceFile();
    if (!file) {
      return NextResponse.json({ error: "nessun file caricato ancora" }, { status: 400 });
    }
    contentBase64 = file.content_base64;
    mimeType = file.mime_type;
  }

  try {
    const estratto = await estraiFinanze(contentBase64, mimeType);
    const oggi = today();
    await saveFinanzeGiorno(oggi, { ...estratto, estratto_il: new Date().toISOString() });
    return NextResponse.json({ data: oggi, finanze: estratto });
  } catch (e) {
    return NextResponse.json({ error: "estrazione non riuscita: " + e.message }, { status: 502 });
  }
}
