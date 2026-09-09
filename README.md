# NOVA API

Phase 1 of NOVA, a team productivity platform: **Plan. Collaborate. Deliver.**

## Included

- PostgreSQL schema managed with Prisma
- User, Project, Task, Comment, and ProjectMember models
- Bcrypt password hashing
- JWT signup, login, logout, and current-user endpoints
- Protected route middleware
- Seed data for two demo users, one project, and one task
- Authenticated project CRUD and populated project member endpoints
- Project member add, remove, and role assignment endpoints
- Project-scoped task CRUD with assignees and due dates
- Sequential task status transitions and task comment activity feeds

## Setup

1. Copy `.env.example` to `.env`.
2. Set `DATABASE_URL` to your PostgreSQL database and replace `JWT_SECRET` with a long random value.
3. Install packages: `npm install`
4. Generate the Prisma client: `npm run db:generate`
5. Create/update the database schema: `npm run db:push`
7. Load demo data: `npm run db:seed`. The Render start command also runs the idempotent seed script, which creates the local demo accounts.
7. Start development mode: `npm run dev`

The API listens on `http://localhost:4000` by default.

## Phase 1 checks

- `GET /health` is public.
- `GET /api/protected` returns `401` without `Authorization: Bearer <token>`.
- `POST /api/auth/signup` accepts `{ "name", "email", "password" }`.
- `POST /api/auth/login` accepts `{ "email", "password" }` and returns a JWT.
- `GET /api/auth/me` validates the token and returns the current user.
- `POST /api/auth/logout` requires a valid token and returns `204`.
- `GET /api/projects` lists projects with members and tasks.
- `POST /api/projects` creates a project and adds its creator as a member.
- `GET/PATCH/DELETE /api/projects/:projectId` manages a project; deletion is admin-only.
- `POST /api/projects/:projectId/members` adds a member with an assigned project role.
- `PATCH/DELETE /api/projects/:projectId/members/:userId` changes or removes membership.
- `GET/POST /api/projects/:projectId/tasks` lists or creates project tasks.
- `GET/PATCH/DELETE /api/projects/:projectId/tasks/:taskId` manages a task within its project.
- `PATCH /api/projects/:projectId/tasks/:taskId/status` advances status from `TODO` to `IN_PROGRESS` to `DONE`.
- `GET/POST /api/projects/:projectId/tasks/:taskId/comments` reads or adds task activity comments.

JWTs are stateless and expire after seven days. Logout is represented by a protected API endpoint; token revocation can be added later if the product requires server-side session invalidation.

## Demo credentials

- `admin@nova.local` / `NovaDemo123!`
- `member@nova.local` / `NovaDemo123!`

Do not use these credentials outside local development.

## Phase 4 frontend

The React/Vite client lives in `frontend/` and uses `VITE_API_URL` to find the API.

1. Copy `frontend/.env.example` to `frontend/.env` if the API is not running on `http://localhost:4000`.
2. Run `cd frontend && npm install`.
3. Start the client with `npm run dev`.

The authenticated shell restores its JWT from browser storage, loads the current user, and shows loading, error, and empty project states.

## Phase 5 frontend

Project cards now open a project workspace with:

- Kanban columns for To do, In progress, and Done
- Task detail drawer with assignee, due date, and activity
- Click-to-advance task status through the backend transition API
- Comment submission without a full page reload
- Project member list and add-member form using a user ID

Phase 5 checks: open a project, move a task between columns, open its detail drawer, add a comment, confirm the comment appears immediately, and add a project member.

## Phase 6 polish

- Project cards and project detail show live completion percentages from `DONE` tasks.
- The dashboard can create projects through the API.
- The project board can create tasks directly in the To do column.
- Responsive layouts cover desktop, tablet, and mobile navigation/detail views.

Phase 6 checks: resize the browser across breakpoints, create a project, create a task, move it through statuses, and confirm the progress percentage updates after each change.

## Phase 7 deployment

The project is deployment-ready but has not been published because provider accounts, credentials, and repository access have not been supplied.

### Backend and database on Render

1. Create a Git repository for this project and push the code.
2. In Render, create a Blueprint from the repository. The root `render.yaml` provisions the API and PostgreSQL database.
3. Set the generated `CLIENT_ORIGIN` value to the final Vercel frontend URL.
4. Deploy and verify `https://YOUR_API_HOST/health` returns `{"status":"ok","service":"nova-api"}`.

### Frontend on Vercel

1. Import the same repository into Vercel.
2. Set the project root directory to `frontend`.
3. Add `VITE_API_URL=https://YOUR_API_HOST` in the Vercel environment variables.
4. Deploy and test login, project creation, task status updates, comments, and responsive layouts.

### Final environment values

Backend: `DATABASE_URL`, `JWT_SECRET`, `CLIENT_ORIGIN`, and `PORT`.

Frontend: `VITE_API_URL`.

Do not commit `.env` files or provider credentials. After deployment, replace the local demo credentials and run the full test checklist against the hosted URLs.
