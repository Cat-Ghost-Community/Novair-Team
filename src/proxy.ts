import { NextResponse, type NextRequest } from "next/server";
import { safeReturnPath } from "@/server/auth/policy";
import { authenticationEnabled, getAuthentication } from "@/server/auth/runtime";
import { site } from "@/config/site";

// Early fail-closed redirect avoids streamed 200 responses for reserved private pages.
// Keep the server page/layout guards: this boundary is not a replacement for data authorization.
export async function proxy(request: NextRequest) {
  try {
    const context = authenticationEnabled() ? await getAuthentication().principal(request.headers) : null;
    if (context) {
      const adminPath = request.nextUrl.pathname.startsWith("/admin");
      const response = context.user.role === (adminPath ? "ADMIN" : "USER") ? NextResponse.next()
        : NextResponse.redirect(new URL(context.user.role === "ADMIN" ? "/admin" : "/dashboard?notice=forbidden", site.url));
      response.headers.set("Cache-Control", "private, no-store, max-age=0");
      return response;
    }
  } catch {
    return new NextResponse("سرویس حساب فعلاً در دسترس نیست.", { status: 503, headers: { "Cache-Control": "private, no-store" } });
  }
  const destination = new URL("/login", site.url);
  destination.searchParams.set("next", safeReturnPath(request.nextUrl.pathname));
  const response = NextResponse.redirect(destination);
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  return response;
}

export const config = { matcher: ["/dashboard/:path*", "/admin/:path*"] };
