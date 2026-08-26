import crypto from "node:crypto";

const COOKIE_NAME = "personalos_session";
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function hmac(value) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET non impostata");
  return crypto.createHmac("sha256", secret).update(value).digest("hex");
}

// Confronto a tempo costante tra due stringhe, senza far trapelare la lunghezza.
export function timingSafeEqualStr(a, b) {
  const bufA = Buffer.from(String(a ?? ""));
  const bufB = Buffer.from(String(b ?? ""));
  if (bufA.length !== bufB.length) {
    // consuma comunque tempo, per non rivelare la differenza di lunghezza in modo grossolano
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

// Crea il valore del cookie di sessione: "<scadenza>.<firma>"
export function createSessionValue() {
  const expiresAt = Date.now() + THIRTY_DAYS_MS;
  const signature = hmac(String(expiresAt));
  return `${expiresAt}.${signature}`;
}

// Verifica che il cookie sia firmato correttamente e non scaduto.
export function isValidSessionValue(value) {
  if (!value || typeof value !== "string") return false;
  const [expiresAtStr, signature] = value.split(".");
  if (!expiresAtStr || !signature) return false;
  const expected = hmac(expiresAtStr);
  if (!timingSafeEqualStr(signature, expected)) return false;
  const expiresAt = Number(expiresAtStr);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;
  return true;
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
export const SESSION_MAX_AGE_SECONDS = THIRTY_DAYS_MS / 1000;
