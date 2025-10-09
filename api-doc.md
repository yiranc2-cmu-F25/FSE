## REST API Documentation

Base URL: `/api`

### Auth Routes (`/api/authentications`)

- `POST /api/authentications/registrations`
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

- `POST /api/authentications/login`
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

- `POST /api/authentications/users/usernames`
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

- `GET /api/authentications/accounts`
  - Description: Get the authenticated user's profile.
  - Auth: Required (JWT cookie `jwt_token`)
  - Request: No body. Requires valid `jwt_token` cookie.
  - Responses:
    - 200 OK: `{ "username": string, "status": string | "undefined", "role": string, "image": string }`
    - 401 Unauthorized: `{ "error": "Unauthorized" }` when no/invalid token
    - 403 Forbidden: `{ "error": "Forbidden", "reason": "<jwt_error_name>" }` when token verification fails
    - 404 Not Found: `{ "error": "User not found" }`
    - 500 Server Error: `{ "status": "error", "message": "Server error" }`

- `POST /api/authentications/logout`
  - Description: Log out the current user (clears auth cookie).
  - Auth: Required (JWT cookie `jwt_token`)
  - Request: No body. Requires valid `jwt_token` cookie.
  - Responses:
    - 200 OK: `{ "ok": true }` and clears `jwt_token` cookie
    - 401 Unauthorized: `{ "error": "Unauthorized" }` when no token
    - 403 Forbidden: `{ "error": "Forbidden", "reason": "<jwt_error_name>" }` when token verification fails
    - 500 Server Error: `{ "status": "error", "message": "Server error" }`

- `GET /api/authentications/lists`
  - Description: Get list of community members.
  - Auth: Required (JWT cookie `jwt_token`)
  - Request: No body. Requires valid `jwt_token` cookie.
  - Responses:
    - 200 OK: Array of member objects
    - 401 Unauthorized: `{ "error": "Unauthorized" }` when no/invalid token
    - 403 Forbidden: `{ "error": "Forbidden", "reason": "<jwt_error_name>" }` when token verification fails
    - 500 Server Error: `{ "status": "error", "message": "Server error" }`

### Message Routes (`/api/messages`)

- `GET /api/messages/public`
  - Description: Get public chat messages.
  - Auth: Required (JWT cookie `jwt_token`)
  - Request: No body. Requires valid `jwt_token` cookie.
  - Responses:
    - 200 OK: Array of message objects
    - 401 Unauthorized: `{ "error": "Unauthorized" }` when no/invalid token
    - 403 Forbidden: `{ "error": "Forbidden", "reason": "<jwt_error_name>" }` when token verification fails
    - 500 Server Error: `{ "status": "error", "message": "Server error" }`

- `POST /api/messages/public`
  - Description: Send a public chat message.
  - Auth: Required (JWT cookie `jwt_token`)
  - Request Body (JSON):
    - Message content and metadata
  - Responses:
    - 201 Created: Message sent successfully
    - 401 Unauthorized: `{ "error": "Unauthorized" }` when no/invalid token
    - 403 Forbidden: `{ "error": "Forbidden", "reason": "<jwt_error_name>" }` when token verification fails
    - 500 Server Error: `{ "status": "error", "message": "Server error" }`
- - `GET /api/messages/private`
  - Description: Get private chat messages between two ESN users.
  - Auth: Required (JWT cookie `jwt_token`)
  - Request: No body. Requires valid `jwt_token` cookie.
  - Responses:
    - 200 OK: Array of message objects
    - 401 Unauthorized: `{ "error": "Unauthorized" }` when no/invalid token
    - 403 Forbidden: `{ "error": "Forbidden", "reason": "<jwt_error_name>" }` when token verification fails
    - 500 Server Error: `{ "status": "error", "message": "Server error" }`

