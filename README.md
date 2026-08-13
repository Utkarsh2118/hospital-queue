# MediQueue — Hospital Queue Management System

A full-stack, real-time queue management system for hospital front desks —
built as a Skill Development Project (CSE343). Patients check in and track
their token from their phone; doctors and admins manage the queue live from
role-based dashboards.

**Live app:** https://hospital-queue-sigma.vercel.app
**Backend API:** https://hospital-queue-eeko.onrender.com

> Hosted on Render's free tier — the backend sleeps after inactivity, so the
> first request after a while can take 20–50 seconds to wake up. Give it a
> moment on first load.

## Screenshots

<!-- Add 2–4 screenshots or a short GIF here before sharing this repo —
     landing page, check-in flow, and a dashboard/display view work best. -->

## Features

- **Real-time queue updates** over Socket.IO — check-ins, calls, and
  completions push instantly to patients, doctors, and the waiting-room
  display, no refreshing
- **Emergency triage** — emergency check-ins jump the queue automatically
- **QR token tracking** — every ticket includes a QR code linking to a live
  tracking page
- **Role-based dashboards** — doctors see only their department's queue;
  admins see every department, doctor, and token
- **Department-aware queueing** — each department keeps its own independent
  queue and token counter
- **Secure staff access** — hashed passwords, JWT sessions verified on every
  request, admins can deactivate staff instantly; patients never need an
  account
- **Password recovery** — email-based reset flow that never reveals whether
  an email is actually registered (no account enumeration)

## Tech stack

| Layer | Stack |
|---|---|
| Frontend | Plain HTML, CSS, vanilla JavaScript — no build step, no framework |
| Backend | Node.js, Express |
| Database | MongoDB Atlas (Mongoose) |
| Real-time | Socket.IO |
| Auth | JWT + bcrypt |
| Email | Resend API (forgot-password links) |
| Hosting | Vercel (frontend), Render (backend) |

## Pages

| File | Who it's for |
|---|---|
| `landing.html` | Marketing/landing page — product overview, how it works, security |
| `checkin.html` | Patient kiosk — pick a department, check in, get a token + QR code |
| `track.html` | Patient token tracking — live queue position and estimated wait |
| `login.html` | Doctor / admin sign in |
| `forgot-password.html`, `reset-password.html` | Staff password recovery |
| `dashboard.html` | Doctor view — now serving, call next, waiting list, skip |
| `admin.html` | Admin view — manage departments and doctor accounts |
| `display.html` | Public waiting-room display screen |

## How it's organized

```
frontend/
  landing.html, checkin.html, track.html, login.html,
  forgot-password.html, reset-password.html,
  dashboard.html, admin.html, display.html
  css/
    tokens.css          Design tokens (color, type, spacing, radius, shadow)
    foundation.css       Base/reset styles
    components.css        Shared components (ticket stub, modals, skeletons)
    landing.css, kiosk.css, login.css, track.css,
    dashboard.css, admin.css, display.css   Page-specific styles
  js/
    config.js          API_URL / SOCKET_URL — edit if your backend runs elsewhere
    api.js               Small fetch wrapper (attaches the JWT automatically)
    auth.js                login() / logout() / requireRole() page guard
    socket.js               Socket.IO connection + join/leave department room
    icons.js                  Hand-drawn SVG icon set, no icon library
    theme.js                   Light/dark theme toggle
    toast.js                    Toast notifications
    landing.js, kiosk.js, login.js, forgot-password.js,
    reset-password.js, dashboard.js, admin.js, display.js,
    track.js, feedback.js   Page-specific logic

backend/
  server.js            Express app + Socket.IO setup
  config/db.js          MongoDB connection
  models/                 Mongoose schemas (User, Department, Queue, Feedback)
  controllers/             Route handlers (auth, queue, departments, users, feedback)
  routes/                   Express routers
  middleware/                Auth/role guards
  utils/                      Email service, helpers
  seed.js                Creates a sample admin + departments for local dev
```

Each frontend page loads only the scripts it needs, in order, via plain
`<script src="...">` tags — no imports, no bundler, no transpilation.
Real-time updates use the Socket.IO client from a CDN (`cdn.socket.io`).

## Design system

"Wayfinding" — hospital signage-inspired visual identity: steel-blue
primary, muted amber for live/active states, muted red reserved for
emergency and priority signaling. `Barlow Semi Condensed` for headings,
`Inter` for body text, `JetBrains Mono` for token numbers — all loaded from
Google Fonts. Full light/dark theme tokens live in `css/tokens.css`.

## Backend setup

```bash
cd backend
npm install
cp .env.example .env      # set your MONGO_URI and JWT_SECRET
node seed.js               # creates admin@hospital.test / admin123 + 3 sample departments
npm run dev                # runs on http://localhost:5000
```

## Frontend setup

The frontend is static files — serve them with any static file server.

**Option A — VS Code Live Server extension (easiest)**
Install the "Live Server" extension, right-click `frontend/landing.html`,
choose "Open with Live Server".

**Option B — npm script (uses `http-server`)**
```bash
cd frontend
npm install
npm start                  # runs on http://localhost:5173
```

**Option C — Python**
```bash
cd frontend
python -m http.server 5173
```

> Don't open the HTML files directly via `file://` — the browser blocks
> some `fetch` requests from `file://` origins. Always serve via one of the
> options above. The app automatically prefers the local backend when the
> frontend is served from `localhost` or `127.0.0.1`, while keeping the
> deployed Render URL as the default for production hosting.

## Running everything together

1. Start the backend (`npm run dev` in `backend/`).
2. Serve the frontend (any option above).
3. Visit `landing.html`, then "Start check-in" to check in a test patient.
4. Visit `login.html`, sign in as `admin@hospital.test` / `admin123`.
5. In the admin panel, create a doctor account for a department.
6. Sign out, sign back in as that doctor → lands on `dashboard.html`.
7. Open `display.html` in another tab and watch it update live as you call
   patients from the dashboard.



Built by Utkarsh Srivastava.