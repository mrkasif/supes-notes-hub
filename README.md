# Notes Hub (User IDs + PDF Uploads)

## What was wrong
- `src/index.js` did not render the React app, so the page could appear blank.
- The repository has a nested folder structure: your real app is inside `supes-notes-hub-main/supes-notes-hub-main`.
- There was no database, auth system, or upload backend before; only hardcoded mock data.

## What is added now
- User registration and login APIs.
- JWT-based authentication.
- PDF upload API (only `.pdf` allowed, up to 20MB).
- Local JSON database at `data/db.json`.
- Uploaded files stored in `uploads/pdfs/`.
- Frontend page for register/login/upload/list notes.

## Project structure
- `src/` React frontend
- `server/server.js` backend API
- `data/db.json` local database file
- `uploads/pdfs/` uploaded PDF files

## Run locally
1. Install dependencies
```bash
npm install
```
2. Start backend
```bash
npm run server
```
3. Start frontend (new terminal)
```bash
npm start
```
4. Open `http://localhost:3000`

## Environment
- Frontend API URL: `REACT_APP_API_BASE` (default: `http://localhost:5000`)
- Backend JWT secret: `JWT_SECRET` (default fallback exists, but set your own in production)

## Vercel note (important)
This version stores uploads on local disk (`uploads/pdfs`). On Vercel, serverless file storage is temporary, so uploaded files are not permanently saved.

For real Vercel production use:
- Database: Supabase / Neon / MongoDB Atlas
- Files: Vercel Blob / Cloudinary / S3
