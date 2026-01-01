export { default } from "next-auth/middleware";

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api/auth (auth API routes)
         * - auth/signin (signin page)
         * - auth/signup (signup page)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        "/((?!api/auth|auth|webcontainer|favicon.ico|_next).*)",
    ],
};
