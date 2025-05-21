// import NextAuth from 'next-auth';
// import { authConfig } from '@/src/auth.config';
// import { NextRequest, NextResponse } from 'next/server';

// const { auth: middlewareAuth } = NextAuth(authConfig);

// const protectedRoutePrefixes = {
//   admin: '/admin',
//   manager: '/manager',
//   // Add other protected general routes if needed, e.g., '/profile'
// };

// export default async function middleware(req: NextRequest) {
//   const session = await middlewareAuth(); // Get session using the auth from NextAuth(authConfig)
//   const { pathname } = req.nextUrl;

//   // Check for admin routes
//   if (pathname.startsWith(protectedRoutePrefixes.admin)) {
//     if (!session || session.user?.role !== 'admin') {
//       const url = req.nextUrl.clone();
//       url.pathname = '/login'; // Or your unauthorized page
//       return NextResponse.redirect(url);
//     }
//   }

//   // Check for manager routes
//   else if (pathname.startsWith(protectedRoutePrefixes.manager)) {
//     if (!session || !['admin', 'manager'].includes(session.user?.role || '')) {
//       const url = req.nextUrl.clone();
//       url.pathname = '/login'; // Or your unauthorized page
//       return NextResponse.redirect(url);
//     }
//   }

//   // Add checks for other protected routes like '/profile' if necessary
//   // Example for a general authenticated route:
//   // else if (pathname.startsWith('/profile')) {
//   //   if (!session) {
//   //     const url = req.nextUrl.clone();
//   //     url.pathname = '/login';
//   //     return NextResponse.redirect(url);
//   //   }
//   // }

//   return NextResponse.next();
// }

// export const config = {
//   // Matcher for all routes that should be processed by this middleware.
//   // This includes protected routes and potentially public routes if you want the session object available.
//   // Adjust the matcher to be as specific or as broad as needed.
//   runtime: 'nodejs', // Force Node.js runtime für die Middleware statt Edge
//   // It's often good to exclude static assets and API routes unless they also need protection
//   // or session information.
//   matcher: [
//     /*
//      * Match all request paths except for the ones starting with:
//      * - api (API routes)
//      * - _next/static (static files)
//      * - _next/image (image optimization files)
//      * - favicon.ico (favicon file)
//      * - login (login page itself to avoid redirect loops)
//      * - public (public assets)
//      */
//     '/((?!api|_next/static|_next/image|favicon.ico|login|public).*)',
//     // Explicitly include top-level protected paths if not covered by the general pattern
//     '/admin/:path*',
//     '/manager/:path*',
//     // '/profile/:path*', // if you have a profile page
//   ],
// };