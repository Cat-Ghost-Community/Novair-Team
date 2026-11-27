import { authenticationEnabled, getAuthentication } from "@/server/auth/runtime";
import { AccountAccessError, readAdminOverview } from "@/server/auth/account-data";
import { getDatabase } from "@/server/db/client";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const headers = { "Cache-Control": "private, no-store" };
  if (!authenticationEnabled()) return Response.json({ message: "دسترسی به حساب هنوز فعال نیست." }, { status: 404, headers });
  try { return Response.json(await readAdminOverview(getAuthentication(), getDatabase(), request.headers), { headers }); }
  catch (error) { return Response.json({ message: "دسترسی به این بخش مجاز نیست." }, { status: error instanceof AccountAccessError ? error.status : 503, headers }); }
}
