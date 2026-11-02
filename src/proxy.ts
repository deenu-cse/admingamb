import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic route guard only: `gadm_s` is a non-secret hint that an admin session exists (it
 * outlives the 15-minute access cookie). The backend still authorizes every API call, and a failed
 * refresh clears this cookie, so a dead session can't bounce between /login and /.
 */
export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const hasSession = req.cookies.has("gadm_s");
  if (pathname === "/login") return hasSession ? NextResponse.redirect(new URL("/", req.url)) : NextResponse.next();
  if (hasSession) return NextResponse.next();
  const url = new URL("/login", req.url);
  if (pathname !== "/") url.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(url);
}

export const config = {
  // API calls and the socket pass through here in proxy mode. The backend authorizes those itself.
  matcher: ["/((?!_next/|api/|socket\\.io|favicon.ico).*)"],
};
