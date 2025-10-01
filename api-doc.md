## REST API Documentation

Base URL: `/api`

### Auth Routes (`/api/auth`)

- `POST /api/auth/registrations`
  - Description: Register a new user.
  - Auth: Not required
  - Request Body (JSON):
    - `username`: string
    - `password`: string
  - Responses:
    - 201 Created: `{ "message": "User successfully registered", "username": "<username>" }`
    - 400 Bad Request: `{ "error": "Invalid username" }` or `{ "error": "Invalid password" }`
    - 500 Server Error: `{ "status": "error", "message": "Server error" }`
  - Side effects: Sets `jwt_token` HTTP-only cookie with expiration configured by `EXPIRATION_TIME` env var.

- `POST /api/auth/login`
  - Description: Log in a user.
  - Auth: Not required
  - Request Body (JSON):
    - `username`: string
    - `password`: string
  - Responses:
    - 200 OK: `{ "username": "<username>", "ok": true }` and sets `jwt_token` cookie
    - 401 Unauthorized: `{ "error": "Invalid password" }`
    - 404 Not Found: `{ "error": "User not found" }`
    - 500 Server Error: `{ "status": "error", "message": "Server error" }`

- `POST /api/auth/users/usernames`
  - Description: Check username reservation/availability status.
  - Auth: Not required
  - Request Body (JSON):
    - `username`: string
  - Responses:
    - 200 OK:
      - `{ "status": "reserved", "reason": "banned_username", "message": "This username is not allowed." }` when username is invalid per validation rules
      - `{ "status": "exists" }` when a user already exists with the provided username
      - `{ "status": "available" }` when the username is available
    - 500 Server Error: `{ "status": "error", "message": "Server error" }`

- `GET /api/auth/accounts`
  - Description: Get the authenticated user's profile.
  - Auth: Required (JWT cookie `jwt_token`)
  - Request: No body. Requires valid `jwt_token` cookie.
  - Responses:
    - 200 OK: `{ "username": string, "status": string | "undefined", "role": string, "image": string }`
    - 401 Unauthorized: `{ "error": "Unauthorized" }` when no/invalid token
    - 403 Forbidden: `{ "error": "Forbidden", "reason": "<jwt_error_name>" }` when token verification fails
    - 404 Not Found: `{ "error": "User not found" }`
    - 500 Server Error: `{ "status": "error", "message": "Server error" }`

- `POST /api/auth/logout`
  - Description: Log out the current user (clears auth cookie).
  - Auth: Required (JWT cookie `jwt_token`)
  - Request: No body. Requires valid `jwt_token` cookie.
  - Responses:
    - 200 OK: `{ "ok": true }` and clears `jwt_token` cookie
    - 401 Unauthorized: `{ "error": "Unauthorized" }` when no token
    - 403 Forbidden: `{ "error": "Forbidden", "reason": "<jwt_error_name>" }` when token verification fails
    - 500 Server Error: `{ "status": "error", "message": "Server error" }`

### View Routes (Server-rendered Pages)
These are not JSON APIs but are included for completeness. They render EJS templates.

- `GET /` → renders `views/splashPage.ejs`
- `GET /communities` → renders `views/joinCommunity.ejs`
- `GET /confirmations` → renders `views/confirmRegistration.ejs`
- `GET /acknowledgements` → renders `views/acknowledgement.ejs`
- `GET /profiles` → renders `views/profile.ejs`

### Authentication Details
- JWT is stored in an HTTP-only cookie named `jwt_token`.
- Cookie attributes: `httpOnly: true`, `secure: (NODE_ENV === 'production')`, `sameSite: 'lax'`, `path: '/'`, `maxAge` based on `EXPIRATION_TIME` hours.
- Protected routes use middleware that:
  - Reads `jwt_token` from cookies.
  - Returns 401 if missing.
  - Verifies token; sets `req.username` to the username from payload.
  - Returns 403 with `{ error: 'Forbidden', reason: <jwt_error_name> }` if verification fails.

### Environment Variables
- `MONGO_URI`: MongoDB connection string (required)
- `JWT_SECRET`: Secret used for token signing/verification (required)
- `EXPIRATION_TIME`: Token expiration in hours (required)
- `NODE_ENV`: `production` or other; affects cookie `secure` flag
