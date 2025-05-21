# User Management API Routes

This document outlines the API endpoints for managing users. All endpoints require the authenticated user to have the "admin" role.

---

## Common Error Responses

*   `401 Unauthorized`: Authentication token is missing or invalid.
*   `403 Forbidden`: Authenticated user does not have the "admin" role.
*   `500 Internal Server Error`: An unexpected error occurred on the server.

---

### 1. Create User

*   **Endpoint:** `POST /api/users`
*   **Description:** Creates a new user in the system.
*   **Authorization:** Admin
*   **Request Body:**
    ```json
    {
      "name": "string",
      "email": "string (valid email format, unique)",
      "password": "string (min length 8 recommended)",
      "role": "string ('admin', 'manager', 'user')"
    }
    ```
*   **Response (Success - 201 Created):**
    ```json
    {
      "id": "string (cuid2)",
      "name": "string",
      "email": "string",
      "role": "string",
      "emailVerified": "timestamp | null",
      "image": "string | null",
      "createdAt": "timestamp",
      "updatedAt": "timestamp"
    }
    ```
    *(Note: `passwordHash` is not returned)*
*   **Response (Error):**
    *   `400 Bad Request`: Invalid input data (e.g., missing fields, invalid email format, role not allowed).
    *   `409 Conflict`: Email already exists.

---

### 2. Read All Users

*   **Endpoint:** `GET /api/users`
*   **Description:** Retrieves a list of all users. Supports pagination and filtering (details TBD).
*   **Authorization:** Admin
*   **Query Parameters (Optional):**
    *   `page`: number (for pagination)
    *   `limit`: number (items per page)
    *   `sortBy`: string (field to sort by, e.g., "email", "createdAt")
    *   `sortOrder`: string ("asc", "desc")
    *   `filter[email]`: string (filter by email containing value)
    *   `filter[name]`: string (filter by name containing value)
    *   `filter[role]`: string ('admin', 'manager', 'user')
*   **Response (Success - 200 OK):**
    ```json
    {
      "data": [
        {
          "id": "string",
          "name": "string",
          "email": "string",
          "role": "string",
          "emailVerified": "timestamp | null",
          "image": "string | null",
          "createdAt": "timestamp",
          "updatedAt": "timestamp"
        }
      ],
      "pagination": {
        "totalItems": "number",
        "totalPages": "number",
        "currentPage": "number",
        "pageSize": "number"
      }
    }
    ```
*   **Response (Error):**
    *   `400 Bad Request`: Invalid query parameters.

---

### 3. Read One User

*   **Endpoint:** `GET /api/users/{id}`
*   **Description:** Retrieves a single user by their ID.
*   **Authorization:** Admin
*   **Path Parameters:**
    *   `id`: string (User's ID)
*   **Response (Success - 200 OK):**
    ```json
    {
      "id": "string",
      "name": "string",
      "email": "string",
      "role": "string",
      "emailVerified": "timestamp | null",
      "image": "string | null",
      "createdAt": "timestamp",
      "updatedAt": "timestamp"
    }
    ```
*   **Response (Error):**
    *   `404 Not Found`: User with the specified ID does not exist.

---

### 4. Update User

*   **Endpoint:** `PUT /api/users/{id}` or `PATCH /api/users/{id}`
    *(Using PUT for simplicity, requiring all modifiable fields. PATCH could be used for partial updates.)*
*   **Description:** Updates an existing user's information.
*   **Authorization:** Admin
*   **Path Parameters:**
    *   `id`: string (User's ID)
*   **Request Body:**
    *(Fields are optional for update, but at least one should be present)*
    ```json
    {
      "name": "string (optional)",
      "email": "string (optional, valid email format, unique if changed)",
      "password": "string (optional, new password, min length 8 recommended if changing)",
      "role": "string ('admin', 'manager', 'user', optional)"
    }
    ```
*   **Response (Success - 200 OK):**
    ```json
    {
      "id": "string",
      "name": "string",
      "email": "string",
      "role": "string",
      "emailVerified": "timestamp | null",
      "image": "string | null",
      "createdAt": "timestamp",
      "updatedAt": "timestamp"
    }
    ```
*   **Response (Error):**
    *   `400 Bad Request`: Invalid input data.
    *   `404 Not Found`: User with the specified ID does not exist.
    *   `409 Conflict`: Email already exists (if changed to an existing one).

---

### 5. Delete User

*   **Endpoint:** `DELETE /api/users/{id}`
*   **Description:** Deletes a user from the system.
*   **Authorization:** Admin
*   **Path Parameters:**
    *   `id`: string (User's ID)
*   **Response (Success - 204 No Content):**
    *   (No response body)
*   **Response (Error):**
    *   `400 Bad Request`: Cannot delete currently authenticated admin user (self-deletion).
    *   `404 Not Found`: User with the specified ID does not exist.
---