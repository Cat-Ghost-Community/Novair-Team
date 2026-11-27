import { handleRequests } from "@/server/requests/runtime";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = (request: Request) => handleRequests(request, "collection");
export const POST = (request: Request) => handleRequests(request, "collection");
