import { handleManagement } from "@/server/management/runtime";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
async function handle(request: Request, { params }: {
    params: Promise<{
        management: string[];
    }>;
}) { return handleManagement(request, (await params).management); }
export { handle as GET, handle as POST };
