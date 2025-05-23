# Role-Specific UI/Feature Concepts

This document outlines UI and feature concepts tailored for users with "manager" and "user" roles.

---

## 1. Manager Role Features

These features are designed for users with the "manager" role and are typically also accessible to "admin" users.

### a. Manager Dashboard

*   **Route Example:** `/manager/dashboard`
*   **Purpose:** To provide managers with an overview of information and activities relevant to their team and responsibilities.
*   **Potential Components:**
    *   **Summary Statistics:** Cards or charts displaying key metrics (e.g., number of active team members, pending approvals, project completion rates).
    *   **My Team Overview:** A section listing direct reports, possibly with their current status or recent activity highlights.
    *   **Quick Links:** Links to frequently accessed reports or team management sections.
    *   **Notifications/Alerts:** Important items requiring manager attention (e.g., leave requests, overdue tasks from team members).
*   **Data Access:**
    *   Read-only access to aggregated data and specific details of users they directly manage.
    *   *Requires schema update to define manager-user relationships (see "Schema Consideration" below).*
*   **Access Control:** Accessible only to users with "manager" or "admin" roles. Middleware should enforce this.

### b. Team Management View

*   **Route Example:** `/manager/team`
*   **Purpose:** To allow managers to view detailed information about their team members and their activities.
*   **Potential Components:**
    *   **Team Member Table/List:**
        *   Columns: Name, Email, Role (should be 'user' or other non-managerial roles they manage), Last Active, Key Performance Indicator (application-specific).
        *   Each row could link to a read-only view of the team member's profile or activity log relevant to the manager's scope.
    *   **Filters/Search:** Ability to search for specific team members or filter by criteria.
*   **Data Access:**
    *   Read-only access to specific, non-sensitive fields of their direct reports.
    *   *Requires schema update for manager-user relationships.*
*   **Access Control:** "manager" and "admin" roles.

### c. Reports Section

*   **Route Example:** `/manager/reports`
*   **Purpose:** To provide managers with access to specific reports related to their team's performance, project progress, or other relevant metrics.
*   **Potential Components:**
    *   **List of Available Reports:** A categorized list or dashboard of reports the manager is authorized to view.
    *   **Report Filters:** Date range selectors, status filters, or other parameters relevant to the specific report.
    *   **Data Display Area:** Tables, charts, or downloadable files (e.g., CSV) for the generated report.
*   **Data Access:** Data for reports would be filtered based on the manager's scope (i.e., data related to their team members or projects).
*   **Access Control:** "manager" and "admin" roles.

---

## 2. User Role Features

These features are designed for users with the basic "user" role, but are generally also accessible to "manager" and "admin" roles for their own accounts.

### a. User Profile Page

*   **Route Example:** `/profile/me` or `/user/dashboard` or `/account/settings`
*   **Purpose:** To allow users to view and manage their own profile information.
*   **Potential Components:**
    *   **Profile Information Display:** Name, Email, current Role (read-only).
    *   **Editable Fields (if allowed by application policy):**
        *   Name.
        *   Profile Picture/Avatar.
    *   **Password Change Section:**
        *   Fields for "Current Password", "New Password", "Confirm New Password".
        *   This would trigger a specific API endpoint for secure password updates.
    *   **Preferences:** Application-specific preferences (e.g., notification settings, theme).
*   **Data Access:** Read/write access to their own user record for designated fields. Critical fields like `role` or `emailVerified` would not be user-editable here.
*   **Access Control:** Accessible to the currently logged-in user (any role).

### b. Task/Data View (Application-Specific)

*   **Route Example:** `/tasks`, `/my-data`, `/dashboard` (for a basic user)
*   **Purpose:** To provide users with access to the basic functions, tools, and data necessary for their daily work within the application.
*   **Potential Components:** This is highly dependent on the application's core functionality. Examples:
    *   List of assigned tasks with statuses and deadlines.
    *   Interface for submitting their work or data entries.
    *   Viewing their own performance metrics or contributions.
    *   Access to relevant documents or resources.
*   **Data Access:** Strictly limited to their own data or data explicitly shared with them.
*   **Access Control:** Accessible to the logged-in user.

---

## Schema Consideration for Manager Role

To fully implement the manager's ability to view data of users they manage, the database schema (`src/db/schema.ts`) would need to be updated. This could involve one of the following approaches:

1.  **Direct `managerId` in `users` table:**
    *   Add a `managerId` field to the `users` table:
        ```typescript
        // In src/db/schema.ts, within the users table definition
        managerId: text('managerId').references(() => users.id, { onDelete: 'set null' }), // Or 'restrict'
        ```
    *   This field would be nullable and would be a foreign key referencing `users.id`.
    *   This is simpler for direct manager-report relationships.

2.  **Separate `user_manager_mapping` table:**
    *   Create a new table, for example `userManagerMapping`:
        ```typescript
        // In src/db/schema.ts
        export const userManagerMapping = pgTable('user_manager_mapping', {
          userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
          managerId: text('manager_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
          // Potentially add a primary key for the combination
        }, (table) => ({
          pk: primaryKey({ columns: [table.userId, table.managerId] }),
        }));
        ```
    *   This approach is more flexible if a user can have multiple managers or if the relationship has additional properties, though typically a user has one direct line manager.

