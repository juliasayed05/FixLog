# FixLog — Engineering Journal & Bug Intelligence

FixLog is a full-stack engineering workspace for capturing bugs, documenting root causes and fixes, tracking debugging effort, and sharing lessons across a developer team. It combines a searchable bug journal, a drag-and-drop Kanban board, operational analytics, Markdown/code documentation, comments, audit activity, and workspace member visibility.

## What is included

### Workspace UI
- Light and dark themes, persisted in `localStorage`.
- Collapsible navigation, responsive layout, account menu, and a full profile editor with device photo upload.
- Global command palette (`Ctrl/Cmd + K`) with live bug search and quick navigation.
- Keyboard shortcuts: `N` opens a new bug, `/` opens search, `Esc` closes dialogs.
- Toast feedback for create, update, delete, status changes, and comments.

### Bug journal
- Table view with text search, status/severity/tag filters, sorting, and pagination.
- Kanban view with draggable cards and quick status changes.
- Structured issue description, root-cause analysis, Markdown fix notes, technology tags, time spent, and Git commit reference.
- Syntax-highlighted code blocks and one-click copy controls.
- Per-issue comments and an audit timeline.
- JSON, CSV, and Markdown exports.

### Insights and collaboration
- KPI summary, issue volume, top technology tags, severity distribution, and status breakdown.
- Find developers, send or cancel connection requests, accept/decline incoming requests, and remove existing connections. Shared issue visibility begins only after acceptance.
- Role-aware update/delete permissions (`Developer`, `Lead`, `Admin`).

### Administrator control center
- Dedicated Admin-only route and navigation item.
- Searchable account directory with role and active/suspended filters.
- Promote or demote Developers, Leads, and Admins.
- Suspend accounts with a reason and restore access later.
- Permanently delete accounts, including their owned issue records, while preserving audit history.
- Search all issues, change workflow status, and delete issue records.
- Workspace account/issue metrics and a searchable-by-recency audit history.
- Safety guards prevent self-lockout and protect the last active administrator.

### Visual system
- A distinct engineering-console identity: deep graphite and blue-black surfaces, signal-cyan accents, amber severity cues, a subtle technical grid, compact issue tables, mono metadata, and a cool slate light theme. The login screen has a developer-workbench treatment. Both light and dark themes remain supported.

## Technology

| Layer | Stack |
|---|---|
| Frontend | React 19, Vite 8, Tailwind CSS, Lucide, Recharts, Framer Motion, React Router |
| Markdown | React Markdown, remark-gfm, Highlight.js |
| Interaction | Axios, react-hot-toast, @dnd-kit/core |
| Backend | Node.js 22.12+, Express 5, Mongoose 9 |
| Data | MongoDB 7+ |
| Security | bcryptjs, JWT HttpOnly cookie, Helmet, CORS allowlist, express-rate-limit, express-validator |
| Deployment | Docker Compose, Nginx static frontend + API reverse proxy |

## Quick start — Docker (recommended)

Requirements: Docker Desktop / Docker Engine with the Compose plugin.

1. From the project root, copy `.env.example` to `.env`.
2. Replace `JWT_SECRET` with a unique random secret (32+ characters). For example, generate one with:

   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
   ```

3. Start the application:

   ```bash
   docker compose up --build -d
   ```

4. Open **http://localhost:5174** and create your first account.
5. View API health at **http://localhost:5174/api/health**.

Useful commands:

```bash
docker compose ps
docker compose logs -f server
docker compose logs -f client
docker compose down
```

MongoDB data is stored in the `fixlog-mongo` Docker volume. `docker compose down -v` deletes that volume and all local database data.

> The client is exposed on **port 5174** by default to avoid the common conflict with Vite development servers. The Compose defaults are configured for local development convenience (`COOKIE_SECURE=false`, `COOKIE_SAME_SITE=lax`). Do not expose these defaults directly to the public internet. For a same-site HTTPS deployment, set `COOKIE_SECURE=true`; for a separate frontend/API site, use `COOKIE_SAME_SITE=none` together with `COOKIE_SECURE=true` and implement CSRF protection. Terminate TLS at a trusted reverse proxy, restrict `CLIENT_URL`, use managed MongoDB credentials/network controls, and keep secrets in your deployment platform's secret manager.

## Local development

Requirements: Node.js 22.12+, npm 10+, MongoDB 7+ running locally or a MongoDB Atlas connection string.

### 1. Start the backend

```bash
cd server
cp .env.example .env
```

Set at least:

```dotenv
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/fixlog
JWT_SECRET=your-unique-random-secret-of-at-least-32-characters
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
COOKIE_SAME_SITE=lax
COOKIE_SECURE=false
BCRYPT_ROUNDS=12
```

Then install and run:

```bash
npm install
npm run dev
```

The API runs on **http://localhost:5000**.

### 2. Start the frontend

In a second terminal:

```bash
cd client
cp .env.example .env
npm install
npm run dev
```

The Vite app runs on **http://localhost:5173** and calls `http://localhost:5000/api` by default. Set `VITE_API_URL` to override the API base URL.

### 3. Production build

```bash
cd client
npm run build
npm run preview
```

Backend production start:

```bash
cd server
npm start
```

## First account and roles

New registrations receive the `Developer` role. The API does not allow a client to self-assign a privileged role. To make your first trusted account an administrator:

1. Start FixLog and register your account in the browser.
2. From the project root, run this command (replace the email with the account you registered):

   ```powershell
   docker compose exec server node src/scripts/promoteAdmin.js admin@your-company.com
   ```

3. Sign out of FixLog and sign back in. The **Admin control** link will appear in the sidebar.

The promotion script updates an existing account only. It does not create accounts or expose a public admin-bootstrap endpoint.

Role behavior:
- **Developer** — create bug logs, change workflow status, comment, and edit/delete their own logs.
- **Lead** — edit and delete bug logs belonging to the signed-in user or directly accepted teammates.
- **Admin** — all Lead permissions, plus account search, role management, account suspension/restoration, permanent account deletion, global issue moderation, workspace metrics, and the audit trail.

Admin safety rules: an administrator cannot suspend/delete/demote their own signed-in account, and the last active administrator cannot be suspended, deleted, or demoted. Suspended users are blocked by backend authentication checks, including existing sessions. Permanent account deletion also removes that user's owned bug logs and their comments on other logs, while keeping audit history with a name snapshot.

## API reference

All bug, activity, and team endpoints require an authenticated session. Authentication is stored in the `fixlog_token` HttpOnly cookie; Bearer tokens are also accepted by the backend for API clients.

### Authentication — `/api/auth`

| Method | Route | Purpose |
|---|---|---|
| POST | `/register` | Create a Developer account and sign in |
| POST | `/login` | Authenticate and set session cookie |
| GET | `/me` | Get current user |
| PUT | `/profile` | Update professional profile fields and optionally password |
| POST | `/avatar` | Upload a JPG, PNG, WebP, or GIF profile photo (max 2 MB) |
| DELETE | `/avatar` | Remove the current profile photo |
| POST | `/logout` | Clear the session cookie |

### Bugs — `/api/bugs`

| Method | Route | Purpose |
|---|---|---|
| GET | `/` | Search/filter/sort/paginate bug logs |
| POST | `/` | Create a bug log |
| GET | `/stats` | Aggregated dashboard and analytics metrics |
| GET | `/:id` | Get bug details, comments, and issue activity |
| PUT | `/:id` | Update fields or status |
| DELETE | `/:id` | Delete a bug log (creator, Lead, or Admin) |
| POST | `/:id/comments` | Add a troubleshooting comment |
| POST | `/export` | Export JSON, CSV, or Markdown (`{ "format": "json" }`) |

List query parameters: `search`, `tag` (comma-separated), `status`, `severity`, `sort` (`newest`, `oldest`, `updated`, `severity`, `title`), `page`, and `limit` (max 100). Example:

```text
GET /api/bugs?search=connection&status=Open&tag=MongoDB,Node.js&sort=updated&page=1&limit=20
```

### Administration — `/api/admin` (Admin role required)

| Method | Route | Purpose |
|---|---|---|
| GET | `/overview` | Account, issue, debugging-time, and audit metrics |
| GET | `/users` | Search/filter/paginate accounts and show owned issue counts |
| PATCH | `/users/:id/role` | Change Developer, Lead, or Admin role |
| PATCH | `/users/:id/suspend` | Suspend an account with an optional reason |
| PATCH | `/users/:id/activate` | Restore a suspended account |
| DELETE | `/users/:id` | Permanently delete an account and owned issue records |
| GET | `/audit` | Read the latest administrative and engineering audit events |

The Admin control center also uses the protected bug API to search all records, change issue workflow status, and delete issue records.

### Team collaboration — `/api/team`

| Method | Route | Purpose |
|---|---|---|
| GET | `/directory?search=...` | Search active FixLog users by name, email, headline, or skill |
| GET | `/connections` | List yourself and approved teammates |
| GET | `/requests` | List incoming and outgoing pending requests |
| POST | `/requests` | Send a request by email, optionally with a note |
| PATCH | `/requests/:id/accept` | Approve an incoming request |
| PATCH | `/requests/:id/decline` | Decline an incoming request |
| DELETE | `/requests/:id` | Cancel an outgoing request |
| DELETE | `/connections/:userId` | Remove an approved teammate and revoke shared visibility |

### Workspace — `/api`

| Method | Route | Purpose |
|---|---|---|
| GET | `/activity` | Recent issue activity in your personal/approved team circle |
| GET | `/team` | Compatibility endpoint for approved team members |
| GET | `/health` | API health check |

### Bug create payload example

```json
{
  "title": "Refresh token race condition",
  "description": "Two simultaneous requests attempt to rotate the same token.",
  "rootCause": "Token rotation was not atomic across concurrent requests.",
  "fix": "Use a transaction and reject token reuse.",
  "status": "Open",
  "severity": "High",
  "techTags": ["Node.js", "MongoDB"],
  "timeSpentMinutes": 45,
  "gitCommitRef": "https://github.com/org/repo/commit/abc123"
}
```

## Project structure

```text
FixLog/
├── client/
│   ├── src/
│   │   ├── api/             # Axios client and API services
│   │   ├── components/      # Sidebar, modals, Markdown, charts, badges
│   │   ├── context/         # Auth and theme providers
│   │   ├── layouts/         # Authenticated workspace shell
│   │   ├── pages/           # Dashboard, journal, analytics, team, detail, auth
│   │   └── utils/           # Formatting and UI constants
│   ├── Dockerfile
│   └── nginx.conf
├── server/
│   ├── src/
│   │   ├── config/          # MongoDB connection
│   │   ├── controllers/     # Auth, admin, bug, analytics, export, team handlers
│   │   ├── middleware/      # Auth, RBAC, validation, error handling
│   │   ├── models/          # User, BugLog, AuditLog, TeamRequest
│   │   ├── routes/          # Auth, admin, bug, team, workspace API routes
│   │   ├── scripts/         # Promote a trusted existing account to Admin
│   │   └── utils/           # Async handler, audit helper, team access, HTTP errors
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

## Security and operational notes

- Passwords are bcrypt-hashed; password fields are excluded from normal user queries/serialization.
- JWT sessions are sent in HttpOnly cookies; the browser Axios client uses `withCredentials`.
- CORS uses an explicit allowlist. Configure `CLIENT_URL` with the exact frontend origin(s), comma-separated if needed.
- Helmet headers and API/auth rate limits are enabled.
- Request bodies are size-limited; route payloads use express-validator and Mongoose schema validation.
- Bug search treats user input as a literal escaped regular expression; pagination and filter limits are bounded.
- Markdown is rendered without enabling raw HTML, reducing the risk of embedded HTML/script execution.
- The backend enforces ownership/role checks for edits and deletes; hiding controls in the UI is not the security boundary.

### Important scope note

The collaboration model is pairwise and opt-in: each user sees their own bug records and the records of users they are directly connected to through an accepted `TeamRequest`. It is not an organization/tenant workspace model; connections are not transitive. Before using one database for multiple customer organizations, add workspace/organization identifiers and enforce tenant isolation in every query. This project does not include SSO, billing, email delivery, or a separate issue-assignment model.

For cross-site frontend/API deployments, use HTTPS for both origins and set `COOKIE_SAME_SITE=none` plus `COOKIE_SECURE=true`; configure a strict CORS allowlist and CSRF protection appropriate to the deployment. Also configure TLS, MongoDB authentication, backups, monitoring, and a deployment-specific secrets policy.

## Troubleshooting

- **Mongo connection refused:** verify `MONGODB_URI` and that MongoDB is running/reachable from the backend container or process.
- **401 after login:** confirm the frontend and API origins are configured consistently, cookies are enabled, and `withCredentials` remains enabled.
- **CORS error:** add the exact frontend origin (including scheme and port) to `CLIENT_URL`.
- **Port already in use:** change `PORT` for the server or the host-side port mapping in `docker-compose.yml`.
- **Build issues after dependency changes:** remove `node_modules` and the corresponding `package-lock.json` only when you intend to regenerate dependencies, then run `npm install` again.


## Profile photos and developer profiles

Users can open **My profile** from the sidebar or profile menu and update their name, professional headline, biography, location, timezone, skills, and portfolio links. Email and role are read-only in self-service profile settings. Password changes require the current password and a confirmation of the new password.

Profile photos can be selected directly from the device. FixLog accepts JPG, PNG, WebP, and GIF images up to 2 MB. The server verifies the image's file signature, generates a safe random filename, and stores it in the persistent `fixlog-uploads` Docker volume. Photos are served through `/uploads/`; they remain available across container rebuilds and restarts while that volume is retained. For local Vite development, `/uploads` is proxied to the Express API.

## Approval-based team collaboration

1. Open **Team → Find people**.
2. Search by a FixLog user's name, email, or professional headline.
3. Select **Request to connect** and optionally include a short note.
4. The recipient opens **Team → Requests** and explicitly accepts or declines.
5. Only after acceptance are the users connected. The accepted pair can then see each other's bug logs and shared issue activity.

Sending a request does not grant access. Pending requests can be cancelled by the sender. A recipient can decline without sharing their engineering data. Team connections are stored as `TeamRequest` records; issue queries, analytics, activity, and exports are scoped to the signed-in user and their directly accepted teammates. Connections are pairwise rather than separate organization workspaces. Removing a connection revokes that pair's shared visibility. Administrators retain their existing workspace-wide moderation access. Existing issue records remain in MongoDB; after this update, each user sees their own records until they connect with the relevant owners.

## Updating an existing Docker installation

Keep your existing root `.env` file and do not remove Docker volumes. Extract the updated project over the previous source (or copy the updated files into the project folder), then run from the project root:

```powershell
docker compose up -d --build
```

The client remains available at **http://localhost:5174**. The existing `fixlog-mongo` volume preserves MongoDB data. The new `fixlog-uploads` volume stores uploaded profile photos.

Do not run `docker compose down -v` unless you intentionally want to remove the database and uploaded photos.
