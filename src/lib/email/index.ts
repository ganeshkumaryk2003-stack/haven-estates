import "server-only";
import { env } from "@/lib/env";

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface EmailDriver {
  send(message: EmailMessage): Promise<void>;
}

class ConsoleEmailDriver implements EmailDriver {
  async send(message: EmailMessage) {
    console.info(`\n📧 [email:console] To: ${message.to}\nSubject: ${message.subject}\n\n${message.text}\n`);
  }
}

// Delivers via Mailpit's HTTP API (docker compose service) so local development has a real inbox.
class MailpitEmailDriver implements EmailDriver {
  async send(message: EmailMessage) {
    const from = parseAddress(env.EMAIL_FROM);
    const response = await fetch(`${env.MAILPIT_API_URL.replace(/\/$/, "")}/api/v1/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        From: from,
        To: [{ Email: message.to }],
        Subject: message.subject,
        HTML: message.html,
        Text: message.text,
      }),
    });
    if (!response.ok) {
      throw new Error(`Mailpit rejected the email (${response.status}): ${await response.text()}`);
    }
  }
}

class ResendEmailDriver implements EmailDriver {
  async send(message: EmailMessage) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: env.EMAIL_FROM, to: [message.to], subject: message.subject, html: message.html, text: message.text }),
    });
    if (!response.ok) {
      throw new Error(`Resend rejected the email (${response.status}): ${await response.text()}`);
    }
  }
}

function parseAddress(value: string) {
  const match = value.match(/^(.*)<([^>]+)>$/);
  if (match) return { Name: match[1]?.trim().replace(/^"|"$/g, "") ?? "", Email: match[2]?.trim() ?? value };
  return { Name: "", Email: value.trim() };
}

function createDriver(): EmailDriver {
  switch (env.EMAIL_DRIVER) {
    case "resend":
      return new ResendEmailDriver();
    case "mailpit":
      return new MailpitEmailDriver();
    default:
      return new ConsoleEmailDriver();
  }
}

const driver = createDriver();

// Email failures must never break the user-facing action (e.g. signup). Errors are logged and,
// for the console driver fallback, the content is still printed so links remain usable in dev.
export async function sendEmail(message: EmailMessage) {
  try {
    await driver.send(message);
  } catch (error) {
    console.error("[email] delivery failed, falling back to console output", error);
    await new ConsoleEmailDriver().send(message);
  }
}