- `POST /api/messages/private`
  - Description: Send a pribate chat message to the channel between two ESN users.
  - Auth: Required (JWT cookie `jwt_token`)
  - Request Body (JSON):
    - Message content and metadata
  - Responses:
    - 201 Created: Message sent successfully
    - 401 Unauthorized: `{ "error": "Unauthorized" }` when no/invalid token
    - 403 Forbidden: `{ "error": "Forbidden", "reason": "<jwt_error_name>" }` when token verification fails
    - 500 Server Error: `{ "status": "error", "message": "Server error" }`

### ESN Speed Test Routes (`/api/tools/speed-tests`)

- `POST /api/tools/speed-tests/public`

- Description: Synthetic “post to public wall” for load testing. Does not write to DB.

- Auth: Required (JWT cookie jwt_token)

- Request Body (JSON):
  - payload: object | string | number | boolean (optional, echoed back; ignored by server logic)

- Responses:
  - 201 Created: { "ok": true, "ts": "<iso8601>" }

  - 401 Unauthorized: { "error": "Unauthorized" }

  - 403 Forbidden: { "error": "Forbidden", "reason": "<jwt_error_name>" }

  - 500 Server Error: { "status": "error", "message": "Server error" }

- Side effects: None (data stored in memory-only ring buffer for a few seconds, or discarded).

- GET /api/tools/speed-tests/public

- Description: Synthetic “get public wall messages” for load testing. Served from memory, not DB.

- Auth: Required (JWT cookie jwt_token)

- Request: No body.

- Responses:
  - 200 OK: Array (possibly empty) of synthetic message envelopes
    Example: [ { "id": "<uuid>", "ts": "<iso8601>" } ]

  - 401 Unauthorized: { "error": "Unauthorized" }

  - 403 Forbidden: { "error": "Forbidden", "reason": "<jwt_error_name>" }

  - 500 Server Error: { "status": "error", "message": "Server error" }

- Side effects: None (data is ephemeral).

- `PATCH /api/authentications/accounts/status`
  - Description: Set or clear the authenticated user's current status.

  - Auth: Required (JWT cookie `jwt_token`)

  - Request Body (JSON):
    - `status`: `"OK" | "HELP" | "EMERGENCY" | "UNDEFINED"`

  - Responses:
    - 200 OK: `{ "username": "<username>", "status": "<status>", "updatedAt": "<iso8601>" }`

    - 400 Bad Request: `{ "error": "Invalid status" }`

    - 401 Unauthorized: `{ "error": "Unauthorized" }`

    - 403 Forbidden: `{ "error": "Forbidden", "reason": "<jwt_error_name>" }`

    - 500 Server Error: `{ "status": "error", "message": "Server error" }`

  - Side effects: Persists status + server timestamp; can optionally emit a socket event so directories/chat UIs refresh.
    - `GET /api/authentications/statuses`

  - Description: Return the allowed statuses and their UI hints (for the status picker).

  - Auth: Not required (pure metadata; can be cached)

  - Request: No body.

  - Responses:
    - 200 OK:

      `[
  { "code": "OK",        "label": "I am OK: I do not need help.",            "color": "green",  "icon": "ok" },
  { "code": "HELP",      "label": "I need help (not life-threatening).",     "color": "yellow", "icon": "help" },
  { "code": "EMERGENCY", "label": "I need help now (emergency).",            "color": "red",    "icon": "emergency" },
  { "code": "UNDEFINED", "label": "No status provided.",                     "color": "gray",   "icon": "undefined" }
]`

    - 500 Server Error: `{ "status": "error", "message": "Server error" }`

### View Routes (Server-rendered Pages)

These are not JSON APIs but are included for completeness. They render EJS templates.

- `GET /` → renders `views/splashPage.ejs`
- `GET /communities` → renders `views/joinCommunity.ejs`
- `GET /confirmations` → renders `views/confirmRegistration.ejs`
- `GET /acknowledgements` → renders `views/acknowledgement.ejs`
- `GET /chats` → renders `views/publicChat.ejs` (Auth required)
- `GET /members` → renders `views/membersLanding.ejs` (Auth required)
- `GET /profiles` → renders `views/memberFunction.ejs` (Auth required)
- `GET /status` → renders `views/profileUpdate.ejs` (Auth required)

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
