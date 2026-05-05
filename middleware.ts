import { NextRequest, NextResponse } from "next/server";

const PUBLIC = ["/login", "/api/auth/login", "/api/auth/logout", "/_next", "/favicon.ico", "/icon", "/robots.txt"];

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }
  const cookie = req.cookies.get("aishwin_session")?.value;
  if (!cookie) {
    const url = req.nextUrl.clone();
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  // Edge middleware can't verify HMAC without the secret being on the edge runtime;
  // we accept presence here and re-verify in server actions / route handlers via isAuthed().
  return NextResponse.next();
}
