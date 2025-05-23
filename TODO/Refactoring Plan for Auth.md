# Revised Refactoring Plan: Extract Authentication Setup as a Template

## Goal
Create a well-organized, modular authentication system within your existing project that can be easily copied and adapted for future client projects.

## Rules
1. **kebab-case**: Filenames has to be in kebab-case.
1. **snake_case**: Functions has to be in snake_case.

# Current Tech Stack
- Framework: Next.js 15.3.2 with App Router
- React: React 19.0.0
- Authentication: NextAuth.js 4.24.11
- Database:
    - Development: SQLite with Better-SQLite3 11.10.0
    - Production: TursoDB with LibSQL Client 0.15.7
- ORM: Drizzle ORM 0.43.1 with Drizzle Kit 0.31.1
- Form Handling: React Hook Form 7.56.4 with Zod 3.25.17 validation
- UI Components: Custom components with Radix UI primitives + Shadcn/ui
- Styling: Tailwind CSS 4.x + Shadcn/ui
- TypeScript: TypeScript 5.8.3

## Refactoring Plan

### 1. Create a Dedicated Auth Module Structure

Create a more organized structure for auth-related code within your project:

```
/src
  /auth
    /components
      session-auth-provider.tsx
      login-form.tsx
      register-form.tsx
      password-reset-form.tsx
    /lib
      auth-options.ts
      rbac.ts
    /api
      auth/[...nextauth]/route.ts (Catch all nextauth routes)
      register.ts (is this nessasary)
    /db
      schema.ts (export von src/db/schema/sqlite/index.sql.ts)
    /types
      index.ts
    /middleware
      auth-middleware.ts
    /hooks
      use-auth.ts
    /utils
      password-utils.ts
    index.ts
```

### 2. Refactor Authentication Components and Logic

#### 2.1. Consolidate Core Authentication Logic

- Move all NextAuth options configuration to `/src/auth/lib/auth-options.ts`
- Make it more modular with clear separation of concerns
- Extract RBAC utilities to `/src/auth/lib/rbac.ts`

#### 2.2. Refactor UI Components

- Create reusable login and registration form components in `/src/auth/components/`
- Ensure they're well-documented and easily customizable
- Move the AuthProvider to `/src/auth/components/AuthProvider.tsx`

#### 2.3. Organize API Routes

- Organize auth-related API routes in a consistent structure
- Create clear documentation for how these routes work

#### 2.4. Document Database Schema

- Document the authentication database schema clearly
- Create migration utilities if needed

#### 2.5. Improve Middleware

- Enhance the middleware for better route protection
- Document how to configure it for different projects

### 3. Create Documentation

Create comprehensive documentation that explains:
- How the authentication system works
- How to customize it for different projects
- Best practices for security and user management

### 4. Create a Template Guide

Create a guide that explains how to:
- Copy the authentication system to a new project
- Configure it for different database types
- Customize the UI components
- Set up role-based access control

## Files to Modify

1. **Move and refactor existing files:**
   - `src/lib/auth/next-auth-options.ts` → `src/auth/lib/auth-options.ts`
   - `src/lib/auth/rbac.ts` → `src/auth/lib/rbac.ts`
   - `src/providers/session-provider.tsx` → `src/auth/components/session-auth-provider.tsx`
   - Extract login form logic from `src/app/(auth)/login/page.tsx` → `src/auth/components/LoginForm.tsx` ( add a page as example commented out )
   - Extract register form logic from `src/app/(auth)/register/page.tsx` → `src/auth/components/RegisterForm.tsx` ( add a page as example commented out )
   - Refactor `src/app/api/auth/register/route.ts` → `src/app/api/auth/register/route.ts` ( is this refactoring necessary? )
   - Document schema in `src/db/schema/sqlite/users.sql.ts` → `src/auth/db/schema.ts` (export von src/db/schema/sqlite/index.sql.ts)
   - Enhance `src/middleware.ts` → `src/auth/middleware/auth-middleware.ts` ( dont move the file create new will that can be imported in middleware.ts)

2. **Create new files:**
   - `src/auth/index.ts` - Main export file for the auth module
   - `src/auth/hooks/useAuth.ts` - Custom hook for auth-related functionality
   - `src/auth/utils/password-utils.ts` - Utilities for password handling
   - `src/auth/README.md` - Documentation for the auth module
   - `src/auth/types/index.ts` - Type definitions for the auth module

3. **Update existing files to use the new structure:**
   - Update imports in all files that use auth-related functionality
   - Update API routes to use the new structure
   - Update pages to use the new components

## Implementation Steps

1. Create the new directory structure
2. Move and refactor existing files
3. Create new utility files and hooks
4. Update imports in existing files
5. Test the refactored authentication system
6. Create documentation

## Benefits of This Approach

1. **Modularity**: Clear separation of auth-related code
2. **Reusability**: Easy to copy to new projects
3. **Maintainability**: Well-organized code structure
4. **Flexibility**: Easy to customize for different projects
5. **Documentation**: Clear guidance for future use

## Detailed Implementation Phases

