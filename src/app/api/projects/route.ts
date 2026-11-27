import { handleCustomerProjects } from "@/server/projects/runtime";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export function GET(request: Request) { return handleCustomerProjects(request, "collection"); }
export const POST = GET;
export const PUT = GET;
export const PATCH = GET;
export const DELETE = GET;
