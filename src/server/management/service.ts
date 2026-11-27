import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import type { AuthenticationService } from "../auth/service.ts";
import { readOwnAccount, AccountAccessError } from "../auth/account-data.ts";
import { RequestFailure } from "../requests/service.ts";
import { consumeDatabaseLimit } from "../security/auth-rate-limit.ts";
import { requestIdSchema, operationKeySchema } from "../../shared/request-contracts.ts";
import { adminRequestQuerySchema, adminProjectQuerySchema, reviewSchema, conversionSchema, projectUpdateSchema, projectStatusSchema, noteSchema, reviewTransitions, projectTransitions, managementPageSize, type ManagementResult } from "../../shared/management-contracts.ts";
import type { ZodType } from "zod";
function validate<T>(schema: ZodType<T>, input: unknown): T {
    const result = schema.safeParse(input);
    if (result.success)
        return result.data;
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of result.error.issues)
        if (typeof issue.path[0] === "string")
            (fieldErrors[issue.path[0]] ??= []).push(issue.message);
    throw new RequestFailure(400, "اطلاعات معتبر نیست؛ بخش‌های مشخص‌شده را بررسی کنید.", { fieldErrors });
}
const idOf = (value: unknown) => {
    const result = requestIdSchema.safeParse(value);
    if (!result.success)
        throw new RequestFailure(404, "این رکورد در دسترس نیست.");
    return result.data;
};
const accountSelect = { id: true, name: true, email: true } as const;
const requestSelect = { id: true, title: true, category: true, budgetPreference: true, timelinePreference: true, status: true, reviewVersion: true, createdAt: true, updatedAt: true, owner: { select: accountSelect }, project: { select: { id: true } } } as const;
const projectSelect = { id: true, title: true, status: true, version: true, requestId: true, plannedStart: true, targetCompletion: true, createdAt: true, updatedAt: true, owner: { select: accountSelect }, assignee: { select: { id: true, name: true, role: true, disabledAt: true } } } as const;
const noteSelect = { id: true, body: true, createdAt: true, author: { select: { id: true, name: true } } } as const;
const iso = (value: Date) => value.toISOString();
const day = (value: Date | null) => value?.toISOString().slice(0, 10) ?? null;
type AdminRequestRow = Prisma.ProjectRequestGetPayload<{
    select: typeof requestSelect;
}>;
type AdminProjectRow = Prisma.ProjectGetPayload<{
    select: typeof projectSelect;
}>;
const requestRow = (row: AdminRequestRow) => ({ id: row.id, title: row.title, category: row.category, budgetPreference: row.budgetPreference, timelinePreference: row.timelinePreference, status: row.status, reviewVersion: row.reviewVersion, owner: row.owner, project: row.project, createdAt: iso(row.createdAt), updatedAt: iso(row.updatedAt) });
const projectRow = (row: AdminProjectRow) => ({ id: row.id, title: row.title, status: row.status, version: row.version, requestId: row.requestId, owner: row.owner, assignee: row.assignee ? { id: row.assignee.id, name: row.assignee.name, eligible: row.assignee.role === "ADMIN" && !row.assignee.disabledAt } : null, plannedStart: day(row.plannedStart), targetCompletion: day(row.targetCompletion), createdAt: iso(row.createdAt), updatedAt: iso(row.updatedAt) });
export type ManagementAction = "review" | "convert" | "request-note" | "project-status" | "project-update" | "project-note";
export function createManagementService(db: PrismaClient, auth: AuthenticationService, secret: string) {
    async function administrator(headers: Headers) {
        const user = await readOwnAccount(auth, headers);
        if (user.role !== "ADMIN")
            throw new AccountAccessError(403);
        return user;
    }
    async function requests(headers: Headers, input: unknown = {}) {
        await administrator(headers);
        const query = validate(adminRequestQuerySchema, input);
        const where: Prisma.ProjectRequestWhereInput = {
            ...(query.status === "ALL" ? {} : { status: query.status }), ...(query.unconverted === "true" ? { project: null } : {}),
            ...(query.q ? { OR: [{ title: { contains: query.q } }, { id: { contains: query.q } }, { owner: { name: { contains: query.q } } }, { owner: { email: { contains: query.q } } }] } : {}),
        };
        const [rows, total] = await db.$transaction([db.projectRequest.findMany({ where, select: requestSelect, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (query.page - 1) * managementPageSize, take: managementPageSize }), db.projectRequest.count({ where })]);
        return { items: rows.map(requestRow), total, ...query, pageSize: managementPageSize };
    }
    async function requestDetail(headers: Headers, value: unknown) {
        await administrator(headers);
        const id = idOf(value);
        const row = await db.projectRequest.findUnique({ where: { id }, select: { ...requestSelect, description: true, relevantUrl: true, budget: true, deadline: true,
                history: { select: { id: true, fromStatus: true, toStatus: true, publicExplanation: true, createdAt: true, actor: { select: { id: true, name: true } } }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 101 },
                adminNotes: { select: noteSelect, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 101 },
            } });
        if (!row)
            throw new RequestFailure(404, "این درخواست در دسترس نیست.");
        return { ...requestRow(row), description: row.description, relevantUrl: row.relevantUrl, legacyBudget: row.budget?.toString() ?? null, legacyDeadline: row.deadline?.toISOString() ?? null,
            historyLimited: row.history.length > 100, notesLimited: row.adminNotes.length > 100,
            history: row.history.slice(0, 100).reverse().map(event => ({ ...event, createdAt: iso(event.createdAt) })),
            notes: row.adminNotes.slice(0, 100).reverse().map(note => ({ ...note, createdAt: iso(note.createdAt) })),
        };
    }
    async function projects(headers: Headers, input: unknown = {}) {
        await administrator(headers);
        const query = validate(adminProjectQuerySchema, input);
        const where: Prisma.ProjectWhereInput = { ...(query.status === "ALL" ? {} : { status: query.status }), ...(query.active === "true" ? { AND: [{ status: { in: ["PLANNED", "IN_PROGRESS", "ON_HOLD"] } }] } : {}), ...(query.q ? { OR: [{ title: { contains: query.q } }, { id: { contains: query.q } }, { owner: { name: { contains: query.q } } }, { owner: { email: { contains: query.q } } }] } : {}) };
        const [rows, total] = await db.$transaction([db.project.findMany({ where, select: projectSelect, orderBy: [{ updatedAt: "desc" }, { id: "desc" }], skip: (query.page - 1) * managementPageSize, take: managementPageSize }), db.project.count({ where })]);
        return { items: rows.map(projectRow), total, ...query, pageSize: managementPageSize };
    }
    async function projectDetail(headers: Headers, value: unknown) {
        await administrator(headers);
        const id = idOf(value);
        const row = await db.project.findUnique({ where: { id }, select: { ...projectSelect, description: true,
                history: { select: { id: true, fromStatus: true, toStatus: true, createdAt: true, actor: { select: { id: true, name: true } } }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 101 },
                auditEvents: { select: { id: true, changes: true, createdAt: true, actor: { select: { id: true, name: true } } }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 101 },
                adminNotes: { select: noteSelect, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 101 },
            } });
        if (!row)
            throw new RequestFailure(404, "این پروژه در دسترس نیست.");
        const assignees = await db.user.findMany({ where: { role: "ADMIN", disabledAt: null }, select: { id: true, name: true }, orderBy: [{ name: "asc" }, { id: "asc" }], take: 100 });
        return { ...projectRow(row), description: row.description, assignees,
            historyLimited: row.history.length > 100, auditLimited: row.auditEvents.length > 100, notesLimited: row.adminNotes.length > 100,
            history: row.history.slice(0, 100).reverse().map(event => ({ ...event, createdAt: iso(event.createdAt) })),
            audit: row.auditEvents.slice(0, 100).reverse().map(event => ({ ...event, createdAt: iso(event.createdAt) })),
            notes: row.adminNotes.slice(0, 100).reverse().map(note => ({ ...note, createdAt: iso(note.createdAt) })),
        };
    }
    async function overview(headers: Headers) {
        await administrator(headers);
        const [newRequests, reviewing, awaitingConversion, activeProjects, completedProjects, recentRequests, recentProjects] = await db.$transaction([
            db.projectRequest.count({ where: { status: "NEW" } }), db.projectRequest.count({ where: { status: "REVIEWING" } }),
            db.projectRequest.count({ where: { status: "ACCEPTED", project: null } }),
            db.project.count({ where: { status: { in: ["PLANNED", "IN_PROGRESS", "ON_HOLD"] } } }), db.project.count({ where: { status: "COMPLETED" } }),
            db.projectRequest.findMany({ select: requestSelect, orderBy: [{ updatedAt: "desc" }, { id: "desc" }], take: 3 }),
            db.project.findMany({ select: projectSelect, orderBy: [{ updatedAt: "desc" }, { id: "desc" }], take: 3 }),
        ]);
        return { newRequests, reviewing, awaitingConversion, activeProjects, completedProjects, recentRequests: recentRequests.map(requestRow), recentProjects: recentProjects.map(projectRow) };
    }
    async function operation(headers: Headers, value: unknown) {
        const actor = await administrator(headers);
        const key = operationKeySchema.safeParse(value);
        if (!key.success)
            throw new RequestFailure(404, "عملیات ثبت‌شده‌ای در دسترس نیست.");
        const row = await db.adminOperation.findUnique({ where: { actorId_operationKey: { actorId: actor.id, operationKey: key.data } }, select: { result: true } });
        if (!row)
            throw new RequestFailure(404, "هنوز نتیجهٔ ثبت‌شده‌ای برای این عملیات وجود ندارد.");
        return { result: row.result as ManagementResult, replayed: true };
    }
    async function mutate(headers: Headers, action: ManagementAction, value: unknown, input: unknown) {
        const actor = await administrator(headers);
        const targetId = idOf(value);
        const reviewData = action === "review" ? validate(reviewSchema, input) : undefined;
        const conversionData = action === "convert" ? validate(conversionSchema, input) : undefined;
        const statusData = action === "project-status" ? validate(projectStatusSchema, input) : undefined;
        const updateData = action === "project-update" ? validate(projectUpdateSchema, input) : undefined;
        const noteData = action === "request-note" || action === "project-note" ? validate(noteSchema, input) : undefined;
        const data = reviewData ?? conversionData ?? statusData ?? updateData ?? noteData!;
        const expectedVersion = reviewData?.expectedVersion ?? conversionData?.expectedVersion ?? statusData?.expectedVersion ?? updateData?.expectedVersion;
        const { operationKey, ...payload } = data;
        const digest = createHash("sha256").update(JSON.stringify({ action, targetId, payload })).digest("hex");
        const txResult = await db.$transaction(async (tx) => {
            // Lock actor and optional assignee in a stable order before target rows/counters.
            const ids = [...new Set([actor.id, ...(updateData?.assigneeId ? [updateData.assigneeId] : [])])].sort();
            let eligibleAssignee = true;
            for (const id of ids) {
                const rows = await tx.$queryRaw<{
                    id: string;
                    role: string;
                    disabledAt: Date | null;
                }[]>(Prisma.sql `SELECT id, role, disabledAt FROM User WHERE id = ${id} FOR UPDATE`);
                if (!rows[0] || rows[0].role !== "ADMIN" || rows[0].disabledAt) {
                    if (id === actor.id)
                        throw new AccountAccessError(403);
                    eligibleAssignee = false;
                }
            }
            const previous = await tx.adminOperation.findUnique({ where: { actorId_operationKey: { actorId: actor.id, operationKey } } });
            if (previous) {
                if (previous.payloadHash !== digest)
                    throw new RequestFailure(409, "این شناسه قبلاً برای عملیات دیگری ثبت شده است. نتیجه را بررسی و اطلاعات را تازه کنید.");
                return { kind: "done" as const, result: previous.result as ManagementResult, replayed: true };
            }
            if (!eligibleAssignee)
                throw new RequestFailure(400, "مسئول باید یک مدیر فعال موجود باشد.", { fieldErrors: { assigneeId: ["مدیر فعال دیگری انتخاب کنید یا مسئول را خالی بگذارید."] } });
            const requestAction = ["review", "convert", "request-note"].includes(action);
            if (requestAction)
                await tx.$queryRaw(Prisma.sql `SELECT id FROM ProjectRequest WHERE id = ${targetId} FOR UPDATE`);
            else
                await tx.$queryRaw(Prisma.sql `SELECT id FROM Project WHERE id = ${targetId} FOR UPDATE`);
            const request = requestAction ? await tx.projectRequest.findUnique({ where: { id: targetId }, include: { project: { select: { id: true, version: true } } } }) : null;
            const project = !requestAction ? await tx.project.findUnique({ where: { id: targetId } }) : null;
            if (!request && !project)
                throw new RequestFailure(404, "این رکورد در دسترس نیست.");
            const save = async (result: ManagementResult) => {
                await tx.adminOperation.create({ data: { id: randomUUID(), actorId: actor.id, operationKey, kind: action, targetId, payloadHash: digest, result } });
                return { kind: "done" as const, result, replayed: false };
            };
            if (action === "convert" && request?.project) {
                const budget = await consumeDatabaseLimit(tx, secret, "management:mutate", actor.id, { windowMs: 60000, sourceLimit: 120, identityLimit: 30 });
                if (!budget.allowed)
                    return { kind: "limited" as const, retryAfter: budget.retryAfter };
                return save({ id: request.project.id, resource: "project", version: request.project.version, alreadyConverted: true });
            }
            if (expectedVersion !== undefined && expectedVersion !== (request ? request.reviewVersion : project!.version))
                throw new RequestFailure(409, "اطلاعات تغییر کرده است؛ جزئیات تازه را بخوانید و دوباره تصمیم بگیرید.");
            if (reviewData && request) {
                const next = reviewData.toStatus;
                if (!(reviewTransitions[request.status] as readonly string[]).includes(next))
                    throw new RequestFailure(409, "این تغییر وضعیت درخواست مجاز نیست. وضعیت فعلی را دوباره بررسی کنید.");
            }
            if (action === "convert" && request?.status !== "ACCEPTED")
                throw new RequestFailure(409, "فقط درخواست پذیرفته‌شده قابل تبدیل به پروژه است.");
            if (statusData && project && !(projectTransitions[project.status] as readonly string[]).includes(statusData.toStatus))
                throw new RequestFailure(409, "این تغییر وضعیت پروژه مجاز نیست.");
            if (action === "project-update" && project && ["COMPLETED", "CANCELLED"].includes(project.status))
                throw new RequestFailure(409, "اطلاعات اجرایی پروژهٔ بسته‌شده قابل تغییر نیست؛ یادداشت خصوصی همچنان قابل ثبت است.");
            const budget = await consumeDatabaseLimit(tx, secret, "management:mutate", actor.id, { windowMs: 60000, sourceLimit: 120, identityLimit: 30 });
            if (!budget.allowed)
                return { kind: "limited" as const, retryAfter: budget.retryAfter };
            if (reviewData && request) {
                const next = reviewData.toStatus;
                await tx.projectRequest.update({ where: { id: targetId }, data: { status: next, reviewVersion: { increment: 1 } } });
                await tx.projectRequestStatusHistory.create({ data: { id: randomUUID(), requestId: targetId, actorId: actor.id, fromStatus: request.status, toStatus: next, publicExplanation: reviewData.toStatus === "DECLINED" ? reviewData.publicExplanation : null } });
                if (reviewData.toStatus === "DECLINED" && reviewData.privateNote)
                    await tx.adminNote.create({ data: { id: randomUUID(), requestId: targetId, authorId: actor.id, body: reviewData.privateNote } });
                return save({ id: targetId, resource: "request", version: request.reviewVersion + 1 });
            }
            if (action === "convert" && request) {
                const created = await tx.project.create({ data: { id: randomUUID(), requestId: targetId, ownerId: request.ownerId, title: request.title, description: request.description, status: "PLANNED", history: { create: { id: randomUUID(), actorId: actor.id, fromStatus: null, toStatus: "PLANNED" } } } });
                await tx.projectRequest.update({ where: { id: targetId }, data: { reviewVersion: { increment: 1 } } });
                return save({ id: created.id, resource: "project", version: created.version });
            }
            if (noteData) {
                const note = await tx.adminNote.create({ data: { id: randomUUID(), ...(requestAction ? { requestId: targetId } : { projectId: targetId }), authorId: actor.id, body: noteData.body } });
                return save({ id: targetId, resource: requestAction ? "request" : "project", noteId: note.id });
            }
            if (statusData && project) {
                const next = statusData.toStatus;
                await tx.project.update({ where: { id: targetId }, data: { status: next, version: { increment: 1 } } });
                await tx.projectStatusHistory.create({ data: { id: randomUUID(), projectId: targetId, actorId: actor.id, fromStatus: project.status, toStatus: next } });
                return save({ id: targetId, resource: "project", version: project.version + 1 });
            }
            if (updateData && project) {
                const changes: Record<string, {
                    from: string | null;
                    to: string | null;
                }> = {};
                const before = { title: project.title, description: project.description, assigneeId: project.assigneeId, plannedStart: day(project.plannedStart), targetCompletion: day(project.targetCompletion) };
                const after = { title: updateData.title, description: updateData.description, assigneeId: updateData.assigneeId, plannedStart: updateData.plannedStart, targetCompletion: updateData.targetCompletion };
                for (const key of Object.keys(before) as (keyof typeof before)[])
                    if (before[key] !== after[key])
                        changes[key] = { from: before[key], to: after[key] };
                if (!Object.keys(changes).length)
                    return save({ id: targetId, resource: "project", version: project.version, noChange: true });
                await tx.project.update({ where: { id: targetId }, data: { title: updateData.title, description: updateData.description, assigneeId: updateData.assigneeId, plannedStart: updateData.plannedStart ? new Date(`${updateData.plannedStart}T00:00:00Z`) : null, targetCompletion: updateData.targetCompletion ? new Date(`${updateData.targetCompletion}T00:00:00Z`) : null, version: { increment: 1 } } });
                await tx.projectAuditEvent.create({ data: { id: randomUUID(), projectId: targetId, actorId: actor.id, changes } });
                return save({ id: targetId, resource: "project", version: project.version + 1 });
            }
            throw new RequestFailure(400, "عملیات معتبر نیست.");
            // The operation lookup precedes target reads; READ COMMITTED avoids a pre-lock snapshot
            // hiding another administrator's just-committed version after waiting for that target lock.
        }, { maxWait: 10000, timeout: 10000, isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
        if (txResult.kind === "limited")
            throw new RequestFailure(429, "تعداد عملیات زیاد است؛ کمی بعد دوباره تلاش کنید. نتیجهٔ عملیات ثبت‌شده همچنان قابل بررسی است.", { retryAfter: txResult.retryAfter });
        return { result: txResult.result, replayed: txResult.replayed };
    }
    return { requests, requestDetail, projects, projectDetail, overview, operation, mutate };
}
export type ManagementService = ReturnType<typeof createManagementService>;
export type AdminRequestDetail = Awaited<ReturnType<ManagementService["requestDetail"]>>;
export type AdminProjectDetail = Awaited<ReturnType<ManagementService["projectDetail"]>>;