### Phase 1: Definition and Creation of Module Structure
**Task**: Create a dedicated and isolated directory structure for the Auth module.
**Description**: Implement the defined folder and file structure within /src/auth.
```
/src
  /auth
  /components
    session-auth-provider.tsx
    login-form.tsx
    register-form.tsx
    password-reset-form.tsx
  /lib
    auth-options.ts  // Core configuration for NextAuth.js
    rbac.ts          // Logic for Role-Based Access Control
  /api               // Contains logic or templates for custom API routes
    register.ts      // Logic/template for an optional dedicated registration endpoint
             // The [...nextauth]/route.ts logic will primarily be in auth-options.ts
             // and implemented as a handler in the Next.js /app/api/auth directory.
  /db
    schema.ts        // Exports auth-relevant Drizzle schemas from src/db/schema/
  /types
    index.ts         // Auth-specific TypeScript types
  /middleware
    auth-middleware.ts // Logic for route protection, imported into src/middleware.ts
  /hooks
    use-auth.ts      // Custom hook for accessing auth state and functions
  /utils
    password-utils.ts// Helper functions for passwords (hashing, validation)
  index.ts           // Main export file for the module for easy access
  README.md          // Documentation for the Auth module
```
**Goal**: A fully set up directory structure for /src/auth is created, containing all planned subdirectories and initial (empty or basic) files according to the plan.
**Success Criterion**: The directory structure exactly matches the definition and has been committed to the repository.

### Phase 2: Redesign of Core Logic, Components, and Interfaces

#### 2.1 Consolidation of Authentication Core Logic
**Task**: Centralize and modularize the NextAuth.js configuration and RBAC logic.
**Description**:
- Transfer all NextAuth.js option configurations to /src/auth/lib/auth-options.ts. Ensure modularity for providers, callbacks, page configurations, and database adapter configurations (DrizzleORM) for SQLite and TursoDB.
- Extract and consolidate all RBAC-related logic to /src/auth/lib/rbac.ts.
**Goal**: auth-options.ts contains complete, customizable NextAuth.js configuration. rbac.ts encapsulates all RBAC logic.
**Success Criterion**: Authentication via NextAuth.js works flawlessly with the new configuration file. RBAC functions are usable and tested through rbac.ts. The configuration demonstrably supports connections to SQLite (development) and TursoDB (production).

#### 2.2 Revision of UI Components
**Task**: Create reusable, customizable, and clearly documented authentication UI components.
**Description**:
- Develop login-form.tsx, register-form.tsx, and password-reset-form.tsx in /src/auth/components/ using React Hook Form, Zod, and Shadcn/UI primitives.
- Ensure components are customizable through props and clearly defined interfaces.
- Transfer the SessionProvider to /src/auth/components/session-auth-provider.tsx.
- Create commented example implementations on the corresponding pages (e.g., src/app/(auth)/login/page.tsx) that demonstrate the use of the new components.
**Goal**: A set of 3-4 fully functional and styled authentication UI components is available and demonstrated in example pages.
**Success Criterion**: The components render correctly, form validation works, and authentication actions (login, registration) can be successfully triggered through the components. session-auth-provider.tsx correctly provides the session state.

#### 2.3 Organization and Implementation of API Route Logic
**Task**: Structure, document, and implement logic for authentication API endpoints.
**Description**:
- The main API route for NextAuth.js (/app/api/auth/[...nextauth]/route.ts) is adapted to import and use the configuration from /src/auth/lib/auth-options.ts.
- The logic for an optional, custom registration route is implemented in /src/auth/api/register.ts as exportable function(s). A corresponding route handler in /app/api/auth/register/route.ts (if needed) imports this logic.
**Goal**: The NextAuth.js endpoints (signIn, signOut, session, etc.) are fully functional. The optional custom registration logic is encapsulated and ready for use.
**Success Criterion**: All NextAuth.js API routes work as expected. The custom registration route (if implemented) correctly processes requests and interacts with the database and auth-options.ts as intended.

#### 2.4 Definition and Documentation of the Database Schema for Authentication
**Task**: Clearly define, document, and provide the database schema relevant for authentication.
**Description**:
- /src/auth/db/schema.ts exports the Drizzle ORM schema definitions necessary for authentication (users, accounts, sessions, verification tokens, etc.) from the central schema directory (src/db/schema/).
- Document the structure of these tables and their relationships in /src/auth/README.md.
- Create or document the process for Drizzle Kit migrations necessary for the Auth schema.
**Goal**: A clearly defined and documented database schema for authentication is available and can be used for migrations.
**Success Criterion**: /src/auth/db/schema.ts exports all required schemas. Migrations for these schemas can be successfully generated and applied to a test database (SQLite).

#### 2.5 Development and Integration of Middleware Logic
**Task**: Create robust and configurable middleware logic for client and server-side route protection.
**Description**:
- Implement reusable logic for route protection in /src/auth/middleware/auth-middleware.ts. This function should accept configuration options for public/protected routes and redirection behavior.
- The root middleware file (/src/middleware.ts) imports and uses this logic.
**Goal**: A configurable middleware function effectively protects routes based on authentication status.
**Success Criterion**: Protected routes are only accessible to authenticated users, unauthenticated users are correctly redirected. Public routes remain accessible. Middleware configuration is documented in README.md.

