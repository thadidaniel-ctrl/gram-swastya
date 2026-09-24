# Gram Swasthya 2.0

Rural-first digital healthcare platform (English + Hindi). Bundles patient and doctor portals, symptom analysis, voice assistant, medicine tracking, health records, ambulance dispatch, files, and video consultations into one web app.

## Stack

- **Frontend:** React 18, React Router, i18next (en/hi), Vite. PWA-ready service worker.
- **Backend:** Node.js + Express 5, MongoDB (Mongoose), Redis (optional, falls back in-memory), Socket.IO for emergency dispatch, winston logging.
- **Payment:** pluggable adapter — `mock` (default) or `stripe` via `PAYMENT_GATEWAY`.
- **AI/External:** Gemini (symptom/voice), Twilio (OTP SMS), AWS S3 (medical files), Web-Push/FCM (reminders).

## Structure

```
backend/   Express API + services + cron jobs + Socket.IO
frontend/  Vite React SPA + PWA service worker + Storybook/Cypress
symptom_checker/  supporting symptom-data scripts
```

## Quick Start

```bash
# Backend
cd backend
npm install
cp .env.example .env        # fill MONGODB_URI, JWT_SECRET, at minimum
npm run dev                 # http://localhost:5000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev                 # http://localhost:3000 (proxies /api -> :5000)
```

## Tests

```bash
cd backend && npm test          # jest, incl. real-MongoDB end-to-end tests
cd frontend && npm test         # vitest (component + API-wiring + smoke)
```

`backend/src/__tests__/e2e.appointments.test.js` runs against a live local MongoDB (`mongodb://127.0.0.1:27017`) — start `mongod` first.

## Production Notes

- `NODE_ENV=production node src/server.js` from `backend/`; HTTP server binds `PORT` (default 5000).
- Redis is optional — the app boots on the in-memory mock client if unavailable.
- Set `PAYMENT_GATEWAY=stripe` + `STRIPE_SECRET_KEY` to enable real payments; default is the mock adapter.
- Set `MEETING_BASE_URL` to generate real video-consultation links.
- Supports real-time ambulance dispatch over Socket.IO — do not remove the `initializeSocket(server)` call in `server.js`.
- Update `frontend/.env` `VITE_API_URL` to the deployed API root before building.

## Security

Never commit `backend/.env`. Rotate shipped secrets (JWT, AWS, Twilio, Gemini) and rewrite git history before reuse. See `backend/README.md` → "Security Considerations" for the implemented controls.