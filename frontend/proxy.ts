import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_COOKIE, readStoreSession, STORE_ADMIN_COOKIE, verifyPlatformSession } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/admin/login" || pathname.startsWith("/admin/login/")) return NextResponse.next();

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const ok = await verifyPlatformSession(request.cookies.get(ADMIN_COOKIE)?.value);
    if (ok) return NextResponse.next();
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  const storeAdmin = pathname.match(/^\/([^/]+)\/admin(\/.*)?$/);
  if (storeAdmin) {
    const slug = decodeURIComponent(storeAdmin[1] ?? "");
    if (pathname === `/${slug}/admin/login` || pathname.startsWith(`/${slug}/admin/login/`)) return NextResponse.next();
    const session = await readStoreSession(request.cookies.get(STORE_ADMIN_COOKIE)?.value);
    if (session?.slug === slug) return NextResponse.next();
    const url = request.nextUrl.clone();
    url.pathname = `/${slug}/admin/login`;
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/:slug/admin", "/:slug/admin/:path*"],
};
