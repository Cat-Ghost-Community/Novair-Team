import { handleContent } from "@/server/content/runtime";
export const dynamic = "force-dynamic";
type Context = {
    params: Promise<{
        content?: string[];
    }>;
};
async function handle(request: Request, context: Context) { return handleContent(request, (await context.params).content ?? []); }
export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
