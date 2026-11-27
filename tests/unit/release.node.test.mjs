import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registrationSchema } from '../../src/shared/auth-contracts.ts';
import { nameSchema } from '../../src/shared/validation.ts';
import { requestSchema } from '../../src/shared/request-contracts.ts';
import { resolveSiteProfile } from '../../src/config/site-profile.ts';

test('indexing requires a build-time production opt-in and a canonical public HTTPS origin', () => {
  assert.equal(resolveSiteProfile({}).index, false);
  assert.equal(resolveSiteProfile({}).url.href, 'http://127.0.0.1:3000/');
  assert.throws(() => resolveSiteProfile({ NOVAIR_INDEX_PUBLIC: 'true' }));

  const env = { NODE_ENV: 'production', NOVAIR_SITE_PROFILE: 'production', NOVAIR_INDEX_PUBLIC: 'true' };
  assert.equal(resolveSiteProfile({ ...env, SITE_URL: 'https://studio.example.org' }).index, true);
  assert.equal(resolveSiteProfile({ ...env, NOVAIR_INDEX_PUBLIC: 'false', SITE_URL: 'https://studio.example.org' }).index, false);
  for (const SITE_URL of ['http://studio.example.org', 'https://localhost', 'https://project.local', 'https://127.0.0.1', 'https://studio.example.org:444', 'https://user@studio.example.org', 'https://studio.example.org/path', 'https://studio.example.org/?test=1']) {
    assert.throws(() => resolveSiteProfile({ ...env, SITE_URL }));
  }
  assert.throws(() => resolveSiteProfile({ ...env, SITE_URL: 'https://studio.example.org', AUTH_ENABLED: 'true' }));
});

test('account/bootstrap names reject controls and bidi overrides while preserving Persian ZWNJ/NFC', () => {
  const registration = name => registrationSchema.safeParse({ name, email: 'test@example.invalid', password: 'Release-Password-123', passwordConfirmation: 'Release-Password-123' });
  for (const name of ['مشتری\u202eADMIN', 'name\u0000text', 'name\ntext', 'name\u2066text', 'name\u009ftext']) {
    assert.equal(registration(name).success, false);
    assert.equal(nameSchema.safeParse(name).success, false);
  }
  assert.equal(registration(' علی\u200cرضا ').data.name, 'علی\u200cرضا');
  assert.equal(nameSchema.parse('Cafe\u0301'), 'Café');
});

test('request links enforce the stored length after percent encoding, not only before', () => {
  const input = { operationKey: crypto.randomUUID(), title: 'درخواست معتبر', category: 'WEBSITE', description: 'توضیحات واقعی پروژه با تعداد نویسهٔ کافی برای بررسی.' };
  assert.equal(requestSchema.safeParse({ ...input, relevantUrl: 'https://example.com/' + 'ا'.repeat(300) }).success, false);
  const result = requestSchema.parse({ ...input, relevantUrl: 'https://example.com/مسیر' });
  assert(result.relevantUrl.length <= 1000);
  assert.equal(new URL(result.relevantUrl).pathname, '/%D9%85%D8%B3%DB%8C%D8%B1');
});
