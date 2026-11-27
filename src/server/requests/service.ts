import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import type { AuthenticationService } from "../auth/service.ts";
import { readOwnAccount } from "../auth/account-data.ts";
import { consumeDatabaseLimit } from "../security/auth-rate-limit.ts";
import { requestSchema, requestListSchema, requestIdSchema, operationKeySchema, REQUEST_PAGE_SIZE } from "../../shared/request-contracts.ts";

export class RequestFailure extends Error {
  readonly status: number;
  readonly fieldErrors?: Record<string, string[]>;
  readonly retryAfter?: number;
  constructor(status: number, message: string, options?: { fieldErrors?: Record<string, string[]>; retryAfter?: number }) {
    super(message); this.status = status; this.fieldErrors = options?.fieldErrors; this.retryAfter = options?.retryAfter;
  }
}
function validate<T>(schema: { safeParse(value: unknown): { success: true; data: T } | { success: false; error: { issues: readonly { path: readonly PropertyKey[]; message: string }[] } } }, value: unknown): T {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of result.error.issues) if (typeof issue.path[0] === "string") (fieldErrors[issue.path[0]] ??= []).push(issue.message);
  throw new RequestFailure(400, "اطلاعات درخواست معتبر نیست؛ بخش‌های مشخص‌شده را بررسی کن.", { fieldErrors });
}
export const listSelect = { id: true, title: true, category: true, status: true, createdAt: true, updatedAt: true } as const;
type ListRow = Prisma.ProjectRequestGetPayload<{ select: typeof listSelect }>;
export const listItem = (row: ListRow) => ({ id: row.id, title: row.title, category: row.category, status: row.status, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() });
export type RequestListItem = ReturnType<typeof listItem>;

