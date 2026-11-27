import {test} from 'node:test';
import assert from 'node:assert/strict';
import {contentValidationMessage,serviceContentSchema,portfolioContentSchema,publicSettingsSchema,defaultPublicSettings,faqContentSchema} from '../../src/shared/content-contracts.ts';
import {requestCategories} from '../../src/shared/request-contracts.ts';
import {safePublicProjectUrl} from '../../src/server/content/policy.ts';
test('editorial validation preserves canonical request categories and Persian ZWNJ while rejecting controls and mass assignment',()=>{
  assert.deepEqual(Object.keys(requestCategories),['WEBSITE','WEB_APP','DISCORD_BOT','TELEGRAM_BOT','TEAMSPEAK_BOT','DASHBOARD','SEO','AUTOMATION','OTHER']);
  const s={title:'وب‌سایت اختصاصی',summary:'معرفی خوانا و واقعی خدمات نوایر',body:'',category:'WEBSITE',highlights:[],published:false,sortOrder:0};assert(serviceContentSchema.safeParse(s).success);
  for(const extra of[{role:'ADMIN'},{ownerId:'forged'},{title:'unsafe\u202e title'},{highlights:['one','one']},{sortOrder:0.5}])assert(!serviceContentSchema.safeParse({...s,...extra}).success);
  assert(!faqContentSchema.safeParse({question:'عنوان',answer:'کوتاه',published:true,sortOrder:0,authorId:'fake'}).success);
  const invalidOrder=serviceContentSchema.safeParse({...s,sortOrder:0.5});assert.equal(invalidOrder.success,false);assert.match(contentValidationMessage(invalidOrder.error.issues[0].message),/مقدار این بخش معتبر نیست/);
});
test('public settings cannot accept infrastructure keys or unsafe contacts and portfolio links remain public HTTPS',()=>{
  assert(publicSettingsSchema.safeParse(defaultPublicSettings).success);
  for(const value of[{DATABASE_URL:'secret'},{BETTER_AUTH_SECRET:'secret'},{role:'ADMIN'},{trustedProxy:'*'},{github:'https://github.com/login?return_to=evil'},{telegram:'https://example.com/name'},{email:'a@example.com\r\nBcc:evil'}])assert(!publicSettingsSchema.safeParse({...defaultPublicSettings,...value}).success);
  for(const value of['javascript:alert(1)','https://localhost.','https://admin.internal/path','https://bit.ly/example','https://example.com/?redirect=https://localhost','https://127.0.0.1/'])assert.equal(safePublicProjectUrl(value),null);
  assert(!portfolioContentSchema.safeParse({title:'نام',summary:'متن کافی برای معرفی',body:'توضیحات کافی دربارهٔ یک کار واقعی.',category:'',technologies:[],externalUrl:'data:text/html,evil',imageKey:null,published:true,sortOrder:0}).success);
});
