# iART-HRMS — Attendance Backend

Backend API for a company attendance portal providing role-based authentication, attendance punch-in/punch-out, leave management, calendar utilities, and email broadcasts.

## Features
- Role-based login and user management
- Punch-in / punch-out attendance tracking
- Leave application and admin approval flows
- Calendar month management and auto weekend generation
- Automated cron job for leave calculations
- Email broadcasting via SMTP

## Tech stack
- Node.js (ES modules)
- Express
- MongoDB (Mongoose)
- Nodemailer, node-cron, JWT

## Quickstart

1. Clone the repo and change into backend folder:

```bash
git clone <repo-url>
cd backend
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file at the project root with the environment variables listed below.

4. Start the server (development):

```bash
npm run dev
```

The API listens on `process.env.PORT_KEY` or port `5000` by default.

## Required environment variables
- `DB_URI` — MongoDB connection string (defaults to `mongodb://localhost:27017/attendacePortal`)
- `PORT_KEY` — port to run the API (optional)
- `SECRET_KEY` — JWT secret for signing tokens
- `MAIL_PROVIDER` — optional mail provider identifier
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE` — SMTP settings
- `MAIL_FROM` — default email `from` address

Example `.env` (do NOT commit credentials):

```env
DB_URI=mongodb://localhost:27017/attendacePortal
PORT_KEY=5000
SECRET_KEY=your_jwt_secret
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=587
SMTP_USER=your_user
SMTP_PASS=your_pass
SMTP_SECURE=false
MAIL_FROM=no-reply@yourcompany.com
```

## Scripts
- `npm run dev` — start with `nodemon` (used for development)
- `npm start` — alias to `nodemon index.js` per `package.json`

## API Summary

Base URL: `/api`

- Auth (`/api/auth`)
	- `POST /register` — create user (protected)
	- `POST /login` — login and receive JWT
	- `GET /getAllUsers` — list users (protected)
	- `DELETE /:id` — delete user (protected)
	- `PUT /:id` — update user (protected)
	- `PATCH /users/:userId/status` — toggle user active status (protected)

- Attendance (`/api/attendance`)
	- `POST /punch-in` — punch in (protected)
	- `POST /punch-out` — punch out (protected)
	- `GET /records/:userId` — get user records (protected)
	- `PUT /update-attendance` — update an attendance entry (protected)
	- `GET /monthly-hours/:userId` — monthly working hours (protected)
	- `GET /today` — today's attendance status (protected)
	- `GET /punctuality/:userId` — on-time/late percentage (protected)
	- `POST /auto-absent-leave` — auto mark absentees (protected)
	- `GET /admin/date/:date` — admin view by date (protected)
	- `GET /admin/monthly` — admin monthly attendance (protected)

- Leave (`/api/leave`)
	- `POST /apply-leave` — apply for leave (protected)
	- `GET /my-leaves/:userId` — user leaves (protected)
	- `GET /admin` — admin view of leaves (protected)
	- `PATCH /update/:leaveId` — update leave status (protected)
	- `PATCH /update-leave/:leaveId` — update pending leave (protected)

- Calendar (`/api/calendar`)
	- `POST /` — add or update calendar month (protected)
	- `GET /` — list calendar months (protected)
	- `DELETE /:id` — delete calendar month (protected)
	- `POST /generate-weekends` — auto generate weekends (protected)

- Mail (`/api/mail`)
	- `POST /broadcast` — send broadcast email (protected)

For protected routes include an `Authorization: Bearer <token>` header.

## Folder structure

- `config/` — configs (mail, etc.)
- `controller/` — route handlers
- `routes/` — API route definitions
- `models/` — Mongoose schemas
- `db/` — database connection
- `middleware/` — auth and other middleware
- `cron/` — scheduled jobs (executed on server start)
- `utils/` — helper utilities

## Notes
- On start, `index.js` imports `./cron/leaveCalculator.js` which runs scheduled tasks.
- The project uses `SECRET_KEY` for JWT verification in `middleware/authMiddleware.js`.

## How to push changes

```bash
git add README.md
git commit -m "docs: add README with setup and API summary"
git push origin <branch>
```

---

If you'd like, I can also open a PR, run a quick smoke test, or add example Postman collection.
