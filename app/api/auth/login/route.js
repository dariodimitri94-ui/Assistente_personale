import { NextResponse } from "next/server";
import { createSessionValue, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS, timingSafeEqualStr } from "../../../../lib/auth";

export async function POST(request) {
  const { password } = await request.json().catch(() => ({}));
  const expected = process.env.DASHBOARD_PASSWORD;

  if (!expected) {
    return NextResponse.json({ error: "DASHBOARD_PASSWORD non configurata" }, { status: 500 });
  }

  if (!password || !timingSafeEqualStr(password, expected)) {
    return NextResponse.json({ error: "password errata" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, createSessionValue(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  });
  return response;
}
