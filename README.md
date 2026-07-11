# Hospital Queue Management System — Plain HTML/CSS/JS Edition

Same MediQueue app as the React version, but the frontend is now plain
HTML, CSS, and vanilla JavaScript — **no build step, no npm bundler, no
React**. The backend (Express + MongoDB + Socket.IO) is unchanged, since
it was already plain JavaScript.

## Backend setup

```bash
cd backend
npm install
cp .env.example .env      # set your MONGO_URI
node seed.js               # creates admin@hospital.test / admin123 + 3 sample departments
npm run dev                # runs on http://localhost:5000
```

## Frontend setup

The frontend is just static files (`.html`, `.css`, `.js`) — you can open
them with any static file server. Three easy options:

**Option A — VS Code Live Server extension (easiest)**
Install the "Live Server" extension, right-click `frontend/index.html`,
choose "Open with Live Server".

**Option B — npm script (uses `http-server` under the hood)**
```bash
cd frontend
npm install
npm start                  # runs on http://localhost:5173
```

**Option C — Python (if you have Python installed)**
```bash
cd frontend
python -m http.server 5173
```

Whichever you use, open **http://localhost:5173** in your browser.

> Don't open the HTML files directly via `file://` — the browser blocks
> some `fetch` requests from `file://` origins. Always serve via one of
> the options above.

## Pages

| File | Who it's for |
|---|---|
| `index.html` | Patient kiosk — check in, select department, get a token |
| `login.html` | Doctor / admin sign in |
| `dashboard.html` | Doctor view — now serving, call next, waiting list, skip |
| `admin.html` | Admin view — create departments and doctor accounts |
| `display.html` | Public display screen — put this on the waiting-room TV |

## How it's organized

```
frontend/
  index.html, login.html, dashboard.html, admin.html, display.html
  css/
    tokens.css        Design tokens (colors, fonts, spacing) shared by all pages
    components.css    Shared components: ticket stub, confirm modal, skeleton loaders
    kiosk.css, login.css, dashboard.css, admin.css, display.css   Page-specific styles
  js/
    config.js          API_URL / SOCKET_URL — edit if your backend runs elsewhere
    api.js              Small fetch wrapper (handles JWT header automatically)
    auth.js              login() / logout() / requireRole() page guard
    socket.js            Socket.IO connection + join/leave department room helpers
    icons.js              Hand-drawn SVG icon set (no icon library dependency)
    kiosk.js, login.js, dashboard.js, admin.js, display.js   Page-specific logic
```

Each page loads only the scripts it needs, in order, via plain
`<script src="...">` tags at the bottom of the HTML — no imports, no
bundler, no transpilation. Real-time updates use the Socket.IO client
loaded from a CDN (`cdn.socket.io`).

## Design system

Same "queue ticket" visual identity as before: paper-mint background,
deep teal ink, jade-teal primary, brick-red for emergencies, with the
token itself rendered as a torn ticket stub (see `.ticket-stub` in
`components.css`). Fonts: `Fraunces` for headings, `IBM Plex Mono` for
token numbers, `Inter` for body text — loaded from Google Fonts.

## Running everything together

1. Start the backend (`npm run dev` in `backend/`).
2. Serve the frontend (any option above).
3. Visit `/index.html` (or just `/`) to check in a test patient.
4. Visit `/login.html`, sign in as `admin@hospital.test` / `admin123`.
5. In the admin panel, create a doctor account for a department.
6. Sign out, sign back in as that doctor at `/login.html` → lands on
   `/dashboard.html`.
7. Open `/display.html` in another tab/window and watch it update live
   as you call patients from the dashboard.

## Why not React?

This version trades some convenience (no automatic UI re-rendering, more
manual DOM updates in `dashboard.js` and `display.js`) for zero build
tooling — useful if you want to understand exactly what's happening in
the browser without a compiler in between, or if your environment can't
run a Node-based dev server for the frontend. The original React version
is available separately if you'd rather work with components and JSX.
