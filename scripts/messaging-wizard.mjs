import { randomInt } from "node:crypto";
import { homedir } from "node:os";
import { isAbsolute, join } from "node:path";
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { emailAddress, gmailSettings, iranianMobile, readMessagingSettings, saveMessagingSettings, smsSettings } from "./messaging-config.mjs";
import { createGmailDelivery, sendSmsTemplate } from "./messaging-transports.mjs";

export async function messagingWizard() {
  if (process.platform !== "linux" || process.getuid() === 0 || !process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error("Open the messaging wizard in a Linux terminal as the non-root NovAir service user.");
  }
  const base = process.env.XDG_CONFIG_HOME || join(homedir(), ".config");
  if (!isAbsolute(base)) throw new Error("XDG_CONFIG_HOME must be an absolute path.");
  const directory = join(base, "novair-messaging");
  const original = await readMessagingSettings(directory);

  let secret = false;
  const output = new Writable({
    write(chunk, encoding, next) {
      if (secret) next();
      else process.stdout.write(chunk, encoding, next);
    },
  });
  const prompt = createInterface({ input: process.stdin, output, terminal: true, historySize: 0 });
  const abort = new AbortController();
  prompt.on("SIGINT", () => abort.abort());
  const ask = async label => (await prompt.question(label, { signal: abort.signal })).trim();
  async function askSecret(label) {
    process.stdout.write(label);
    secret = true;
    try { return await ask(""); }
    finally { secret = false; process.stdout.write("\n"); }
  }
  const configured = name => original[name] ? "saved" : "unset";
  try {
    console.log(`NovAir messaging · Gmail ${configured("gmail")} · sms.ir ${configured("sms")}`);
    console.log("1  Configure Gmail SMTP\n2  Configure sms.ir\n3  Verify Gmail connection\n4  Send one test email\n5  Send one test SMS\n6  Remove settings\n0  Exit");
    switch (await ask("Choose an action: ")) {
      case "0": return;
      case "1": {
        const address = await ask("Gmail / Google Workspace email address: ") || original.gmail?.address;
        const defaultPort = original.gmail?.port ?? 587;
        const port = Number(await ask(`SMTP port (465 TLS or 587 STARTTLS) [${defaultPort}]: `) || defaultPort);
        const appPassword = (await askSecret("Google App Password (blank keeps it only for the same address): ")).replace(/ /g, "") ||
          (address === original.gmail?.address ? original.gmail?.appPassword : undefined);
        const result = gmailSettings.safeParse({ address, port, appPassword });
        if (!result.success) throw new Error("Enter an email address, port 465 or 587, and a valid 16-character Google App Password.");
        await saveMessagingSettings(directory, original, { ...original, gmail: result.data });
        console.log("Gmail settings saved. Use the connection test to check the credentials.");
        return;
      }
      case "2": {
        const apiKey = await askSecret("sms.ir API key (blank keeps the saved key): ") || original.sms?.apiKey;
        const templateId = Number(await ask("Approved sms.ir verification template ID: ") || original.sms?.templateId);
        const parameter = await ask(`Template parameter name [${original.sms?.parameter ?? "CODE"}]: `) || original.sms?.parameter || "CODE";
        const result = smsSettings.safeParse({ apiKey, templateId, parameter });
        if (!result.success) throw new Error("Enter an sms.ir API key, a positive template ID, and its exact parameter name.");
        await saveMessagingSettings(directory, original, { ...original, sms: result.data });
        console.log("sms.ir settings saved. The test-send option checks whether the provider accepts your template.");
        return;
      }
      case "3": {
        if (!original.gmail) throw new Error("Configure Gmail first.");
        await createGmailDelivery(original.gmail).verify();
        console.log("Gmail accepted the SMTP credentials.");
        return;
      }
      case "4": {
        if (!original.gmail) throw new Error("Configure Gmail first.");
        const to = await ask("Your test mailbox address: ");
        if (!emailAddress.safeParse(to).success) throw new Error("Enter one valid mailbox address.");
        if (await ask("Type SEND to send one email to that address: ") !== "SEND") return;
        await createGmailDelivery(original.gmail).send({ to, subject: "آزمایش ارسال ایمیل نوایر", text: "این پیام برای آزمایش ارسال ایمیل از نوایر فرستاده شده است." });
        console.log("Gmail accepted the test email. Check your inbox and spam folder to confirm delivery.");
        return;
      }
      case "5": {
        if (!original.sms) throw new Error("Configure sms.ir first.");
        const mobile = iranianMobile(await ask("Your Iranian test mobile number: "));
        if (await ask("Type SEND to send one SMS using your account credit: ") !== "SEND") return;
        await sendSmsTemplate(original.sms, mobile, String(randomInt(100_000, 1_000_000)));
        console.log("sms.ir accepted the test SMS. Check your handset to confirm delivery.");
        return;
      }
      case "6": {
        const channel = await ask("Remove which provider? Enter gmail or sms: ");
        if (!["gmail", "sms"].includes(channel) || !original[channel]) throw new Error("Choose a saved provider.");
        if (await ask("Type REMOVE to delete its saved credentials from NovAir: ") !== "REMOVE") return;
        const updated = { ...original };
        delete updated[channel];
        await saveMessagingSettings(directory, original, updated);
        console.log("Provider settings removed from NovAir.");
        return;
      }
      default: throw new Error("Choose one of the displayed menu options.");
    }
  } finally { prompt.close(); }
}
