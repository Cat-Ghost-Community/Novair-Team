import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { Prisma, type PrismaClient, type Role } from "@prisma/client";
import type { AuthenticationService } from "../auth/service.ts";
import { readOwnAccount, AccountAccessError } from "../auth/account-data.ts";
import { RequestFailure } from "../requests/service.ts";
import { consumeDatabaseLimit } from "../security/auth-rate-limit.ts";
import { requestIdSchema, operationKeySchema } from "../../shared/request-contracts.ts";
import { ticketCreateSchema, ticketReplySchema, ticketStateSchema, ticketNoteSchema, ticketReadSchema, ticketListSchema, conversationSchema, ticketTransitions, ticketPageSize, messagePageSize, type TicketResult } from "../../shared/ticket-contracts.ts";
const missing = () => new RequestFailure(404, "این تیکت در دسترس نیست.");
function parse<T>(schema: { safeParse(v: unknown): { success: true; data: T } | { success: false; error: { issues: readonly { path: readonly PropertyKey[]; message: string }[] } } }, value: unknown): T {
  const p = schema.safeParse(value); if (p.success) return p.data;
  const fieldErrors: Record<string, string[]> = {}; for (const issue of p.error.issues) if (typeof issue.path[0] === "string") (fieldErrors[issue.path[0]] ??= []).push(issue.message);
  throw new RequestFailure(400, "اطلاعات معتبر نیست؛ بخش‌های مشخص‌شده را بررسی کن.", { fieldErrors });
}
const select = { id: true, subject: true, category: true, status: true, version: true, createdAt: true, updatedAt: true, lastActivityAt: true, lastCustomerSequence: true, lastSupportSequence: true, customerReadSequence: true, supportReadSequence: true } as const;
type Row = Prisma.TicketGetPayload<{ select: typeof select }>;
const item = (r: Row, role: Role) => ({ id: r.id, subject: r.subject, category: r.category, status: r.status, version: r.version, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString(), lastActivityAt: r.lastActivityAt.toISOString(), unread: role === "USER" ? r.lastSupportSequence > r.customerReadSequence : r.lastCustomerSequence > r.supportReadSequence });
export type TicketAction = "reply" | "state" | "note";
export function createSupportService(db: PrismaClient, auth: AuthenticationService, secret: string, origin: string) {
  async function principal(headers: Headers, role: Role, mutation = false) {
    if ((mutation && headers.get("origin") !== origin) || (headers.get("origin") && headers.get("origin") !== origin) || headers.get("sec-fetch-site") === "cross-site") throw new RequestFailure(403, "مبدأ درخواست معتبر نیست.");
    const user = await readOwnAccount(auth, headers); if (user.role !== role) throw new AccountAccessError(403); return user;
  }
  const identifier = (v: unknown) => { const p = requestIdSchema.safeParse(v); if (!p.success) throw missing(); return p.data; };
  async function list(headers: Headers, role: Role, input: unknown = {}) {
    const user = await principal(headers, role); const query = parse(ticketListSchema, input);
    const where: Prisma.TicketWhereInput = { ...(role === "USER" ? { ownerId: user.id } : {}), ...(query.status === "ALL" ? {} : { status: query.status }), ...(query.q ? { OR: [{ subject: { contains: query.q } }, { id: { contains: query.q } }] } : {}) };
    const [rows, total] = await db.$transaction([db.ticket.findMany({ where, select: { ...select, ownerId: true, projectId: true, ...(role === "ADMIN" ? { owner: { select: { name: true, email: true } } } : {}) }, orderBy: [{ lastActivityAt: "desc" }, { id: "desc" }], skip: (query.page - 1) * ticketPageSize, take: ticketPageSize }), db.ticket.count({ where })]);
    const linked = rows.filter(r => r.projectId).map(r => ({ id: r.projectId!, ownerId: r.ownerId }));
    const projects = linked.length ? await db.project.findMany({ where: { OR: linked }, select: { id: true, title: true, ownerId: true } }) : [];
    return { ...query, total, pageSize: ticketPageSize, items: rows.map(r => { const project = projects.find(p => p.id === r.projectId && p.ownerId === r.ownerId); return { ...item(r, role), project: project ? { id: project.id, title: project.title } : null, ...(role === "ADMIN" && "owner" in r ? { customer: r.owner as { name: string; email: string } } : {}) }; }) };
  }
  async function detail(headers: Headers, role: Role, value: unknown, input: unknown = {}) {
    const user = await principal(headers, role); const id = identifier(value); const query = parse(conversationSchema, input);
    const row = await db.ticket.findFirst({ where: { id, ...(role === "USER" ? { ownerId: user.id } : {}) }, select: { ...select, ownerId: true, projectId: true, ...(role === "ADMIN" ? { owner: { select: { name: true, email: true } } } : {}),
      messages: { select: { id: true, body: true, authorRole: true, sequence: true, createdAt: true }, orderBy: [{ createdAt: "desc" }, { sequence: "desc" }, { id: "desc" }], skip: (query.page - 1) * messagePageSize, take: messagePageSize }, _count: { select: { messages: true } },
      history: { select: { id: true, fromStatus: true, toStatus: true, actorRole: true, createdAt: true }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 101 },
    } });
    if (!row) throw missing();
    // Independently authorize even inconsistent legacy project relationships.
    const project = row.projectId ? await db.project.findFirst({ where: { id: row.projectId, ownerId: row.ownerId }, select: { id: true, title: true } }) : null;
    const notes = role === "ADMIN" ? await db.ticketNote.findMany({ where: { ticketId: id }, select: { id: true, body: true, createdAt: true, author: { select: { name: true } } }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 101 }) : [];
    return { ...item(row, role), project, ...(role === "ADMIN" && "owner" in row ? { customer: row.owner as { name: string; email: string }, notes: notes.slice(0, 100).reverse().map(n => ({ id: n.id, body: n.body, author: n.author.name, createdAt: n.createdAt.toISOString() })), notesLimited: notes.length > 100 } : {}),
      messages: row.messages.reverse().map(m => ({ id: m.id, body: m.body, authorRole: m.authorRole, createdAt: m.createdAt.toISOString() })), page: query.page, pageSize: messagePageSize, totalMessages: row._count.messages,
      readThrough: row.messages.reduce((max, m) => Math.max(max, m.sequence ?? 0), 0), historyLimited: row.history.length > 100, history: row.history.slice(0, 100).reverse().map(h => ({ id: h.id, fromStatus: h.fromStatus, toStatus: h.toStatus, actorRole: h.actorRole, createdAt: h.createdAt.toISOString() })),
    };
  }
  async function overview(headers: Headers, role: Role) {
    const user = await principal(headers, role); const owner = role === "USER" ? { ownerId: user.id } : {};
    // Parameterized counters compare persisted monotonic receive/read sequence watermarks.
    const rows = await db.$queryRaw<{ openCount: bigint; waitingCount: bigint; unreadCount: bigint }[]>(Prisma.sql`SELECT COALESCE(SUM(status <> 'CLOSED'),0) AS openCount, COALESCE(SUM(status IN (${role === "USER" ? "WAITING_CUSTOMER" : "WAITING_SUPPORT"}, ${role === "USER" ? "WAITING_CUSTOMER" : "OPEN"}, ${role === "USER" ? "WAITING_CUSTOMER" : "WAITING"})),0) AS waitingCount, COALESCE(SUM(${role === "USER" ? Prisma.sql`lastSupportSequence > customerReadSequence` : Prisma.sql`lastCustomerSequence > supportReadSequence`}),0) AS unreadCount FROM Ticket ${role === "USER" ? Prisma.sql`WHERE ownerId = ${user.id}` : Prisma.empty}`);
    const recent = await db.ticket.findMany({ where: owner, select, orderBy: [{ lastActivityAt: "desc" }, { id: "desc" }], take: 3 });
    return { open: Number(rows[0]!.openCount), waiting: Number(rows[0]!.waitingCount), unread: Number(rows[0]!.unreadCount), recent: recent.map(r => item(r, role)) };
  }
  async function projects(headers: Headers) {
    const user = await principal(headers, "USER");
    const rows = await db.project.findMany({ where: { ownerId: user.id }, select: { id: true, title: true }, orderBy: [{ updatedAt: "desc" }, { id: "desc" }], take: 101 });
    return { items: rows.slice(0, 100), limited: rows.length > 100 };
  }
  async function recover(headers: Headers, role: Role, value: unknown) {
    const user = await principal(headers, role); const key = parse(operationKeySchema, value);
    const op = await db.ticketOperation.findUnique({ where: { actorId_operationKey: { actorId: user.id, operationKey: key } }, select: { result: true } }); if (!op) throw missing(); return { result: op.result as TicketResult, replayed: true };
  }
  async function lockedActor(tx: Prisma.TransactionClient, id: string, role: Role) {
    const rows = await tx.$queryRaw<{ role: string; disabledAt: Date | null }[]>(Prisma.sql`SELECT role, disabledAt FROM User WHERE id = ${id} FOR UPDATE`);
    if (!rows[0] || rows[0].disabledAt || rows[0].role !== role) throw new AccountAccessError(403);
  }
  async function write(headers: Headers, role: Role, action: "create" | TicketAction, value: unknown, input: unknown) {
    const user = await principal(headers, role, true); if ((action === "create" && role !== "USER") || (action === "note" && role !== "ADMIN")) throw new AccountAccessError(403);
    const creation = action === "create" ? parse(ticketCreateSchema, input) : undefined;
    const data = creation ?? (action === "reply" ? parse(ticketReplySchema, input) : action === "note" ? parse(ticketNoteSchema, input) : parse(ticketStateSchema, input));
    const target = action === "create" ? null : identifier(value); const { operationKey, ...payload } = data;
    const digest = createHash("sha256").update(JSON.stringify({ role, action, target, payload })).digest("hex");
    const outcome = await db.$transaction(async tx => {
      await lockedActor(tx, user.id, role);
      const previous = await tx.ticketOperation.findUnique({ where: { actorId_operationKey: { actorId: user.id, operationKey } } });
      if (previous) { if (previous.payloadHash !== digest) throw new RequestFailure(409, "این شناسه برای متن یا عملیات دیگری ثبت شده؛ نتیجهٔ ارسال قبلی را بررسی کن."); return { kind: "done" as const, result: previous.result as TicketResult, replayed: true }; }
      if (creation?.projectId) {
        const rows = await tx.$queryRaw<{ ownerId: string }[]>(Prisma.sql`SELECT ownerId FROM Project WHERE id = ${creation.projectId} FOR UPDATE`);
        if (!rows[0] || rows[0].ownerId !== user.id) throw new RequestFailure(400, "پروژهٔ انتخاب‌شده در دسترس نیست.", { fieldErrors: { projectId: ["یکی از پروژه‌های خودت را انتخاب کن یا این بخش را خالی بگذار."] } });
      }
      if (target) await tx.$queryRaw(Prisma.sql`SELECT id FROM Ticket WHERE id = ${target} FOR UPDATE`);
      const ticket = target ? await tx.ticket.findFirst({ where: { id: target, ...(role === "USER" ? { ownerId: user.id } : {}) } }) : null;
      if (target && !ticket) throw missing();
      if (action === "reply" && ticket?.status === "CLOSED") throw new RequestFailure(409, "تیکت بسته است؛ پیش از ارسال پیام آن را بازگشایی کن.");
      if (action === "reply" && await tx.ticketMessage.count({ where: { ticketId: ticket!.id } }) >= 20000) throw new RequestFailure(409, "این گفتگو به سقف پیام رسیده؛ یک تیکت تازه با اشاره به این شناسه ثبت کن.");
      if (action === "state" && "expectedVersion" in data) {
        if (ticket!.version !== data.expectedVersion) throw new RequestFailure(409, "گفتگو تغییر کرده؛ صفحه را تازه کن و دوباره تصمیم بگیر.");
        const allowed = ticketTransitions[ticket!.status].includes(data.toStatus) && (role === "ADMIN" || data.toStatus === "CLOSED" || (ticket!.status === "CLOSED" && data.toStatus === "WAITING_SUPPORT"));
        if (!allowed) throw new RequestFailure(409, "این تغییر وضعیت مجاز نیست.");
      }
      const budget = await consumeDatabaseLimit(tx, secret, `support:${action}`, user.id, { windowMs: action === "create" ? 600000 : 60000, sourceLimit: 300, identityLimit: action === "create" ? 10 : action === "reply" ? 30 : 40 });
      if (!budget.allowed) return { kind: "limited" as const, retryAfter: budget.retryAfter };
      const now = new Date(); let result: TicketResult;
      if (creation) {
        const id = randomUUID(), messageId = randomUUID();
        await tx.ticket.create({ data: { id, ownerId: user.id, subject: creation.subject, category: creation.category, projectId: creation.projectId, status: "OPEN", priority: "NORMAL", messageSequence: 1, lastCustomerSequence: 1, lastActivityAt: now,
          messages: { create: { id: messageId, authorId: user.id, authorRole: role, body: creation.body, sequence: 1, createdAt: now } }, history: { create: { id: randomUUID(), actorId: user.id, actorRole: role, fromStatus: null, toStatus: "OPEN", createdAt: now } } } });
        result = { id, messageId, version: 0, status: "OPEN" };
      } else if (action === "note" && "body" in data) {
        const note = await tx.ticketNote.create({ data: { id: randomUUID(), ticketId: ticket!.id, authorId: user.id, body: data.body } }); result = { id: ticket!.id, noteId: note.id };
      } else {
        const next = action === "reply" ? role === "ADMIN" ? "WAITING_CUSTOMER" : "WAITING_SUPPORT" : "toStatus" in data ? data.toStatus : ticket!.status;
        let messageId: string | undefined;
        const sequence = ticket!.messageSequence + 1;
        if (action === "reply" && "body" in data) { messageId = randomUUID(); await tx.ticketMessage.create({ data: { id: messageId, ticketId: ticket!.id, authorId: user.id, authorRole: role, body: data.body, sequence, createdAt: now } }); }
        await tx.ticket.update({ where: { id: ticket!.id }, data: { status: next, version: { increment: 1 }, lastActivityAt: now, ...(messageId ? { messageSequence: sequence, ...(role === "USER" ? { lastCustomerSequence: sequence } : { lastSupportSequence: sequence }) } : {}) } });
        if (next !== ticket!.status) await tx.ticketStatusHistory.create({ data: { id: randomUUID(), ticketId: ticket!.id, actorId: user.id, actorRole: role, fromStatus: ticket!.status, toStatus: next, createdAt: now } });
        result = { id: ticket!.id, ...(messageId ? { messageId } : {}), status: next, version: ticket!.version + 1 };
      }
      await tx.ticketOperation.create({ data: { id: randomUUID(), actorId: user.id, operationKey, kind: action, payloadHash: digest, result } });
      return { kind: "done" as const, result, replayed: false };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, maxWait: 10000, timeout: 15000 });
    if (outcome.kind === "limited") throw new RequestFailure(429, "تعداد ارسال‌ها زیاد شده؛ کمی بعد با همین شناسه دوباره تلاش کن.", { retryAfter: outcome.retryAfter });
    return { result: outcome.result, replayed: outcome.replayed };
  }
  async function markRead(headers: Headers, role: Role, value: unknown, input: unknown) {
    const user = await principal(headers, role, true); const id = identifier(value); const data = parse(ticketReadSchema, input);
    const outcome = await db.$transaction(async tx => { await lockedActor(tx, user.id, role); await tx.$queryRaw(Prisma.sql`SELECT id FROM Ticket WHERE id = ${id} FOR UPDATE`);
      const ticket = await tx.ticket.findFirst({ where: { id, ...(role === "USER" ? { ownerId: user.id } : {}) } }); if (!ticket) throw missing();
      if (data.through > ticket.messageSequence) throw new RequestFailure(400, "شناسهٔ خواندن معتبر نیست.");
      const field = role === "USER" ? "customerReadSequence" : "supportReadSequence"; const next = Math.min(data.through, role === "USER" ? ticket.lastSupportSequence : ticket.lastCustomerSequence);
      // Read acknowledgements never reorder activity, increment concurrency version or create history.
      if (next > ticket[field]) { const budget = await consumeDatabaseLimit(tx, secret, "support:read", user.id, { windowMs: 60000, sourceLimit: 1000, identityLimit: 120 }); if (!budget.allowed) return { limited: true as const, retryAfter: budget.retryAfter }; await tx.ticket.update({ where: { id }, data: { [field]: next, updatedAt: ticket.updatedAt } }); }
      return { limited: false as const, read: true };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, maxWait: 10000, timeout: 10000 });
    if (outcome.limited) throw new RequestFailure(429, "کمی بعد دوباره خوانده‌شدن را ثبت کن.", { retryAfter: outcome.retryAfter });
    return { read: true };
  }
  return { list, detail, overview, projects, recover, write, markRead };
}
export type SupportService = ReturnType<typeof createSupportService>;
export type TicketList = Awaited<ReturnType<SupportService["list"]>>;
export type TicketDetail = Awaited<ReturnType<SupportService["detail"]>>;
export type SupportOverview = Awaited<ReturnType<SupportService["overview"]>>;
