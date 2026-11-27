import { authenticationEnabled, getAuthentication } from "@/server/auth/runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
async function handler(request: Request) {
  if (!authenticationEnabled()) return Response.json({ ok: false, message: "دسترسی به حساب هنوز فعال نیست." }, { status: 404, headers: { "Cache-Control": "no-store" } });
  return getAuthentication().handle(request);
}
export { handler as GET, handler as POST };
