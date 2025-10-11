import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const isAdminApp = process.env.NEXT_PUBLIC_APP_TYPE === "admin";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Admin 앱과 Main 앱 라우트 분리
  if (isAdminApp) {
    // Admin 앱: 일반 서비스 라우트 차단
    const serviceRoutes = ["/missions", "/crews", "/records", "/members", "/auth/callback"];
    if (serviceRoutes.some(route => pathname.startsWith(route))) {
      return NextResponse.redirect(new URL("/admin-dashboard", request.url));
    }
  } else {
    // Main 앱: admin 라우트 차단
    const adminRoutes = ["/admin-dashboard", "/admin-login"];
    if (adminRoutes.some(route => pathname.startsWith(route))) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // Supabase 인증이 필요한 /admin 경로만 체크 (새로운 admin-login, admin-dashboard는 JWT 인증 사용)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 구 admin 페이지만 체크 (새로운 admin 시스템은 JWT로 자체 인증)
  if (
    !user &&
    request.nextUrl.pathname.startsWith("/admin") &&
    !request.nextUrl.pathname.startsWith("/admin-login") &&
    !request.nextUrl.pathname.startsWith("/admin-dashboard")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("error", "unauthorized");
    return NextResponse.redirect(url);
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - auth/callback (auth callback)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|auth/callback|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
