import { NextResponse } from "next/server";
import { isValidSessionValue, SESSION_COOKIE_NAME, timingSafeEqualStr } from "./lib/auth";

// Rotte che passano senza cookie di sessione, perché a bussare non è
// un browser con una sessione: la pagina di login stessa, il webhook
// di Telegram (protetto dal suo segreto) e gli endpoint del cron
// (protetti dal Bearer CRON_SECRET). Ognuna si protegge da sola.
const PUBLIC_PATHS = [/^\/login($|\/)/, /^\/api\/auth\//, /^\/api\/telegram\/webhook$/, /^\/api\/cron\//];

function isPublicPath(pathname) {
  return PUBLIC_PATHS.some((re) => re.test(pathname));
}

export default function proxy(request) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Accesso da script: intestazione x-api-secret confrontata a tempo costante.
  const apiSecretHeader = request.headers.get("x-api-secret");
  if (apiSecretHeader && process.env.API_SECRET && timingSafeEqualStr(apiSecretHeader, process.env.API_SECRET)) {
    return NextResponse.next();
  }

  const cookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (isValidSessionValue(cookie)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "non autorizzato" }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    // Tutto tranne gli asset statici interni di Next — quelli non vanno
    // mai bloccati, o CSS/JS/immagini smettono di caricare.
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
