import nodemailer from "nodemailer";

export const mailEnabled = !!(
  process.env.SMTP_HOST &&
  process.env.SMTP_USER &&
  process.env.SMTP_PASS
);

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT || 587) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
}

interface MailInput {
  to: string;
  subject: string;
  text: string;
}

/**
 * Sends an email via SMTP when configured; otherwise logs to the server log
 * so flows remain fully testable in development.
 */
export async function sendMail({ to, subject, text }: MailInput): Promise<void> {
  if (!mailEnabled) {
    console.log(`[MAIL:dev] to=${to} subject="${subject}"\n${text}`);
    return;
  }
  try {
    await getTransporter().sendMail({
      from: process.env.MAIL_FROM || "Guild <no-reply@guild.app>",
      to,
      subject,
      text,
    });
  } catch (err) {
    console.error("[mail] send failed:", err);
  }
}
