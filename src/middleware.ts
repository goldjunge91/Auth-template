/**
 * This file exports the default middleware from NextAuth.js.
 * It is used to protect routes and handle authentication.
 */
export { default } from "next-auth/middleware";

/**
 * The config object specifies that the middleware should apply to the "/profile" route.
 * Any request to "/profile" will be processed by the NextAuth.js middleware.
 */
export const config = { matcher: ["/profile"] };

// export const middleware = null;

/**
 * @remarks
 * The commented-out code below was likely an attempt to disable the middleware,
 * possibly to work around issues related to the Edge runtime environment.
 * Client-side authentication logic might have been used as an alternative.
 */
// // Wir deaktivieren die Middleware vorübergehend und nutzen stattdessen die
// // client-side Authentifizierungslogik, um das Edge-Runtime-Problem zu umgehen.
// export const config = {
//   matcher: [],
// };
