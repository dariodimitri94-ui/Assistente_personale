import { NextResponse } from "next/server";
import { getFinanceFile, getUltimeIstantaneeFinanze } from "../../../lib/store";

export const dynamic = "force-dynamic";

// La scheda legge sempre l'ultima istantanea salvata — mai il file.
export async function GET() {
  const [file, istantanee] = await Promise.all([getFinanceFile(), getUltimeIstantaneeFinanze()]);

  const ultima = istantanee[0] || null;
  const precedente = istantanee[1] || null;

  const suGoogleDrive = !!process.env.FINANCE_DRIVE_FILE_ID;

  return NextResponse.json({
    file: suGoogleDrive
      ? { filename: "Google Drive", uploadedAt: null, drive: true }
      : file
      ? { filename: file.filename, uploadedAt: file.uploaded_at }
      : null,
    ultima: ultima ? { data: ultima.data, ...ultima.finanze } : null,
    deltaSaldo:
      ultima && precedente ? Math.round((ultima.finanze.saldo - precedente.finanze.saldo) * 100) / 100 : null,
    storico: istantanee.map((r) => ({ data: r.data, saldo: r.finanze.saldo })).reverse(),
  });
}