#### 2.6 Creation of Helper Functions and Hooks
**Task**: Develop useful tools to simplify authentication interaction.
**Description**:
- Create the custom hook use-auth.ts in /src/auth/hooks/ for easy access to session information and authentication functions on the client side.
- Implement password-related helper functions (e.g., for hashing logic, if needed server-side and not covered by NextAuth) in /src/auth/utils/password-utils.ts.
**Goal**: Provide a use-auth hook and necessary password utilities.
**Success Criterion**: The use-auth hook correctly delivers authentication status and enables actions like login/logout. The password utilities fulfill their specified functions (if applicable).

### Phase 3: Creating Documentation and Template Guide
**Task**: Develop comprehensive documentation and a guide for using the Auth module as a template.
**Description**:
- Module documentation (/src/auth/README.md): Write a detailed description of the architecture, API of exported elements, customization points (incl. configuration of auth-options.ts for different DBs and OAuth providers), security aspects, styling of components, and examples for different use cases.
- Template guide (separate section in the project README or separate file): Create a step-by-step guide for copying and integrating the /src/auth module into a new project, including environment variable configuration, database migrations (SQLite/TursoDB), and RBAC setup.
**Goal**: Complete documentation that enables another developer to understand, use, and integrate the Auth module into new projects.
**Success Criterion**: The README.md is complete and covers all specified points. A developer not involved in the refactoring can successfully integrate the module into a test project by exclusively using the template guide.

## 5. Detailed Task List: File Operations and Modifications

### 5.1 Files to Move/Refactor:
- src/lib/auth/next-auth-options.ts → /src/auth/lib/auth-options.ts
- src/lib/auth/rbac.ts → /src/auth/lib/rbac.ts
- src/providers/session-provider.tsx → /src/auth/components/session-auth-provider.tsx
- Logic from src/app/(auth)/login/page.tsx → /src/auth/components/login-form.tsx (with example usage in original file)
- Logic from src/app/(auth)/register/page.tsx → /src/auth/components/register-form.tsx (with example usage in original file)
- Auth-relevant schema definitions from src/db/schema/sqlite/users.sql.ts (and possibly other files) → Re-export/reference in /src/auth/db/schema.ts

### 5.2 New Files to Create:
- /src/auth/index.ts (main export file)
- /src/auth/api/register.ts (logic/template for custom registration)
- /src/auth/hooks/use-auth.ts (auth hook)
- /src/auth/utils/password-utils.ts (password utilities)
- /src/auth/middleware/auth-middleware.ts (middleware logic)
- /src/auth/README.md (module documentation)
- /src/auth/types/index.ts (type definitions)

### 5.3 Files to Update:
- All project files that use authentication functionality to use new import paths and components.
- src/app/api/auth/[...nextauth]/route.ts to use the new auth-options.ts.
- src/middleware.ts to use the logic from /src/auth/middleware/auth-middleware.ts.
- Login, registration, and possibly password reset pages (page.tsx) to use the new UI components.

## 6. Implementation Plan (Task Sequence)

1. **Create structure (Phase 1)**: Create the complete directory structure and empty files for /src/auth.
   - **Goal**: Directory structure present in repository.

2. **Refactor core logic (Phase 2.1)**: Move and revise auth-options.ts and rbac.ts. Implement DB adapter logic.
   - **Goal**: Basic authentication (login/logout) works with the new structure.

3. **Define database schema (Phase 2.4)**: Create src/auth/db/schema.ts and document schema migration.
   - **Goal**: Auth schema is defined and migration process is clear.

4. **Create UI components (Phase 2.2)**: Develop session-auth-provider.tsx, login-form.tsx, register-form.tsx, password-reset-form.tsx.
   - **Goal**: Components are functional and integrated in example pages.

5. **Create helper functions and hooks (Phase 2.6)**: Implement use-auth.ts and password-utils.ts.
   - **Goal**: Hook and utilities are ready for use.

6. **Adapt/create API route logic (Phase 2.3)**: Update [...nextauth]/route.ts, create logic in /src/auth/api/register.ts.
   - **Goal**: All auth API endpoints are functional.

7. **Develop middleware (Phase 2.5)**: Create /src/auth/middleware/auth-middleware.ts and integrate it into src/middleware.ts.
   - **Goal**: Route protection is implemented and configurable.

8. **Project-wide integration (Completing Phase 2)**: Update all remaining imports and usages in the project.
   - **Goal**: No outdated auth imports or logic in the project outside of /src/auth.

9. **Create documentation (Phase 3)**: Write the /src/auth/README.md and template guide.
   - **Goal**: Documentation is complete and verified.

10. **Conduct tests and fix bugs**: Comprehensive functional tests of all aspects of the Auth module.
  - **Goal**: All defined authentication functions work flawlessly; at least 90% of test cases successful.
