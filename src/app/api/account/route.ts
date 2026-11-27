import { authenticationEnabled, getAuthentication } from "@/server/auth/runtime";
import { AccountAccessError, readOwnAccount } from "@/server/auth/account-data";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const headers = { "Cache-Control": "private, no-store" };
  if (!authenticationEnabled()) return Response.json({ message: "دسترسی به حساب هنوز فعال نیست." }, { status: 404, headers });
  if (new URL(request.url).search) return Response.json({ message: "درخواست معتبر نیست." }, { status: 400, headers });
  try { return Response.json({ user: await readOwnAccount(getAuthentication(), request.headers) }, { headers }); }
  catch (error) { return Response.json({ message: "دسترسی به حساب امکان‌پذیر نیست." }, { status: error instanceof AccountAccessError ? error.status : 503, headers }); }
}
