# Error Handling Strategies for Unauthorized Access

This document defines strategies for handling unauthorized access, covering custom forbidden pages, API error responses, and client-side reactions.

---

## 1. Custom 403 Forbidden Page

*   **Purpose:**
    To provide a user-friendly page when an authenticated user attempts to access a resource or page for which they do not have sufficient permissions. This enhances the user experience by providing clear feedback instead of a generic error or a blank page.

*   **File Location (Conceptual):**
    *   Next.js App Router: `src/app/forbidden/page.tsx`
    *   Or using a custom error component structure: `src/app/_errors/403.tsx` (this might involve conventions like Next.js's `not-found.tsx` but for 403 errors, potentially leveraging custom handling in `src/app/global-error.tsx` or a specific layout).

*   **Content:**
    *   **Clear Message:** Prominently display "Access Denied" or "403 - Forbidden".
    *   **Explanation (Optional but Recommended):** A brief, user-friendly explanation, e.g., "Sorry, you do not have the necessary permissions to view this page." or "Your current role does not grant access to this resource."
    *   **Guidance/Links:**
        *   A link to the application's homepage (e.g., "Go to Homepage").
        *   Optionally, a link to the login page if the system suspects the user might need to re-authenticate with a different account (e.g., "Login as a different user").
        *   Contact information for support if the user believes they should have access.

*   **Triggering:**
    *   **`middleware.ts`:** The primary trigger for server-rendered pages. If `middleware.ts` detects that an authenticated user (session exists) does not have the required role for a route (e.g., a 'user' trying to access `/admin`), it should redirect them to the custom 403 forbidden page.
        ```typescript
        // Example snippet in middleware.ts
        if (pathname.startsWith('/admin') && session.user?.role !== 'admin') {
          return NextResponse.redirect(new URL('/forbidden', req.url));
        }
        ```
    *   **Auth.js `pages.error`:**
        *   The `authConfig.pages.error` (e.g., `/auth/error`) is typically for authentication-related errors like "InvalidCredentials", "OAuthAccountNotLinked", etc.
        *   While it can catch general "AccessDenied" errors from Auth.js itself (e.g., if a callback explicitly throws an `AccessDenied` error), it's often more granularly controlled via middleware for page-level authorization.
        *   If a specific Auth.js flow results in an "AccessDenied" error type, this page might be shown. The content of this generic error page could be customized to include a message about insufficient permissions if the error code indicates such.

---

## 2. API Error Responses for Unauthorized/Forbidden Access

*   **Purpose:** To provide clear, machine-readable JSON responses from API routes when access to an API resource is denied. This allows client-side applications to react appropriately.

*   **Status Code for Unauthorized (Not Logged In): `401 Unauthorized`**
    *   **When:** The user is not authenticated (no valid session token was provided or the session has expired).
    *   **Response Body:**
        ```json
        {
          "error": "Unauthorized",
          "message": "Authentication required. Please log in to access this resource."
        }
        ```
    *   **Triggering:**
        *   Automatically by Auth.js: If an API route is protected using `auth()` and no session is found, NextAuth.js might automatically handle this, or `auth()` will return `null`.
        *   Manually: API route logic should check if `auth()` returns `null`. If so, and the endpoint requires authentication, this response should be returned.
            ```typescript
            // Example in an API route
            const session = await auth();
            if (!session) {
              return NextResponse.json({ error: "Unauthorized", message: "Authentication required." }, { status: 401 });
            }
            ```

*   **Status Code for Forbidden (Logged In, Insufficient Permissions): `403 Forbidden`**
    *   **When:** The user is authenticated, but their role or permissions do not grant access to the specific API resource or action.
    *   **Response Body:**
        ```json
        {
          "error": "Forbidden",
          "message": "You do not have the necessary permissions to perform this action."
        }
        ```
    *   **Triggering:**
        *   API route logic must explicitly check the authenticated user's role (e.g., using `session.user.role` and helper functions like `isRole` or `hasRole` from `src/lib/rbac.ts`).
        *   If the role check fails, the API route should return this 403 JSON response.
            ```typescript
            // Example in an API route (e.g., POST /api/admin/data)
            const session = await auth();
            if (!session) { /* ... handle 401 ... */ }

            if (session.user?.role !== 'admin') {
              return NextResponse.json({ error: "Forbidden", message: "You do not have the necessary permissions." }, { status: 403 });
            }
            // ... proceed with admin-only logic ...
            ```

*   **Integration with Auth.js Error Handling:**
    *   As mentioned, `authConfig.pages.error` is more for authentication flow errors.
    *   The 403 forbidden responses from APIs are distinct and are part of the API's contract with the client, indicating an authorization failure for an already authenticated user.

---

## 3. Client-Side Handling

*   **Purpose:** To define how client-side code (JavaScript running in the browser) should react to 401 and 403 errors received from API calls or during navigation attempts.

*   **API Calls (e.g., using `fetch` or libraries like `axios`, SWR, React Query):**
    *   **On 401 Unauthorized:**
        *   The client should interpret this as the user's session being invalid or missing.
        *   **Action:** Typically, redirect the user to the login page (e.g., `window.location.href = '/login';` or using Next.js `router.push('/login')`).
        *   Clear any stored session information on the client if applicable.
    *   **On 403 Forbidden:**
        *   The client should interpret this as the user being logged in but lacking permissions for the attempted action/resource.
        *   **Action:**
            *   Display a user-friendly notification (e.g., a toast message: "Access Denied: You don't have permission for this.")
            *   Avoid redirecting to a full "forbidden" page for API calls, as this can be disruptive. A subtle notification is usually better.
            *   Disable or hide the UI element that triggered the forbidden action if possible, to prevent repeated attempts.

*   **Page Navigation (Client-Side Routing):**
    *   While middleware handles server-side rendered (SSR) pages and initial loads, client-side navigation (e.g., using `<Link>` or `router.push`) might attempt to access a route for which the user lacks permissions.
    *   **Primary Defense:** Middleware should ideally catch this on the next server request if the page content is fetched.
    *   **Client-Side Enhancement:**
        *   If `useSession()` data is available, components can proactively hide links to forbidden routes.
        *   If a client-side route change leads to a component that, upon fetching its data, receives a 403, it should render an "access denied" message within its own content area or trigger a less disruptive notification, rather than a full page redirect to `/forbidden` (which is more for direct URL access attempts caught by middleware).
        *   This ensures a smoother experience within a Single Page Application (SPA) feel.

---

By implementing these strategies, the application can provide robust and user-friendly error handling for unauthorized access scenarios, guiding users appropriately and maintaining security.
```