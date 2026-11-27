import nodemailer from "nodemailer";
import { emailAddress, gmailSettings, iranianMobile, smsSettings } from "./messaging-config.mjs";

export function gmailTransportOptions(config) {
  const { address, appPassword, port } = gmailSettings.parse(config);
  return {
    host: "smtp.gmail.com", port, secure: port === 465, requireTLS: port === 587,
    auth: { user: address, pass: appPassword },
    tls: { minVersion: "TLSv1.2", rejectUnauthorized: true },
    connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 15_000,
    disableFileAccess: true, disableUrlAccess: true, maxRecipients: 1,
    logger: false, debug: false,
  };
}

export function createGmailDelivery(config, createTransport = nodemailer.createTransport) {
  const options = gmailTransportOptions(config);
  const transport = createTransport(options);
  return {
    async verify() {
      try {
        if (await transport.verify() !== true) throw new Error();
      } catch { throw new Error("Gmail SMTP verification failed. Check outbound SMTP access and the App Password."); }
    },
    async send({ to, subject, text }) {
      if (!emailAddress.safeParse(to).success || typeof subject !== "string" || !subject.trim() ||
        subject.length > 150 || /[\r\n\u0000]/.test(subject) || typeof text !== "string" || !text.trim() || text.length > 8000) {
        throw new Error("Enter a valid single email recipient and a bounded plain-text message.");
      }
      try {
        const result = await transport.sendMail({ from: { name: "NovAir", address: options.auth.user }, to, subject, text });
        if (result.accepted?.length !== 1 || result.rejected?.length || typeof result.messageId !== "string" || !result.messageId) throw new Error();
        return { status: "accepted", messageId: result.messageId };
      } catch { throw new Error("Gmail did not confirm acceptance. Check the mailbox before retrying."); }
    },
  };
}

async function readSmsResponse(response) {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body.");
  const chunks = [];
  let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > 16_384) throw new Error("Oversized response.");
      chunks.push(value);
    }
  } finally { await reader.cancel().catch(() => {}); }
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks)));
}

export async function sendSmsTemplate(config, recipient, value, request = fetch) {
  const { apiKey, templateId, parameter } = smsSettings.parse(config);
  const mobile = iranianMobile(recipient);
  if (typeof value !== "string" || !value.trim() || value.length > 25 || /[\u0000-\u001f\u007f]/.test(value)) {
    throw new Error("The sms.ir template value must be between 1 and 25 printable characters.");
  }
  if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === "0") throw new Error("Enable TLS certificate verification before using sms.ir.");
  try {
    const response = await request("https://api.sms.ir/v1/send/verify", {
      method: "POST", redirect: "error", signal: AbortSignal.timeout(12_000),
      headers: { "Accept": "application/json", "Content-Type": "application/json", "X-API-KEY": apiKey },
      body: JSON.stringify({ mobile, templateId, parameters: [{ name: parameter, value }] }),
    });
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error();
    }
    const result = await readSmsResponse(response);
    if (result?.status !== 1 || !Number.isSafeInteger(result.data?.messageId) || result.data.messageId <= 0) throw new Error();
    return { status: "accepted", messageId: String(result.data.messageId) };
  } catch { throw new Error("sms.ir did not confirm acceptance. Check the template, credit, and provider logs before retrying."); }
}
