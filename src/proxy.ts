import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, sessionAllows, adminMode } from "@/lib/auth";
import { resourcesTypoTarget } from "@/lib/typo-redirect";

/* Next 16 renamed `middleware.ts` to `proxy.ts`; same thing, and it
   runs on the Node runtime, which is what lets it share the HMAC
   check in lib/auth.ts.

   This is the redirect layer, not the guarantee: it turns an
   unauthenticated hit on /admin into a trip to /login. The actual
   enforcement is `requireAdmin()` in the admin layout and in every
   server action, because those run inside the app where the render
   and the writes happen. */

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname !== "/admin" && !pathname.startsWith("/admin/")) {
    /* Misspelled /resources: a permanent redirect, query (UTMs) kept. */
    const target = resourcesTypoTarget(pathname);
    if (!target) return NextResponse.next();
    const url = request.nextUrl.clone();
    url.pathname = target;
    return NextResponse.redirect(url, 308);
  }

  const mode = adminMode();

  if (mode.kind === "misconfigured") {
    return new NextResponse(
      "Admin is disabled: ADMIN_PASSWORD is not set on this deployment.",
      { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } },
    );
  }

  if (sessionAllows(request.cookies.get(SESSION_COOKIE)?.value, mode)) {
    return NextResponse.next();
  }

  const login = new URL("/login", request.url);
  login.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: [
    "/admin",
    "/admin/:path*",
    /* Single-segment paths only, for the /resources typo redirect; never
       the API, Next's own assets, or anything with a file extension. */
    "/((?!api|_next|admin)[^/.]+)",
  ],
};
