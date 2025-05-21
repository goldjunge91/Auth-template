export { default } from "next-auth/middleware";

export const config = { matcher: ["/profile"] };

// export const middleware = null;

// // Wir deaktivieren die Middleware vorübergehend und nutzen stattdessen die
// // client-side Authentifizierungslogik, um das Edge-Runtime-Problem zu umgehen.
// export const config = {
//   matcher: [],
// };
