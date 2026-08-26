import { NextResponse } from "next/server";
import { getAllData } from "../../../../lib/store";
import { isValidSessionValue, SESSION_COOKIE_NAME } from "../../../../lib/auth";

export const dynamic = "force-dynamic";

const SCHEMA_VERSION = 1;

export async function GET(request) {
  // Questa rotta restituisce tutto il database: qui la porta di servizio
  // (x-api-secret) non entra, vuole esplicitamente il cookie di sessione
  // di un browser autenticato (Parte 7.6).
  const cookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!isValidSessionValue(cookie)) {
    return NextResponse.json({ error: "non autorizzato" }, { status: 401 });
  }

  const dati = await getAllData();
  const payload = {
    generato_il: new Date().toISOString(),
    versione_schema: SCHEMA_VERSION,
    ...dati,
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="personalos-backup-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
