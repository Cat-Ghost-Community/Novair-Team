import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import type { AuthenticationService } from "../auth/service.ts";
import { AccountAccessError, readOwnAccount } from "../auth/account-data.ts";
import { RequestFailure } from "../requests/service.ts";
import { consumeDatabaseLimit } from "../security/auth-rate-limit.ts";
import { requestIdSchema, operationKeySchema } from "../../shared/request-contracts.ts";
import { contentKinds, contentValidationMessage, contentListSchema, contentWriteSchema, serviceContentSchema, portfolioContentSchema, faqContentSchema, publicSettingsSchema, defaultPublicSettings, PUBLIC_SETTINGS_KEY, type ContentKind, type ContentResult } from "../../shared/content-contracts.ts";
import { contentAssets } from "../../content/assets.ts";
import { trustedContentAsset } from "./assets.ts";
export function parseContent<T>(schema: {
    safeParse(v: unknown): {
        success: true;
        data: T;
    } | {
        success: false;
        error: {
            issues: readonly {
                path: readonly PropertyKey[];
                message: string;
            }[];
        };
    };
}, value: unknown): T {
    const p = schema.safeParse(value);
    if (p.success)
        return p.data;
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of p.error.issues)
        if (typeof issue.path[0] === "string")
            (fieldErrors[issue.path[0]] ??= []).push(contentValidationMessage(issue.message));
    throw new RequestFailure(400, "اطلاعات معتبر نیست؛ بخش‌های مشخص‌شده را بررسی کن.", { fieldErrors });
}
const missing = () => new RequestFailure(404, "این محتوا در دسترس نیست.");
const idOf = (v: unknown) => { const p = requestIdSchema.safeParse(v); if (!p.success)
    throw missing(); return p.data; };
