import { handleSupport } from "@/server/tickets/runtime";
export const dynamic = "force-dynamic";
async function handle(request: Request, { params }: { params: Promise<{ support?: string[] }> }) { return handleSupport(request, (await params).support ?? [], "ADMIN"); }
export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE };
