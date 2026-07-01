# WorkoutFlow 🏋️‍♂️📱

WorkoutFlow is a mobile-first, full-stack Progressive Web App (PWA) designed to turn saved exercise videos (primarily TikTok, YouTube, or Reels) into scheduled workout routines. It helps users stay consistent through push notifications, streaks, completion logs, calendar events, and visual analytics.

This project is built using React (Vite) on the frontend and Node.js (Express) with PostgreSQL (Neon) on the backend.

---

## 🏗️ Project Architecture

```
User -> React PWA (Vercel) -> Express API (Render) -> PostgreSQL (Neon)
                                     ^
                         Vercel Cron (Ticks every minute)
```

---

## 📁 Folder Structure

```
sport_web_app/
├── client/                     # Frontend React SPA
│   ├── api/                    # Vercel Serverless Functions (Cron Proxy)
│   ├── public/                 # Static assets & PWA Icons
│   ├── src/
│   │   ├── api/                # Axios API service
│   │   ├── components/         # Shared UI, layout & modal components
│   │   ├── pages/              # Auth, Dashboard, Workouts, Calendar, Analytics, Profile
│   │   ├── store/              # Zustand Auth store
│   │   ├── App.jsx             # React Router routing
│   │   ├── index.css           # Custom CSS, variables, glassmorphic styling
│   │   └── main.jsx            # Main entry point
│   ├── vite.config.js          # Vite configuration with PWA plugin
│   └── vercel.json             # Vercel SPA routing and Cron configuration
│
├── server/                     # Backend Node.js Express API
│   ├── src/
│   │   ├── config/             # DB Pool connection & SQL migrations
│   │   ├── controllers/        # Route controllers (Auth, Workout, Calendar, etc.)
│   │   ├── jobs/               # Local node-cron scheduler backup
│   │   ├── middleware/         # Auth verification & global error handling
│   │   ├── routes/             # REST route handlers
│   │   ├── services/           # Streak, Analytics, and Scheduler core services
│   │   └── app.js              # Express app entry point
│   ├── migrations/             # SQL schema files
│   └── package.json            # Node backend dependencies
│
├── 001_init.sql                # Complete DB schema script
└── render.yaml                 # Render infrastructure deployment config
```

---

## 🛠️ Local Setup Guide

### 1. Database Configuration (PostgreSQL / Neon)
1. Register/Login at [Neon](https://neon.tech).
2. Create a new project.
3. Open the **SQL Editor** in Neon's dashboard.
4. Copy the entire contents of the root [001_init.sql](file:///d:/xampp/htdocs/sport_web_app/001_init.sql) and click **Run**. This creates all 12 tables, indexes, triggers, and constraints.
5. Copy your **Pooled Connection String** from Neon.

### 2. Backend Server Setup
1. Open a terminal in the `server` directory:
   ```bash
   cd server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Generate VAPID keys for push notifications:
   ```bash
   npx web-push generate-vapid-keys
   ```
   Save these keys! You'll need them for the environment variables.
4. Create a `.env` file from the example:
   ```bash
   cp .env.example .env
   ```
5. Open `.env` and fill in the values:
   - `DATABASE_URL`: Your Neon pooled connection string.
   - `JWT_SECRET`: A long random string.
   - `VAPID_PUBLIC_KEY`: The public key generated from the step above.
   - `VAPID_PRIVATE_KEY`: The private key generated from the step above.
   - `CRON_SECRET`: A long random secret key to secure your scheduler.
6. Initialize the database schema (optional/backup):
   ```bash
   npm run migrate
   ```
7. Start the dev server:
   ```bash
   npm run dev
   ```

### 3. Frontend Client Setup
1. Open a terminal in the `client` directory:
   ```bash
   cd ../client
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file from the example:
   ```bash
   cp .env.example .env
   ```
4. Open `.env` and fill in the values:
   - `VITE_API_URL`: `http://localhost:5000` (or your deployed Render API URL)
   - `VITE_VAPID_PUBLIC_KEY`: Must match the `VAPID_PUBLIC_KEY` in the server's `.env`.
5. Start the local client:
   ```bash
   npm run dev
   ```
6. Open `http://localhost:5173` in Chrome on your desktop or mobile device.

---

## 🚀 Production Deployment Guide

### Deployment Step 1: Database
Ensure you run [001_init.sql](file:///d:/xampp/htdocs/sport_web_app/001_init.sql) on your Neon production branch.

### Deployment Step 2: Backend (Render)
1. Push your project to GitHub.
2. Link your GitHub account on [Render](https://render.com).
3. Click **New +** -> **Blueprint** to import the `render.yaml` infrastructure configuration, OR manually create a **Web Service**:
   - **Environment**: Node
   - **Build Command**: `npm install` (run in `server` subdirectory)
   - **Start Command**: `npm start`
4. Add all environment variables from `server/.env` to the Render Service Settings.

### Deployment Step 3: Frontend (Vercel)
1. Deploy the `client/` subdirectory to [Vercel](https://vercel.com).
2. Configure environment variables on Vercel:
   - `VITE_API_URL`: Your Render backend URL (e.g., `https://your-app.onrender.com`).
   - `VITE_VAPID_PUBLIC_KEY`: Your VAPID public key.
   - `API_URL`: Your Render backend URL.
   - `CRON_SECRET`: Your Cron secret key (for proxy request authentication).
3. The PWA will automatically precache assets and handle routing via `vercel.json` rewrites.

### Deployment Step 4: Cron Job Scheduling
WorkoutFlow checks for due workouts and schedules notifications every minute.
1. Vercel Cron is already configured via `vercel.json` to hit `/api/cron/proxy` on your Vercel deployment.
2. The proxy function in `client/api/cron/proxy.js` will receive the request and proxy a POST request to your Render API (`/api/cron/tick`) to run the schedule worker.
3. This setup wakes up your Render Web Service if it goes to sleep due to inactivity!
