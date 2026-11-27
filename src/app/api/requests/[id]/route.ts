import { handleRequests } from "@/server/requests/runtime";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) { return handleRequests(request, "detail", (await params).id); }
