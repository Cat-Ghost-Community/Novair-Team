import { handleCustomerProjects } from "@/server/projects/runtime";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request, { params }: {
    params: Promise<{
        id: string;
    }>;
}) { return handleCustomerProjects(request, "detail", (await params).id); }
export const POST = GET;
export const PUT = GET;
export const PATCH = GET;
export const DELETE = GET;
