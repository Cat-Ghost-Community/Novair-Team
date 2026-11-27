import { test, before, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomBytes, randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { createRequestsService } from "../../src/server/requests/service.ts";
import { createAuthentication } from "../../src/server/auth/service.ts";

const origin = process.env.SITE_URL;
const context = JSON.parse(await readFile(".local-tools/auth-test-context.json", "utf8"));
assert.equal(origin, context.origin); assert(/^novair_auth_test_[a-f0-9]{12}$/.test(context.name));
assert.equal(new URL(process.env.DATABASE_URL).pathname, `/${context.name}`);
const db = new PrismaClient();
const password = randomBytes(20).toString("hex");
const cookies = (response) => response.headers.getSetCookie().map((value) => value.split(";")[0]).filter((value) => !value.endsWith("=")).join("; ");
const requestBody = (changes = {}) => ({ operationKey: randomUUID(), title: "وب‌سایت کارگاه و نمایش خدمات", category: "WEBSITE", description: "یک وب‌سایت فارسی برای معرفی کارگاه، خدمات و راهنمای سفارش نیاز دارم.", budgetPreference: "UNDECIDED", timelinePreference: "FLEXIBLE", relevantUrl: "", ...changes });
const call = (path, cookie = "", body, extra = {}) => fetch(`${origin}${path}`, { method: body === undefined ? "GET" : "POST", redirect: "manual", headers: { origin, cookie, ...(body === undefined ? {} : { "content-type": "application/json" }), ...extra }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
let a, b, admin;
async function register() {
  const response = await call("/api/auth/sign-up/email", "", { name: "کاربر آزمون درخواست", email: `request-${randomBytes(7).toString("hex")}@example.invalid`, password, passwordConfirmation: password });
  assert.equal(response.status, 200); return { cookie: cookies(response), user: (await response.json()).user };
}
async function create(owner = a, payload = requestBody()) {
  const response = await call("/api/requests", owner.cookie, payload);
  assert.equal(response.status, 201, "A genuine new request must persist.");
  return { ...(await response.json()), payload };
}
before(async () => {
  assert.equal((await db.siteSetting.findUnique({ where: { key: "__novair_auth_test" } })).value.nonce, context.nonce);
  await db.rateLimit.deleteMany(); a = await register(); b = await register();
  const login = await call("/api/auth/sign-in/email", "", { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD });
  assert.equal(login.status, 200); admin = { cookie: cookies(login), user: (await login.json()).user };
});
beforeEach(async () => { await db.rateLimit.deleteMany(); }); // Owned disposable database only.
after(async () => { await db.$disconnect(); });

test("a USER creates a real NEW request and attributed creation event atomically", async () => {
  const saved = await create(); assert.equal(saved.ok, true); assert.equal(saved.status, "NEW"); assert.equal(saved.replayed, false);
  assert.match(saved.id, /^[a-f0-9-]{36}$/);
  const record = await db.projectRequest.findUniqueOrThrow({ where: { id: saved.id }, include: { history: true } });
  assert.equal(record.ownerId, a.user.id); assert.equal(record.category, "WEBSITE"); assert.equal(record.serviceId, null);
  assert.equal(record.history.length, 1); assert.equal(record.history[0].actorId, a.user.id); assert.equal(record.history[0].fromStatus, null); assert.equal(record.history[0].toStatus, "NEW");
  assert.equal(record.submissionKey, saved.payload.operationKey); assert.match(record.submissionHash, /^[a-f0-9]{64}$/);
  assert(!JSON.stringify(saved).includes("ownerId")); assert(!JSON.stringify(saved).includes("submissionHash"));
});

test("anonymous, forged, and ADMIN callers cannot create/list/recover customer requests", async () => {
  for (const [cookie, code] of [["",401],["novair.session_token=forged; role=ADMIN",401],[admin.cookie,403]]) {
    assert.equal((await call("/api/requests", cookie, requestBody())).status, code);
    assert.equal((await call("/api/requests", cookie)).status, code);
    assert.equal((await call(`/api/requests/operation/${randomUUID()}`, cookie)).status, code);
  }
});

test("missing fields, invalid categories, excessive text and injected privilege/owner fields fail strict validation", async () => {
  const before = await db.projectRequest.count();
  for (const change of [{title:""},{description:"کوتاه"},{description:"الف".repeat(2100)},{title:"x".repeat(151)},{category:"ARBITRARY"},{category:""},{ownerId:b.user.id},{status:"ACCEPTED"},{role:"ADMIN"},{serviceId:"invented"},{id:randomUUID()},{budgetPreference:"FREE"},{timelinePreference:"GUARANTEED"},{operationKey:"bad-key"},{description:"نامعتبر\u0000با متن کافی برای ثبت درخواست"}]) {
    const response = await call("/api/requests", a.cookie, requestBody(change)); assert.equal(response.status,400);
    assert.equal((await response.json()).ok,false);
  }
  assert.equal((await call("/api/requests", a.cookie, {})).status,400);
  assert.equal(await db.projectRequest.count(), before);
});

test("optional URLs reject active schemes, credentials, local addresses and malformed links", async () => {
  for (const url of ["javascript:alert(1)","data:text/html,bad","http://example.com","https://name:secret@example.com","https://127.0.0.1","https://[::1]","https://intranet.local","not a url","https://example.com\\evil"]) assert.equal((await call("/api/requests",a.cookie,requestBody({relevantUrl:url}))).status,400);
  const saved=await create(a,requestBody({relevantUrl:"  https://example.com/reference?q=one  "}));
  assert.equal((await db.projectRequest.findUnique({where:{id:saved.id}})).relevantUrl,"https://example.com/reference?q=one");
});

test("same committed key is replayed without a second request/history and normalized payloads agree", async () => {
  const saved=await create(); const replay=await call("/api/requests",a.cookie,{...saved.payload,title:`  ${saved.payload.title}  `});
  assert.equal(replay.status,200); const result=await replay.json(); assert.equal(result.id,saved.id); assert.equal(result.replayed,true);
  assert.equal(await db.projectRequest.count({where:{ownerId:a.user.id,submissionKey:saved.payload.operationKey}}),1);
  assert.equal(await db.projectRequestStatusHistory.count({where:{requestId:saved.id}}),1);
});

test("eight concurrent identical keys yield one creation and seven genuine replays", async () => {
  const body=requestBody();const responses=await Promise.all(Array.from({length:8},()=>call("/api/requests",a.cookie,body)));
  assert.equal(responses.filter(r=>r.status===201).length,1); assert.equal(responses.filter(r=>r.status===200).length,7);
  const data=await Promise.all(responses.map(r=>r.json())); assert.equal(new Set(data.map(r=>r.id)).size,1);
  assert.equal(await db.projectRequestStatusHistory.count({where:{requestId:data[0].id}}),1);
});

test("a committed key with changed payload returns conflict and recover returns the actual original result", async () => {
  const saved=await create(); const response=await call("/api/requests",a.cookie,{...saved.payload,description:"توضیحات این درخواست به شکل معناداری تغییر کرده است."});
  assert.equal(response.status,409);assert.equal((await response.json()).ok,false);
  const recovery=await call(`/api/requests/operation/${saved.payload.operationKey}`,a.cookie);
  assert.equal(recovery.status,200);assert.equal((await recovery.json()).id,saved.id);
  assert.equal((await call(`/api/requests/operation/${saved.payload.operationKey}`,b.cookie)).status,404);
});

test("same operation key is independently scoped to each authenticated owner", async () => {
  const body=requestBody(); const first=await create(a,body);const second=await create(b,body);assert.notEqual(first.id,second.id);
  assert.equal((await (await call(`/api/requests/operation/${body.operationKey}`,b.cookie)).json()).id,second.id);
});

test("identical legitimate content with a new key creates a distinct request", async () => {
  const body=requestBody();const first=await create(a,body);const second=await create(a,{...body,operationKey:randomUUID()});assert.notEqual(first.id,second.id);
});

test("list, detail, direct identifiers and server data access enforce ownership before private reads", async () => {
  const saved=await create(a,requestBody({title:"عنوان خصوصی حساب اول"}));
  const response=await call(`/api/requests/${saved.id}`,b.cookie);assert.equal(response.status,404);
  const notFound=await response.json(); assert(!JSON.stringify(notFound).includes("عنوان خصوصی"));
  const listing=await (await call("/api/requests",b.cookie)).json(); assert(listing.items.every(r=>r.id!==saved.id));
  for(const id of ["bad","' OR 1=1",randomUUID()])assert.equal((await call(`/api/requests/${encodeURIComponent(id)}`,a.cookie)).status,404);
  const service=createRequestsService(db,createAuthentication(db,{baseURL:origin,secret:process.env.BETTER_AUTH_SECRET}),process.env.BETTER_AUTH_SECRET);
  await assert.rejects(service.detail(new Headers({cookie:b.cookie}),saved.id),error=>error.status===404);
  await assert.rejects(service.submit(new Headers(),requestBody()),error=>error.status===401);
  await assert.rejects(service.list(new Headers({cookie:admin.cookie})),error=>error.status===403);
});

test("query injection, duplicate parameters and unsupported customer mutations are rejected", async () => {
  const saved=await create();
  for(const query of ["ownerId=someone","status=ACCEPTED&role=ADMIN","page=-1","page=0","page=1001","status=BOGUS","page=1&page=2"])assert.equal((await call(`/api/requests?${query}`,a.cookie)).status,400);
  assert.equal((await call(`/api/requests/${saved.id}?ownerId=${b.user.id}`,a.cookie)).status,400);
  for(const method of ["PATCH","PUT","DELETE"])assert.equal((await fetch(`${origin}/api/requests/${saved.id}`,{method,headers:{origin,cookie:a.cookie,"content-type":"application/json"},body:JSON.stringify({status:"ACCEPTED"})})).status,405);
  assert.equal((await db.projectRequest.findUnique({where:{id:saved.id}})).status,"NEW");
});

test("pagination is bounded and deterministic, filtering and dashboard summary use owned stored status", async () => {
  const owner=await register();
  const ids=[];
  for(let index=0;index<12;index++){await db.rateLimit.deleteMany();ids.push((await create(owner,requestBody({title:`درخواست صفحه‌بندی شماره ${index}`}))).id);}
  const sameTime=new Date("2026-10-24T00:00:00Z");await db.projectRequest.updateMany({where:{ownerId:owner.user.id},data:{createdAt:sameTime}});
  const first=await (await call("/api/requests",owner.cookie)).json();const second=await (await call("/api/requests?page=2",owner.cookie)).json();
  assert.equal(first.items.length,10);assert.equal(second.items.length,2);assert.equal(first.total,12);assert.equal(new Set([...first.items,...second.items].map(r=>r.id)).size,12);
  assert.deepEqual([...first.items,...second.items].map(r=>r.id),ids.sort().reverse());
  await db.$transaction(async tx=>{await tx.projectRequest.update({where:{id:ids[0]},data:{status:"REVIEWING"}});await tx.projectRequestStatusHistory.create({data:{requestId:ids[0],actorId:admin.user.id,fromStatus:"NEW",toStatus:"REVIEWING"}});});
  const filtered=await (await call("/api/requests?status=REVIEWING",owner.cookie)).json();assert.equal(filtered.total,1);assert.equal(filtered.items[0].id,ids[0]);
  const summary=await createRequestsService(db,createAuthentication(db,{baseURL:origin,secret:process.env.BETTER_AUTH_SECRET}),process.env.BETTER_AUTH_SECRET).summary(new Headers({cookie:owner.cookie}));
  assert.equal(summary.total,12);assert.equal(summary.recent.length,3);assert.equal(summary.statuses.find(r=>r.status==="REVIEWING").count,1);
});

test("history displays only persisted events in chronological order with safe actor attribution", async () => {
  const saved=await create();const first=await db.projectRequestStatusHistory.findFirst({where:{requestId:saved.id}});
  await db.$transaction(async tx=>{await tx.projectRequest.update({where:{id:saved.id},data:{status:"REVIEWING"}});await tx.projectRequestStatusHistory.create({data:{requestId:saved.id,actorId:admin.user.id,fromStatus:"NEW",toStatus:"REVIEWING",createdAt:new Date(first.createdAt.getTime()+1000)}});});
  const detail=(await (await call(`/api/requests/${saved.id}`,a.cookie)).json()).request;
  assert.deepEqual(detail.history.map(e=>e.toStatus),["NEW","REVIEWING"]);assert.deepEqual(detail.history.map(e=>e.actor),["YOU","STUDIO"]);
  assert(!JSON.stringify(detail).includes(admin.user.email));assert(!JSON.stringify(detail).includes("actorId"));assert(!JSON.stringify(detail).includes("submissionHash"));
});

test("legacy requests retain budget/deadline and do not acquire invented history", async () => {
  const legacy=await db.projectRequest.create({data:{ownerId:a.user.id,title:"درخواست قدیمی موجود",description:"اطلاعات موجود پیش از فعال‌شدن فرم جدید",budget:25000000,deadline:new Date("2027-01-01")}});
  const detail=(await (await call(`/api/requests/${legacy.id}`,a.cookie)).json()).request;
  assert.equal(detail.legacyBudget,"25000000");assert.equal(detail.category,null);assert.deepEqual(detail.history,[]);
});

test("creation and history roll back on an actual MySQL history-write failure, and the same key can safely retry", async () => {
  const owner=await register();
  const body=requestBody();const before=await db.projectRequest.count();
  // MySQL disallows CHECK on cascading FK columns. Whitelist existing primary IDs instead.
  // All values are database-generated and validated before constructing this test-only DDL.
  const existing=await db.projectRequestStatusHistory.findMany({select:{id:true}});
  for(const row of existing)assert.match(row.id,/^[a-zA-Z0-9-]{20,36}$/);
  await db.$executeRawUnsafe(`ALTER TABLE ProjectRequestStatusHistory ADD CONSTRAINT request_test_history_failure CHECK (id IN (${existing.map(row=>`'${row.id}'`).join(',')}))`);
  try{const response=await call("/api/requests",owner.cookie,body);assert.equal(response.status,503);const text=await response.text();assert(!/Prisma|constraint|SQL|mysql/i.test(text));assert.equal(await db.projectRequest.count(),before);assert.equal((await call(`/api/requests/operation/${body.operationKey}`,owner.cookie)).status,404);}
  finally{await db.$executeRawUnsafe("ALTER TABLE ProjectRequestStatusHistory DROP CHECK request_test_history_failure");}
  assert.equal((await create(owner,body)).status,"NEW");
});

test("concurrent creation budgets allow five new keys, deny excess, and still permit committed retries", async () => {
  const bodies=Array.from({length:8},()=>requestBody());
  const responses=await Promise.all(bodies.map(body=>call("/api/requests",a.cookie,body,{"x-forwarded-for":randomUUID()})));
  assert.equal(responses.filter(r=>r.status===201).length,5);assert.equal(responses.filter(r=>r.status===429).length,3);
  const accepted=responses.findIndex(r=>r.status===201);const limited=responses.find(r=>r.status===429);assert(Number(limited.headers.get("retry-after"))>0);
  assert.equal((await call("/api/requests",a.cookie,bodies[accepted])).status,200);
  assert.equal((await call("/api/requests",a.cookie,{...bodies[accepted],title:"عنوان متفاوت پس از ثبت"})).status,409);
});

test("unavailable counter storage fails closed while an already committed operation remains recoverable", async () => {
  const saved=await create();const body=requestBody();const before=await db.projectRequest.count();
  await db.$executeRawUnsafe("RENAME TABLE RateLimit TO RateLimit_request_test_unavailable");
  try{assert.equal((await call("/api/requests",a.cookie,body)).status,503);assert.equal(await db.projectRequest.count(),before);assert.equal((await call("/api/requests",a.cookie,saved.payload)).status,200);}
  finally{await db.$executeRawUnsafe("RENAME TABLE RateLimit_request_test_unavailable TO RateLimit");}
});

test("unsafe/missing origins, cross-site metadata, wrong media and oversized/malformed JSON cannot mutate", async () => {
  const before=await db.projectRequest.count();
  for(const extra of [{origin:""},{origin:"null"},{origin:"https://example.invalid"},{"sec-fetch-site":"cross-site"}])assert.equal((await call("/api/requests",a.cookie,requestBody(),extra)).status,403);
  for(const [body,type,status] of [["{","application/json",400],["anything","text/plain",415],["x".repeat(33000),"application/json",413]])assert.equal((await fetch(`${origin}/api/requests`,{method:"POST",headers:{origin,cookie:a.cookie,"content-type":type},body})).status,status);
  assert.equal(await db.projectRequest.count(),before);
});

test("expired, disabled and revoked sessions cannot access request APIs or create new records", async () => {
  const owner=await register();const saved=await create(owner);const session=await db.session.findFirst({where:{userId:owner.user.id}});
  await db.session.update({where:{id:session.id},data:{expiresAt:new Date(Date.now()-1000)}});
  for(const path of ["/api/requests",`/api/requests/${saved.id}`,`/api/requests/operation/${saved.payload.operationKey}`])assert.equal((await call(path,owner.cookie)).status,401);
  const login=await call("/api/auth/sign-in/email","",{email:owner.user.email,password});assert.equal(login.status,200);owner.cookie=cookies(login);
  await db.user.update({where:{id:owner.user.id},data:{disabledAt:new Date()}});
  assert.equal((await call("/api/requests",owner.cookie,requestBody())).status,401);
  await db.user.update({where:{id:owner.user.id},data:{disabledAt:null}});await db.session.deleteMany({where:{userId:owner.user.id}});
  assert.equal((await call(`/api/requests/${saved.id}`,owner.cookie)).status,401);
});

test("private responses remain no-store and caller text is escaped in the actual server-rendered detail", async () => {
  const body=requestBody({title:"عنوان <img src=x onerror=alert(1)>",description:"متن پروژه شامل <script>alert(1)</script> است و باید به صورت متن ساده باقی بماند."});const saved=await create(a,body);
  for(const path of ["/api/requests",`/api/requests/${saved.id}`,`/api/requests/operation/${body.operationKey}`])assert.match((await call(path,a.cookie)).headers.get("cache-control"),/no-store/);
  const page=await call(`/dashboard/requests/${saved.id}`,a.cookie);const html=await page.text();assert(!html.includes("<img src=x"));assert(!html.includes("<script>alert(1)</script>"));assert(html.includes("&lt;script&gt;"));
});

test("unavailable request storage returns sanitized failures for list/detail/recovery without partial creation",async()=>{
  const saved=await create();const before=await db.projectRequest.count();
  await db.$executeRawUnsafe("RENAME TABLE ProjectRequest TO ProjectRequest_test_unavailable");
  try{
    for(const path of ["/api/requests",`/api/requests/${saved.id}`,`/api/requests/operation/${saved.payload.operationKey}`]){
      const response=await call(path,a.cookie);assert.equal(response.status,503);assert(!/Prisma|mysql|SELECT|Table/i.test(await response.text()));
    }
    assert.equal((await call("/api/requests",a.cookie,requestBody())).status,503);
  }finally{await db.$executeRawUnsafe("RENAME TABLE ProjectRequest_test_unavailable TO ProjectRequest");}
  assert.equal(await db.projectRequest.count(),before);
});
