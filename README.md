# ESN – Emergency Social Network

Team repo for the **ESN application**, the group project of CMU **18-652 Foundations of Software Engineering** (Fall 2025).
ESN lets citizens of a community register, share their status, chat publicly and privately, post announcements, search information, organise help centers, tasks and help groups, keep emergency profiles, and lets administrators manage user accounts – all in real time.

# IMPORTANT RULES

- YOU ARE _NOT_ PERMITTED TO SHARE THIS REPO OUTSIDE THIS GITHUB ORG.
- YOU ARE _NOT_ PERMITTED TO FORK THIS REPO UNDER ANY CIRCUMSTANCES.
- YOU ARE _NOT_ PERMITTED TO CREATE ANY PUBLIC REPOS INSIDE THE GITHUB ORGANIZATION YOUR REPO RESIDES.
- YOU SHOULD HAVE LINKS FROM THIS README FILE TO YOUR PROJECT DOCUMENTS, SUCH AS YOUR REST API SPECS AND YOUR ARCHITECTURE DOCUMENT.
- YOUR GITHUB ACCOUNT'S PRIMARY EMAIL MUST BE ASSOCIATED WITH YOUR ANDREW EMAIL.
- YOUR GITHUB PROFILE MUST BE PUBLIC AND SHOULD HAVE YOUR FULL NAME AND RECOGNIZABLE HEADSHOT PHOTO.
- MAKE SURE TO CHECK AND UPDATE YOUR LOCAL GIT CONFIGURATION IN ORDER TO MATCH YOUR LOCAL GIT CREDENTIALS TO YOUR GITHUB CREDENTIALS USING IN THIS PROJECT (COMMIT USING YOUR ANDREW EMAIL ASSOCIATED WITH YOUR GITHUB ACCOUNT USED FOR THE COURSE): OTHERWISE YOUR COMMITS MAY BE EXCLUDED FROM GITHUB STATISTICS AND REPO AUDITS WILL UNDERESTIMATE YOUR CONTRIBUTION.
- YOUR MAIN BRANCH WILL BE PROTECTED. YOU WILL NOT BE ALLOWED TO PUSH DIRECTLY TO THIS BRANCH. MERGE INTO MAIN USING A PR. NO FORCE-PUSHES TO MAIN.

## Features

| Feature                   | Pages / entry points                                                       | API                                                         |
| ------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Join community            | `/`, `/communities`, `/confirmations`, `/acknowledgements`                 | `/api/authentications`                                      |
| ESN directory             | `/members` – members with online/offline state and status                  | `/api/users`                                                |
| Share status & skills     | `/status`, `/skills`                                                       | `/api/authentications/statuses`, `/api/users`               |
| Public & private chat     | `/chats`, `/chats/private/:peerId` (live via Socket.IO)                    | `/api/messages`                                             |
| Announcements             | `/postPublicAnnouncements`                                                 | `/api/announcements`                                        |
| Search information        | search bar on every page (citizens, messages, announcements, …)            | `/api/queries`                                              |
| Help centers              | `/help-centers/manage`, `/help-centers/view`, `/help-centers/map` (Mapbox) | `/api/help-centers`, `/api/addresses`                       |
| ESN help center – tasks   | `/esn-help-center`, `/my-tasks`, `/task-creation`, `/task-edit/:id`        | `/api/tasks`, `/api/category-skill-presets`                 |
| Coaching boards           | `/boards`, `/boards/:bid`                                                  | `/api/coaching-boards`                                      |
| Help groups & voice calls | `/groups`, `/groupchats/:groupId` (WebRTC signalling over Socket.IO)       | `/api/groups`, `/api/calls`                                 |
| Emergency profiles        | `/emergency-profile`, `/personal-emergency-profile`                        | `/api/emergency-profiles`, `/api/public/emergency-profiles` |
| Administer user profiles  | `/admin/users`, `/admin/users/:id/edit` (admins only)                      | `/api/admin/profiles`                                       |
| ESN speed test            | `/speed-test` – blocks normal traffic while a test is running              | –                                                           |

The complete, always-current API reference is the Swagger UI served by the app at **`/api-docs`**.

## Tech stack

