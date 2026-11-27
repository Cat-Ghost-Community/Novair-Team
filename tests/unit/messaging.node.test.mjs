import assert from "node:assert/strict";
import { test } from "node:test";
import nodemailer from "nodemailer";
import { gmailSettings, iranianMobile, smsSettings } from "../../scripts/messaging-config.mjs";
import { createGmailDelivery, gmailTransportOptions, sendSmsTemplate } from "../../scripts/messaging-transports.mjs";

const gmail = { address: "studio@example.org", appPassword: "abcdefghijklmnop", port: 465 };
const sms = { apiKey: "fixture-key", templateId: 42, parameter: "CODE" };

test("Gmail is pinned to verified TLS on both supported SMTP ports", () => {
  assert.equal(gmailTransportOptions(gmail).host, "smtp.gmail.com");
  assert.equal(gmailTransportOptions(gmail).secure, true);
  const starttls = gmailTransportOptions({ ...gmail, port: 587 });
  assert.equal(starttls.secure, false);
  assert.equal(starttls.requireTLS, true);
  assert.equal(starttls.tls.rejectUnauthorized, true);
  assert(!gmailSettings.safeParse({ ...gmail, port: 25 }).success);
  assert(!gmailSettings.safeParse({ ...gmail, address: "studio@example.org\r\nBcc: bad@example.org" }).success);
});

test("Gmail verification and sending are distinct, single-recipient operations", async () => {
  let verifyCount = 0;
  const accepted = [];
  const delivery = createGmailDelivery(gmail, () => ({
    async verify() { verifyCount++; return true; },
    async sendMail(message) {
      accepted.push(message);
      return { accepted: [message.to], rejected: [], messageId: "test-id" };
    },
  }));
  await delivery.verify();
  assert.equal(verifyCount, 1);
  assert.equal(accepted.length, 0);
  assert.deepEqual(await delivery.send({ to: "recipient@example.org", subject: "آزمایش", text: "نمونه" }),
    { status: "accepted", messageId: "test-id" });
  assert.equal(accepted[0].from.address, gmail.address);
  assert.equal(accepted[0].to, "recipient@example.org");
  await assert.rejects(delivery.send({ to: "a@example.org,b@example.org", subject: "test", text: "test" }), /single email/);
  assert.equal(accepted.length, 1);
});

test("Nodemailer can serialize the Persian test mail without opening a network connection", async () => {
  const stream = nodemailer.createTransport({ streamTransport: true, buffer: true, newline: "unix" });
  const delivery = createGmailDelivery(gmail, () => ({
    async sendMail(message) {
      const result = await stream.sendMail(message);
      const mime = result.message.toString("utf8");
      assert.match(mime, /^From: NovAir <studio@example.org>/m);
      assert.match(mime, /^To: recipient@example.org/m);
      assert.match(mime, /^Subject: =\?UTF-8\?[BQ]\?/im);
      assert.match(mime, /^Content-Type: text\/plain; charset=utf-8/im);
      return { ...result, accepted: result.envelope.to };
    },
  }));
  assert.equal((await delivery.send({ to: "recipient@example.org", subject: "آزمایش ایمیل", text: "نمونهٔ نوایر" })).status, "accepted");
});

test("sms.ir accepts Iranian number formats and submits only the approved template parameter", async () => {
  for (const mobile of ["+989121234567", "۰۹۱۲۱۲۳۴۵۶۷", "٠٩١٢١٢٣٤٥٦٧", "0912 123 4567"]) {
    assert.equal(iranianMobile(mobile), "09121234567");
  }
  assert.throws(() => iranianMobile("+15551234567"), /Iranian mobile/);
  const outcome = await sendSmsTemplate(sms, "09121234567", "123456", async (url, request) => {
    assert.equal(url, "https://api.sms.ir/v1/send/verify");
    assert.equal(request.redirect, "error");
    assert.equal(request.headers["X-API-KEY"], sms.apiKey);
    assert.deepEqual(JSON.parse(request.body), { mobile: "09121234567", templateId: 42, parameters: [{ name: "CODE", value: "123456" }] });
    return new Response(JSON.stringify({ status: 1, data: { messageId: 123 } }));
  });
  assert.deepEqual(outcome, { status: "accepted", messageId: "123" });
});

test("provider rejects and malformed receipts stay failures with no secrets in diagnostics", async () => {
  assert(!smsSettings.safeParse({ ...sms, apiKey: "fixture-key\n" }).success);
  assert(!smsSettings.safeParse({ ...sms, parameter: "CODE\n" }).success);
  for (const response of [
    new Response(JSON.stringify({ status: 2, message: sms.apiKey })),
    new Response(JSON.stringify({ status: 1, data: {} })),
    new Response("x".repeat(16_385)),
    new Response(sms.apiKey, { status: 403 }),
  ]) {
    await assert.rejects(sendSmsTemplate(sms, "09121234567", "123456", async () => response), error =>
      /did not confirm acceptance/.test(error.message) && !error.message.includes(sms.apiKey));
  }
  const delivery = createGmailDelivery(gmail, () => ({ async verify() { throw new Error(gmail.appPassword); } }));
  await assert.rejects(delivery.verify(), error => !error.message.includes(gmail.appPassword) && /verification failed/.test(error.message));
});