const sort = [{ sortOrder: "asc" as const }, { id: "asc" as const }];
const meta = { id: true, published: true, sortOrder: true, version: true, createdAt: true, updatedAt: true } as const;
const serviceSelect = { ...meta, title: true, summary: true, body: true, category: true, highlights: true } as const;
const portfolioSelect = { ...meta, title: true, summary: true, body: true, category: true, technologies: true, imageKey: true, externalUrl: true } as const;
const faqSelect = { ...meta, question: true, answer: true } as const;
export const settingValue = (value: unknown) => { const p = publicSettingsSchema.safeParse(value); return p.success ? p.data : { ...defaultPublicSettings }; };
const strings = (value: unknown) => Array.isArray(value) ? value.filter((v): v is string => typeof v === "string").slice(0, 8) : [];
const contentValue = (kind: ContentKind, value: unknown) => kind === "services" ? { kind, value: parseContent(serviceContentSchema, value) } as const : kind === "portfolio" ? { kind, value: parseContent(portfolioContentSchema, value) } as const : { kind, value: parseContent(faqContentSchema, value) } as const;
export function createContentService(db: PrismaClient, auth: AuthenticationService, secret: string, origin: string) {
    async function principal(headers: Headers, mutation = false) {
        if ((mutation && headers.get("origin") !== origin) || (headers.get("origin") && headers.get("origin") !== origin) || headers.get("sec-fetch-site") === "cross-site")
            throw new RequestFailure(403, "مبدأ درخواست معتبر نیست.");
        const user = await readOwnAccount(auth, headers);
        if (user.role !== "ADMIN")
            throw new AccountAccessError(403);
        return user;
    }
    const kindOf = (value: string): ContentKind => { if (!contentKinds.includes(value as ContentKind))
        throw missing(); return value as ContentKind; };
    async function overview(headers: Headers) {
        await principal(headers);
        const counts = await db.$transaction([db.service.count({ where: { published: true } }), db.service.count({ where: { published: false } }), db.portfolioItem.count({ where: { published: true } }), db.portfolioItem.count({ where: { published: false } }), db.faq.count({ where: { published: true } }), db.faq.count({ where: { published: false } })]);
        return { services: { published: counts[0], draft: counts[1] }, portfolio: { published: counts[2], draft: counts[3] }, faq: { published: counts[4], draft: counts[5] } };
    }
    async function list(headers: Headers, value: string, input: unknown = {}) {
        await principal(headers);
        const kind = kindOf(value);
        const query = parseContent(contentListSchema, input);
        const where = query.visibility === "ALL" ? {} : { published: query.visibility === "PUBLISHED" };
        const args = { where, orderBy: sort, skip: (query.page - 1) * 10, take: 10 };
        if (kind === "faq") {
            const [rows, total] = await db.$transaction([db.faq.findMany({ ...args, select: { ...meta, question: true } }), db.faq.count({ where })]);
            return { kind, ...query, pageSize: 10, total, items: rows.map(({ question, ...row }) => ({ ...row, title: question })) };
        }
        const [items, total] = kind === "services" ? await db.$transaction([db.service.findMany({ ...args, select: { ...meta, title: true } }), db.service.count({ where })]) : await db.$transaction([db.portfolioItem.findMany({ ...args, select: { ...meta, title: true } }), db.portfolioItem.count({ where })]);
        return { kind, ...query, pageSize: 10, total, items };
    }
    async function settings(headers: Headers) {
        await principal(headers);
        const row = await db.siteSetting.findUnique({ where: { key: PUBLIC_SETTINGS_KEY }, select: { value: true, version: true, updatedAt: true } });
        const audits = await db.contentAudit.findMany({ where: { kind: "settings", targetId: PUBLIC_SETTINGS_KEY }, select: { id: true, action: true, version: true, createdAt: true, actor: { select: { name: true } } }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 21 });
        return { id: PUBLIC_SETTINGS_KEY, version: row?.version ?? 0, fields: settingValue(row?.value), updatedAt: row?.updatedAt.toISOString() ?? null, auditLimited: audits.length > 20, audits: audits.slice(0, 20).map(a => ({ id: a.id, action: a.action, version: a.version, createdAt: a.createdAt.toISOString(), actor: a.actor.name })) };
    }
    async function detail(headers: Headers, value: string, target: unknown) {
        await principal(headers);
        const kind = kindOf(value);
        const id = idOf(target);
        const row = kind === "services" ? await db.service.findUnique({ where: { id }, select: serviceSelect }) : kind === "portfolio" ? await db.portfolioItem.findUnique({ where: { id }, select: portfolioSelect }) : await db.faq.findUnique({ where: { id }, select: faqSelect });
        if (!row)
            throw missing();
        const { version, createdAt, updatedAt, id: rowId, ...fields } = row;
        const normalized = { ...fields, ...("highlights" in fields ? { highlights: strings(fields.highlights) } : {}), ...("technologies" in fields ? { technologies: strings(fields.technologies), category: fields.category ?? "" } : {}) };
        const references = kind === "services" ? await db.projectRequest.count({ where: { serviceId: id } }) : 0;
        const audits = await db.contentAudit.findMany({ where: { kind, targetId: id }, select: { id: true, action: true, version: true, createdAt: true, actor: { select: { name: true } } }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 21 });
        return { id: rowId, kind, version, fields: normalized, createdAt: createdAt.toISOString(), updatedAt: updatedAt.toISOString(), references, auditLimited: audits.length > 20, audits: audits.slice(0, 20).map(a => ({ id: a.id, action: a.action, version: a.version, createdAt: a.createdAt.toISOString(), actor: a.actor.name })) };
    }
    async function assets(headers: Headers) {
        await principal(headers);
        const entries = await Promise.all(contentAssets.map(a => trustedContentAsset(a.key)));
        return { items: entries.filter(a => a !== null) };
    }
    async function recover(headers: Headers, key: unknown) {
        const user = await principal(headers);
        const operationKey = parseContent(operationKeySchema, key);
        const op = await db.contentOperation.findUnique({ where: { actorId_operationKey: { actorId: user.id, operationKey } }, select: { result: true } });
        if (!op)
            throw missing();
        return { result: op.result as ContentResult, replayed: true };
    }
    async function write(headers: Headers, value: string, target: unknown, action: "save" | "delete", input: unknown) {
        const user = await principal(headers, true);
        const kind = value === "settings" ? "settings" : kindOf(value);
        if (kind === "settings" && target !== null)
            throw missing();
        if (!["save", "delete"].includes(action) || (action === "delete" && (kind === "services" || kind === "settings")))
            throw new RequestFailure(405, "برای نگهداری سوابق، این محتوا فقط از انتشار خارج می‌شود.");
        const id = kind === "settings" ? PUBLIC_SETTINGS_KEY : target === null ? null : idOf(target);
        if (action === "delete" && !id)
            throw missing();
        const envelope = parseContent(contentWriteSchema, input);
        const data = action === "delete" ? (parseContent({ safeParse: v => { const p = v && typeof v === "object" && !Array.isArray(v) && Object.keys(v).length === 0; return p ? { success: true as const, data: {} } : { success: false as const, error: { issues: [{ path: ["content"], message: "حذف فقط شناسه و نسخه را می‌پذیرد." }] } }; } }, envelope.content), null) : kind === "settings" ? { kind: "settings" as const, value: parseContent(publicSettingsSchema, envelope.content) } : contentValue(kind, envelope.content);
        const hash = createHash("sha256").update(JSON.stringify({ kind, id, action, expectedVersion: envelope.expectedVersion, content: data?.value ?? {} })).digest("hex");
        const outcome = await db.$transaction(async (tx) => {
            const actors = await tx.$queryRaw<{
                role: string;
                disabledAt: Date | null;
            }[]>(Prisma.sql `SELECT role, disabledAt FROM User WHERE id = ${user.id} FOR UPDATE`);
            if (!actors[0] || actors[0].disabledAt || actors[0].role !== "ADMIN")
                throw new AccountAccessError(403);
            const previous = await tx.contentOperation.findUnique({ where: { actorId_operationKey: { actorId: user.id, operationKey: envelope.operationKey } } });
            if (previous) {
                if (previous.payloadHash !== hash)
                    throw new RequestFailure(409, "این شناسه قبلاً برای محتوای دیگری ثبت شده؛ نتیجهٔ قبلی را بررسی کن.");
                return { limited: false as const, result: previous.result as ContentResult, replayed: true };
            }
            // Small-studio CMS mutex: also serializes settings/fallback changes across content types and administrators.
            await tx.$executeRaw(Prisma.sql `INSERT INTO SiteSetting (\`key\`, value, version, createdAt, updatedAt) VALUES ('cms.control.v1', JSON_OBJECT(), 0, NOW(3), NOW(3)) ON DUPLICATE KEY UPDATE \`key\` = \`key\``);
            await tx.$queryRaw(Prisma.sql `SELECT \`key\` FROM SiteSetting WHERE \`key\` = 'cms.control.v1' FOR UPDATE`);
            const old = kind === "settings" ? await tx.siteSetting.findUnique({ where: { key: PUBLIC_SETTINGS_KEY } }) : id ? kind === "services" ? await tx.service.findUnique({ where: { id }, select: serviceSelect }) : kind === "portfolio" ? await tx.portfolioItem.findUnique({ where: { id }, select: portfolioSelect }) : await tx.faq.findUnique({ where: { id }, select: faqSelect }) : null;
            if (id && kind !== "settings" && !old)
                throw missing();
            if ((old?.version ?? 0) !== envelope.expectedVersion)
                throw new RequestFailure(409, "نسخهٔ ذخیره‌شده تغییر کرده؛ متن فعلی را نگه دار و نسخهٔ تازه را مقایسه کن.");
            if (action === "delete" && old && "published" in old && old.published)
                throw new RequestFailure(409, "ابتدا محتوا را از انتشار خارج کن؛ فقط پیش‌نویس قابل حذف است.");
            if (data?.kind === "services") {
                if (!old && !data.value.category)
                    throw new RequestFailure(400, "دستهٔ ثابت خدمات را انتخاب کن.", { fieldErrors: { category: ["برای خدمت تازه انتخاب دسته ضروری است."] } });
                if (old && "category" in old && old.category !== data.value.category && (old.category !== null || await tx.projectRequest.count({ where: { serviceId: id! } })))
                    throw new RequestFailure(409, "دستهٔ ثابت خدمتِ ثبت‌شده یا مرتبط با درخواست قابل تغییر نیست؛ یک خدمت جدا ایجاد کن.");
            }
            if (data?.kind === "portfolio" && data.value.imageKey && !await trustedContentAsset(data.value.imageKey))
                throw new RequestFailure(400, "تصویر کاتالوگ در دسترس یا معتبر نیست.", { fieldErrors: { imageKey: ["تصویر معتبر کاتالوگ را انتخاب کن یا بدون تصویر ذخیره کن."] } });
            const budget = await consumeDatabaseLimit(tx, secret, "cms:write", user.id, { windowMs: 60000, sourceLimit: 300, identityLimit: 60 });
            if (!budget.allowed)
                return { limited: true as const, retryAfter: budget.retryAfter };
            const targetId = id ?? randomUUID();
            let version = old?.version ?? 0;
            let changed = true;
            if (action === "delete") {
                if (kind === "faq")
                    await tx.faq.delete({ where: { id: targetId } });
                else if (kind === "portfolio")
                    await tx.portfolioItem.delete({ where: { id: targetId } });
                version++;
            }
            else if (data?.kind === "settings") {
                const before = old && "value" in old ? settingValue(old.value) : defaultPublicSettings;
                changed = JSON.stringify(before) !== JSON.stringify(data.value);
                if (changed) {
                    version++;
                    await tx.siteSetting.upsert({ where: { key: PUBLIC_SETTINGS_KEY }, create: { key: PUBLIC_SETTINGS_KEY, value: data.value, version }, update: { value: data.value, version } });
                }
            }
            else if (data) {
                const before = old ? Object.fromEntries(Object.entries(data.value).map(([key]) => [key, (old as unknown as Record<string, unknown>)[key] ?? (key === "highlights" || key === "technologies" ? [] : key === "category" && data.kind === "portfolio" ? "" : null)])) : null;
                changed = !old || JSON.stringify(before) !== JSON.stringify(data.value);
                if (changed) {
                    version++;
                    if (data.kind === "services") {
                        if (old)
                            await tx.service.update({ where: { id: targetId }, data: { ...data.value, version } });
                        else
                            await tx.service.create({ data: { id: targetId, slug: `service-${targetId}`, ...data.value, version } });
                    }
                    if (data.kind === "portfolio") {
                        if (old)
                            await tx.portfolioItem.update({ where: { id: targetId }, data: { ...data.value, version } });
                        else
                            await tx.portfolioItem.create({ data: { id: targetId, slug: `work-${targetId}`, ...data.value, version } });
                    }
                    if (data.kind === "faq") {
                        if (old)
                            await tx.faq.update({ where: { id: targetId }, data: { ...data.value, version } });
                        else
                            await tx.faq.create({ data: { id: targetId, ...data.value, version } });
                    }
                    if (data.value.published && (!old || ("published" in old && !old.published)) && (data.kind === "services" || data.kind === "faq")) {
                        const settingsRow = await tx.siteSetting.findUnique({ where: { key: PUBLIC_SETTINGS_KEY } });
                        const settings = settingValue(settingsRow?.value);
                        const field = data.kind === "services" ? "servicesFallback" : "faqFallback";
                        if (settings[field]) {
                            settings[field] = false;
                            const next = (settingsRow?.version ?? 0) + 1;
                            await tx.siteSetting.upsert({ where: { key: PUBLIC_SETTINGS_KEY }, create: { key: PUBLIC_SETTINGS_KEY, value: settings, version: next }, update: { value: settings, version: next } });
                            await tx.contentAudit.create({ data: { id: randomUUID(), actorId: user.id, kind: "settings", targetId: PUBLIC_SETTINGS_KEY, action: "fallback-retired", version: next } });
                        }
                    }
                }
            }
            const published = data && "published" in data.value ? data.value.published : undefined;
            const result: ContentResult = { id: targetId, kind, version, ...(published === undefined ? {} : { published }), changed };
            if (changed)
                await tx.contentAudit.create({ data: { id: randomUUID(), actorId: user.id, kind, targetId, action: action === "delete" ? "deleted" : !old && kind !== "settings" ? published ? "created-published" : "created-draft" : old && "published" in old && old.published !== published ? published ? "published" : "unpublished" : "edited", version } });
            await tx.contentOperation.create({ data: { id: randomUUID(), actorId: user.id, operationKey: envelope.operationKey, payloadHash: hash, result } });
            return { limited: false as const, result, replayed: false };
        }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, maxWait: 10000, timeout: 15000 });
        if (outcome.limited)
            throw new RequestFailure(429, "تعداد ذخیره‌ها زیاد شده؛ کمی بعد با همین شناسه دوباره تلاش کن.", { retryAfter: outcome.retryAfter });
        return { result: outcome.result, replayed: outcome.replayed };
    }
    return { overview, list, detail, settings, assets, recover, write };
}
export type ContentService = ReturnType<typeof createContentService>;
