import "server-only";
import type { Prisma, PrismaClient } from "@prisma/client";
import type { AuthenticationService } from "../auth/service.ts";
import { readOwnAccount, AccountAccessError } from "../auth/account-data.ts";
import { RequestFailure, listSelect as requestSelect, listItem as requestItem } from "../requests/service.ts";
import { requestIdSchema } from "../../shared/request-contracts.ts";
import { customerProjectListSchema, CUSTOMER_PROJECT_PAGE_SIZE, activeProjectStatuses } from "../../shared/customer-project-contracts.ts";
// Intentionally omit description, assignment, version, owner and every administrative relation.
const projectSelect = { id: true, title: true, status: true, createdAt: true, updatedAt: true, plannedStart: true, targetCompletion: true } as const;
type Row = Prisma.ProjectGetPayload<{
    select: typeof projectSelect;
}>;
const projectItem = (row: Row) => ({ id: row.id, title: row.title, status: row.status, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(), plannedStart: row.plannedStart?.toISOString().slice(0, 10) ?? null, targetCompletion: row.targetCompletion?.toISOString().slice(0, 10) ?? null });
export type CustomerProjectItem = ReturnType<typeof projectItem>;
export function createCustomerProjectsService(db: PrismaClient, authentication: AuthenticationService) {
    async function customer(headers: Headers) {
        const user = await readOwnAccount(authentication, headers);
        if (user.role !== "USER")
            throw new AccountAccessError(403);
        return user;
    }
    async function list(headers: Headers, input: unknown = {}) {
        const user = await customer(headers);
        const parsed = customerProjectListSchema.safeParse(input);
        if (!parsed.success)
            throw new RequestFailure(400, "وضعیت یا شمارهٔ صفحهٔ پروژه معتبر نیست.");
        const query = parsed.data;
        const where: Prisma.ProjectWhereInput = { ownerId: user.id, ...(query.status === "ALL" ? {} : { status: query.status }), ...(query.active === "true" ? { AND: [{ status: { in: activeProjectStatuses } }] } : {}) };
        const [rows, total] = await db.$transaction([
            db.project.findMany({ where, select: projectSelect, orderBy: [{ updatedAt: "desc" }, { id: "desc" }], skip: (query.page - 1) * CUSTOMER_PROJECT_PAGE_SIZE, take: CUSTOMER_PROJECT_PAGE_SIZE }),
            db.project.count({ where }),
        ]);
        return { items: rows.map(projectItem), total, pageSize: CUSTOMER_PROJECT_PAGE_SIZE, ...query };
    }
    async function detail(headers: Headers, value: unknown) {
        const user = await customer(headers);
        const id = requestIdSchema.safeParse(value);
        if (!id.success)
            throw new RequestFailure(404, "این پروژه در دسترس نیست.");
        const row = await db.project.findFirst({ where: { id: id.data, ownerId: user.id }, select: {
                ...projectSelect,
                request: { where: { ownerId: user.id }, select: { id: true } },
                history: { select: { id: true, fromStatus: true, toStatus: true, createdAt: true }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 101 },
            } });
        if (!row)
            throw new RequestFailure(404, "این پروژه در دسترس نیست.");
        return { ...projectItem(row), originRequestId: row.request?.id ?? null, historyLimited: row.history.length > 100,
            history: row.history.slice(0, 100).reverse().map(event => ({ id: event.id, fromStatus: event.fromStatus, toStatus: event.toStatus, createdAt: event.createdAt.toISOString() })),
        };
    }
    async function overview(headers: Headers) {
        const user = await customer(headers);
        const where = { ownerId: user.id };
        const requestGroups = db.projectRequest.groupBy({ by: ["status"], where, orderBy: { status: "asc" }, _count: { _all: true } });
        const projectGroups = db.project.groupBy({ by: ["status"], where, orderBy: { status: "asc" }, _count: { _all: true } });
        const [requests, projects, recentRequests, recentProjects] = await db.$transaction([
            requestGroups,
            projectGroups,
            db.projectRequest.findMany({ where, select: requestSelect, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 3 }),
            db.project.findMany({ where, select: projectSelect, orderBy: [{ updatedAt: "desc" }, { id: "desc" }], take: 3 }),
        ]);
        return {
            requests: { total: requests.reduce((n, group) => n + group._count._all, 0), awaitingReview: requests.filter(g => g.status === "NEW" || g.status === "REVIEWING").reduce((n, group) => n + group._count._all, 0), accepted: requests.find(g => g.status === "ACCEPTED")?._count._all ?? 0, statuses: requests.map(g => ({ status: g.status, count: g._count._all })), recent: recentRequests.map(requestItem) },
            projects: { total: projects.reduce((n, group) => n + group._count._all, 0), active: projects.filter(g => activeProjectStatuses.includes(g.status)).reduce((n, group) => n + group._count._all, 0), completed: projects.find(g => g.status === "COMPLETED")?._count._all ?? 0, recent: recentProjects.map(projectItem) },
        };
    }
    return { list, detail, overview };
}
export type CustomerProjectsService = ReturnType<typeof createCustomerProjectsService>;
export type CustomerProjectDetail = Awaited<ReturnType<CustomerProjectsService["detail"]>>;
export type CustomerOverview = Awaited<ReturnType<CustomerProjectsService["overview"]>>;
