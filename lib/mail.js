import "server-only";
import nodemailer from "nodemailer";

// Invio email via SMTP di Gmail (App Password, non OAuth: niente Google
// Cloud project da configurare, solo l'account che già usi — Parte
// "Clienti/Newsletter"). GMAIL_APP_PASSWORD si genera da
// myaccount.google.com/apppasswords (richiede la verifica in due passaggi
// attiva sull'account).

let transporter;
function mailer() {
  if (!transporter) {
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;
    if (!user || !pass) {
      throw new Error("GMAIL_USER o GMAIL_APP_PASSWORD mancanti");
    }
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });
  }
  return transporter;
}

function testoInHtml(corpo) {
  return corpo
    .split(/\n{2,}/)
    .map((par) => `<p>${par.replace(/\n/g, "<br>")}</p>`)
    .join("\n");
}

// Un invio per destinatario (mai in copia insieme): i clienti di un
// architetto non devono vedersi le email a vicenda in una newsletter.
export async function inviaEmail({ to, oggetto, corpo }) {
  const from = process.env.GMAIL_USER;
  await mailer().sendMail({
    from,
    to,
    subject: oggetto,
    html: testoInHtml(corpo),
  });
}