| Layer     | Choice                                    | Notes                                                                                                               |
| --------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Runtime   | Node.js 22, ES modules                    | Version pinned in `.nvmrc`                                                                                          |
| Server    | Express 5                                 | REST API plus server-rendered pages; central error handler returns HTML or JSON by `Accept` header                  |
| Views     | EJS + Tailwind CSS 3                      | CSS is compiled from `public/css/input.css`; a few pages load Tailwind from its CDN instead, and one uses Alpine.js |
| Real time | Socket.IO 4                               | Presence, chat, notifications and WebRTC signalling for voice calls (`middleware/Socket.js`)                        |
| Database  | MongoDB Atlas via Mongoose 8              | Accessed only through DAOs; in-memory DAOs replace them in tests                                                    |
| Auth      | JWT in an HTTP-only cookie, bcrypt        | `middleware/JWT.js`; account status/role are re-read from the database on every request                             |
| Uploads   | multer                                    | Emergency-profile photos                                                                                            |
| Maps      | Mapbox                                    | Help-center map and address verification (`MAPBOX_TOKEN`)                                                           |
| API docs  | swagger-jsdoc + swagger-ui-express        | Generated from `@openapi` comments in `routes/`                                                                     |
| Tests     | Jest 29, mongodb-memory-server, supertest | Unit tests plus HTTP-level integration tests against an in-memory MongoDB                                           |
| Quality   | ESLint 9, Prettier, ejs-lint, Sigrid      | Enforced by GitHub Actions (see [Continuous integration](#continuous-integration))                                  |

## Documentation

- [Task Management REST API](docs/i4-ziqi/API_DOCUMENTATION.md) – endpoint reference for `/api/tasks`.
- [RESTful URL review](docs/i5-fixes/RESTFUL_VIOLATIONS.md) – audit of endpoint naming against REST conventions and the fixes applied.
- [Sequence charts](docs/Sequence%20Chart/) – e.g. _Join Community_ (iteration 0).
- [Public asset conventions](public/README.md) – naming and size rules for files under `public/`.
- Swagger UI at `/api-docs` – live OpenAPI spec for every route.

## Getting started

Prerequisites: Node.js 22+ (see `.nvmrc`), npm, and a MongoDB connection string (Atlas or local).

```bash
npm ci                 # install exactly what package-lock.json pins
cp .env.example .env   # then fill in MONGO_URI and JWT_SECRET
npm run dev            # server with auto-reload + Tailwind watcher → http://localhost:3000
```

### Environment variables

| Variable                   | Required | Description                                                                                       |
| -------------------------- | -------- | ------------------------------------------------------------------------------------------------- |
| `MONGO_URI`                | yes      | MongoDB connection string. TLS is switched on automatically for `mongodb://` (non-SRV Atlas) URIs |
| `JWT_SECRET`               | yes      | Secret used to sign the auth cookie                                                               |
| `MONGO_TLS`                | no       | `true` / `false` to override the automatic TLS choice (use `false` for a local MongoDB)           |
| `EXPIRATION_TIME`          | no       | Auth cookie lifetime in hours (default `1`)                                                       |
| `PORT`                     | no       | HTTP port (default `3000`)                                                                        |
| `NODE_ENV`                 | no       | `development` / `production` / `test`                                                             |
| `MAPBOX_TOKEN`             | no       | Enables the help-center map and address verification                                              |
| `REQUIRE_AUTH`             | no       | `false` disables auth on API routes (local debugging only)                                        |
| `SPEED_TEST_BLOCK_ENABLED` | no       | `false` keeps the app reachable while a speed test is running                                     |

See `.env.example` for a template. Tests need no `.env`: `tests/setup/env.cjs` supplies a default `JWT_SECRET` and `mongodb-memory-server` provides the database.

### Scripts

| Command              | What it does                                           |
| -------------------- | ------------------------------------------------------ |
| `npm run dev`        | Start the server with reload and rebuild CSS on change |
| `npm start`          | Build CSS, then start the server                       |
| `npm test`           | Run the Jest suite (in-memory MongoDB) with coverage   |
| `npm run test:watch` | Re-run tests on change                                 |
| `npm run lint`       | ESLint over the whole repo                             |
| `npm run lint:ejs`   | Syntax-check every EJS template                        |
| `npm run check`      | `lint` + `lint:ejs` + `test` – the same gate CI runs   |
| `npm run format`     | Format with Prettier (`format:check` only reports)     |
| `npm run build`      | Compile and minify Tailwind CSS                        |

Helper scripts for a real database live in `scripts/` (create the first admin, clean up test users, …) and are run with `node scripts/<name>.js`.

## Project layout

```
server.js              entry point: connects to MongoDB, wires DAOs, starts HTTP + Socket.IO
app.js                 Express app: middleware, view engine, routes, error handling
config/daoRegistry.js  builds the Mongoose models and injects the Mongo DAOs into the DACs
routes/                one router per resource (+ @openapi docs); routes/index.js mounts them all
controllers/           request handlers: validation, status codes, responses
entities/              domain objects; reach the data layer only through a DAC
dacs/                  Data Access Classes: static injection points (Mongo in prod, in-memory in tests)
daos/                  DAO implementations (MongoDB and in-memory) behind the i*Dao interfaces
db/                    Mongoose schemas / model factories
services/, utils/      reusable logic (search strategies, task helpers, validators)
middleware/            JWT auth, Socket.IO, speed-test blocker
views/ejs/, public/    server-rendered pages, client-side JS and static assets
tests/                 Jest unit + integration tests
docs/                  API documentation, REST review, sequence charts
```

Layering rule (also checked by Sigrid): `routes → controllers → entities → dacs → daos → db`.
A module should not reach past its neighbour – for example controllers never import from `db/` or call Mongoose documents directly.

## Testing

```bash
npm test                                   # everything, with coverage in ./coverage
npx jest tests/privateChat.test.js         # one file (needs NODE_OPTIONS=--experimental-vm-modules)
```

Integration tests start the Express app on a fixed port per file and inject in-memory DAOs into the DACs, so they run without any external service. Coverage is collected from every server-side folder listed in `jest.config.cjs`.

## Continuous integration

GitHub Actions (`.github/workflows/ci.yml`) runs on every push to the default branch and on every pull request:

1. **Lint** – `npm run lint` (ESLint) and `npm run lint:ejs` (EJS templates).
2. **Build & Test** – Tailwind build, then `npm test` with coverage. The HTML coverage report is
   uploaded as the `coverage-html` artifact and the totals are written to the run summary.

The Sigrid workflows (`sigrid-pullrequest.yml`, `sigrid-publish.yml`) run the SIG maintainability
analysis only when the `SIGRID_CI_TOKEN` secret is configured; otherwise they skip without failing.

## Code quality rules

Every pull request uses the checklist in `.github/pull_request_template.md`:

- small PRs (≈300 net lines), dead code removed, no copy-paste blocks of 6+ lines
- functions ≤ 15 lines, cyclomatic complexity ≤ 10, nesting ≤ 3, ≤ 5 parameters
- ≤ 10 imports per module (use the `db/`, `daos/`, `dacs/` barrels), no import cycles, no layer bypass
