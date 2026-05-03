# Deployment Guide

This project is a Node/Express app that serves the frontend from `public/` and uses PostgreSQL.

## Recommended: Railway

Railway is a simple fit because it can host both the Node app and PostgreSQL in one project.

1. Push this folder to a GitHub repository.
2. Create a Railway project and deploy from the GitHub repo.
3. Add a PostgreSQL database service.
4. In the app service variables, set:
   - `DATABASE_URL=${{Postgres.DATABASE_URL}}`
   - `QR_HMAC_SECRET=<long random secret>`
   - `ADMIN_USERNAME=<admin username>`
   - `ADMIN_PASSWORD=<strong admin password>`
   - `ADMIN_JWT_SECRET=<long random secret>`
   - `PUBLIC_URL=https://<your Railway domain>`
   - `CLONE_WINDOW_MINUTES=10`
   - `CLONE_MAX_SCANS=3`
   - `CLONE_NORMAL_THRESHOLD=2`
   - `CLONE_DISTANCE_KM=50`
   - `CLONE_MAX_TRAVEL_MINUTES=10`
5. Generate a public domain for the app service.
6. Run `db/schema.sql` against the Railway PostgreSQL database before using the app.

Railway detects Node apps automatically. The app starts with:

```bash
npm start
```

## Render Alternative

1. Push this folder to GitHub.
2. Create a Render PostgreSQL database.
3. Create a Render Web Service from the GitHub repo.
4. Use:
   - Build command: `npm install`
   - Start command: `npm start`
5. Add the same environment variables listed above, using Render's external database URL as `DATABASE_URL`.
6. Run `db/schema.sql` against the Render PostgreSQL database.

## Local Check Before Deploying

```bash
npm install
npm start
```

Then open:

```text
http://localhost:3000/dashboard.html
```

## Important Notes

- Do not upload `.env` to GitHub. Use `.env.example` as the variable checklist.
- Admin pages use `/login.html`. Set `ADMIN_USERNAME`, `ADMIN_PASSWORD`, and `ADMIN_JWT_SECRET` in Railway before sharing the deployed dashboard link.
- If your local database already contains real data, export it with `pg_dump` and restore it to the hosted database instead of only running `db/schema.sql`.
- The health check endpoint is `/health`.