export function createRequestsService(db: PrismaClient, authentication: AuthenticationService, secret: string) {
  async function userContext(headers: Headers) {
    const user = await readOwnAccount(authentication, headers);
    if (user.role !== "USER") throw new RequestFailure(403, "ثبت و پیگیری درخواست مشتری فقط در ناحیهٔ کاربری مجاز است.");
    return user;
  }
  async function submit(headers: Headers, input: unknown) {
    const user = await userContext(headers);
    const { operationKey, ...data } = validate(requestSchema, input);
    const digest = createHash("sha256").update(JSON.stringify(data)).digest("hex");
    const result = await db.$transaction(async (tx) => {
      // Serialize submissions by owner across instances, including concurrent retries/new keys.
      // The unique(ownerId, submissionKey) constraint is the permanent database invariant.
      const owners = await tx.$queryRaw<{ id: string; role: string; disabledAt: Date | null }[]>(Prisma.sql`SELECT id, role, disabledAt FROM User WHERE id = ${user.id} FOR UPDATE`);
      if (!owners[0] || owners[0].disabledAt || owners[0].role !== "USER") throw new RequestFailure(403, "دسترسی به ثبت درخواست مجاز نیست.");
      const previous = await tx.projectRequest.findUnique({ where: { ownerId_submissionKey: { ownerId: user.id, submissionKey: operationKey } }, select: { id: true, submissionHash: true, status: true } });
      if (previous) {
        if (previous.submissionHash !== digest) throw new RequestFailure(409, "این شناسه قبلاً با اطلاعات دیگری ثبت شده است. نتیجهٔ قبلی را بررسی کن یا یک درخواست تازه بساز.");
        return { kind: "saved" as const, id: previous.id, replayed: true, status: previous.status };
      }
      const budget = await consumeDatabaseLimit(tx, secret, "project-request:create", user.id, { windowMs: 600_000, sourceLimit: 60, identityLimit: 5 });
      if (!budget.allowed) return { kind: "limited" as const, retryAfter: budget.retryAfter };
      const request = await tx.projectRequest.create({
        data: { ...data, id: randomUUID(), ownerId: user.id, status: "NEW", submissionKey: operationKey, submissionHash: digest,
          history: { create: { id: randomUUID(), actorId: user.id, fromStatus: null, toStatus: "NEW" } } },
        select: { id: true, status: true },
      });
      return { kind: "saved" as const, ...request, replayed: false };
    }, { maxWait: 10_000, timeout: 10_000 });
    if (result.kind === "limited") throw new RequestFailure(429, "تعداد درخواست‌ها زیاد است؛ چند دقیقه بعد دوباره تلاش کن. درخواست‌های ثبت‌شده همچنان قابل پیگیری‌اند.", { retryAfter: result.retryAfter });
    return { id: result.id, status: result.status, replayed: result.replayed };
  }
  async function list(headers: Headers, input: unknown = {}) {
    const user = await userContext(headers);
    const { status, page } = validate(requestListSchema, input);
    const where = { ownerId: user.id, ...(status === "ALL" ? {} : { status }) };
    const [rows, total] = await db.$transaction([
      db.projectRequest.findMany({ where, select: listSelect, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * REQUEST_PAGE_SIZE, take: REQUEST_PAGE_SIZE }),
      db.projectRequest.count({ where }),
    ]);
    return { items: rows.map(listItem), total, page, status, pageSize: REQUEST_PAGE_SIZE };
  }
  async function detail(headers: Headers, input: unknown) {
    const user = await userContext(headers);
    const valid = requestIdSchema.safeParse(input);
    if (!valid.success) throw new RequestFailure(404, "این درخواست در دسترس نیست.");
    const row = await db.projectRequest.findFirst({ where: { id: valid.data, ownerId: user.id }, select: {
      ...listSelect, description: true, budgetPreference: true, timelinePreference: true, relevantUrl: true, budget: true, deadline: true,
      project: { where: { ownerId: user.id }, select: { id: true } },
      history: { select: { id: true, fromStatus: true, toStatus: true, publicExplanation: true, actorId: true, createdAt: true }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 101 },
    } });
    if (!row) throw new RequestFailure(404, "این درخواست در دسترس نیست.");
    return { ...listItem(row), description: row.description, budgetPreference: row.budgetPreference, timelinePreference: row.timelinePreference,
      relevantUrl: row.relevantUrl, legacyBudget: row.budget?.toString() ?? null, legacyDeadline: row.deadline?.toISOString() ?? null,
      projectCreated: Boolean(row.project), managedProjectId: row.project?.id ?? null, decisionExplanation: row.history.find(event => event.toStatus === "DECLINED")?.publicExplanation ?? null,
      historyLimited: row.history.length > 100,
      history: row.history.slice(0, 100).reverse().map(({ actorId, createdAt, ...event }) => ({ ...event, actor: actorId === user.id ? "YOU" as const : "STUDIO" as const, createdAt: createdAt.toISOString() })),
    };
  }
  async function recover(headers: Headers, input: unknown) {
    const user = await userContext(headers);
    const key = operationKeySchema.safeParse(input);
    if (!key.success) throw new RequestFailure(404, "نتیجه‌ای برای این شناسه در دسترس نیست.");
    const row = await db.projectRequest.findUnique({ where: { ownerId_submissionKey: { ownerId: user.id, submissionKey: key.data } }, select: { id: true, status: true } });
    if (!row) throw new RequestFailure(404, "هنوز درخواستی با این شناسه ثبت نشده است.");
    return { ...row, replayed: true };
  }
  async function summary(headers: Headers) {
    const user = await userContext(headers);
    const grouped = db.projectRequest.groupBy({ by: ["status"], where: { ownerId: user.id }, orderBy: { status: "asc" }, _count: { _all: true } });
    const [groups, recent] = await db.$transaction([
      grouped,
      db.projectRequest.findMany({ where: { ownerId: user.id }, select: listSelect, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 3 }),
    ]);
    return { total: groups.reduce((sum, group) => sum + group._count._all, 0), statuses: groups.map((group) => ({ status: group.status, count: group._count._all })), recent: recent.map(listItem) };
  }
  return { submit, list, detail, recover, summary };
}
export type RequestsService = ReturnType<typeof createRequestsService>;
export type RequestDetail = Awaited<ReturnType<RequestsService["detail"]>>;
