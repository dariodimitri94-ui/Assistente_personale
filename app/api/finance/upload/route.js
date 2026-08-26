import { NextResponse } from "next/server";
import { saveFinanceFile } from "../../../../lib/store";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "file mancante" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const contentBase64 = buffer.toString("base64");

  const record = await saveFinanceFile({
    filename: file.name,
    mimeType: file.type || "application/octet-stream",
    contentBase64,
  });

  return NextResponse.json({ filename: record.filename, uploadedAt: record.uploaded_at });
}
