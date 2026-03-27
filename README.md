# CureNet

CureNet is a full-stack healthcare platform for patients, doctors, receptionists, and administrators. It provides authentication, role-based dashboards, doctor discovery, clinic-based appointment booking, prescription handling, reminders, medical history, and imaging workflows.

## Overview

The repository contains two applications:

- `backend`: Express API with Sequelize, MySQL, JWT authentication, Swagger documentation, and the reminder worker.
- `frontend`: React + TypeScript single-page application built with Vite and Tailwind CSS.

## Core Capabilities

### Patient

- Register, sign in, and manage profile details
- Discover verified doctors by specialty
- Book appointments using doctor availability windows
- View appointment history and prescription details
- Review medical history and provider-uploaded imaging records
- Rate completed consultations

### Doctor

- Maintain professional profile and chamber availability
- Review, approve, reject, start, and complete appointments
- View recent patients and appointment queues
- Create and review prescriptions
- Upload and review patient imaging records from the continuity view

### Admin

- Access platform dashboard and analytics
- Review doctor verification status
- Manage users, clinics, and audit-oriented admin screens

### Receptionist

- Manage clinic-scoped appointment requests
- Review clinic doctor roster and daily queue load
- Support imaging and appointment-linked operational workflows

## Tech Stack

### Backend

- Node.js
- Express
- Sequelize
- MySQL
- JWT authentication
- Umzug migrations
- Swagger UI

### Frontend

- React 19
- TypeScript
- Vite
- Tailwind CSS
- React Router
- React Query
- Axios

## Repository Structure

```text
curenet/
├── backend/
│   ├── scripts/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── docs/
│   │   ├── lib/
│   │   ├── middleware/
│   │   ├── migrations/
│   │   ├── models/
│   │   └── routes/
│   └── tests/
├── frontend/
│   ├── public/
│   └── src/
└── README.md
```

## Prerequisites

- Node.js 18 or newer
- MySQL 8 or newer

## Getting Started

### Local Development

### 1. Start the Backend

```bash
cd backend
cp .env.example .env
```

Update `backend/.env` with the required values:

- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `JWT_SECRET`

Optional values:

- `DB_HOST`
- `DB_PORT`
- `PORT`
- `CORS_ORIGIN`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `APP_BASE_URL`
- `TRUST_PROXY`
- `UPLOADS_DIR`
- `AUTH_ALLOW_UNVERIFIED_LOGIN`
- `MAIL_HOST`
- `MAIL_PORT`
- `MAIL_SECURE`
- `MAIL_USER`
- `MAIL_PASSWORD`
- `MAIL_FROM`

Development defaults:

- [backend/.env.example](/home/sanzid/playground/curenet/backend/.env.example) keeps `AUTH_ALLOW_UNVERIFIED_LOGIN=true` so teammates can log in locally even before email delivery is configured.
- For the full verification flow, set `AUTH_ALLOW_UNVERIFIED_LOGIN=false` and configure SMTP.
- The easiest local SMTP option is Mailpit or MailHog on `127.0.0.1:1025`.
- For real email delivery, use an SMTP provider such as Brevo and replace the `MAIL_*` values in `backend/.env`.

Install dependencies and start the API:

```bash
npm install
npm run dev
```

Backend endpoints:

- API base: `http://localhost:5000`
- Health check: `GET /api/health`
- Swagger UI: `http://localhost:5000/docs`
- Raw OpenAPI JSON: `http://localhost:5000/openapi.json`

### 2. Start the Frontend

```bash
cd frontend
cp .env.example .env
```

Optional frontend environment value:

- `VITE_API_URL` if the API is not available at `/api` or `http://localhost:5000/api`

Install dependencies and start the frontend:

```bash
npm install
npm run dev
```

Frontend application:

- App URL: `http://localhost:5173`

## Docker Deployment

The repo includes a production-style Docker stack with:

- `mysql`
- `backend`
- `reminder-worker`
- `frontend`
- `nginx-proxy`

This stack does not use AdminJS.

### 1. Prepare the deploy environment

From the repo root:

```bash
cp .env.deploy.example .env.deploy
```

Update at least:

- `APP_BASE_URL`
- `CORS_ORIGIN`
- `DB_PASSWORD`
- `DB_ROOT_PASSWORD`
- `JWT_SECRET`
- `MAIL_*`

For local network testing on your PC, set:

- `APP_BASE_URL=https://<your-pc-lan-ip>`
- `CORS_ORIGIN=https://<your-pc-lan-ip>`

### 2. Create local TLS certificates

Generate the self-signed files expected by the reverse proxy:

```bash
openssl req -x509 -nodes -days 365 \
  -newkey rsa:2048 \
  -keyout deploy/certs/local.key \
  -out deploy/certs/local.crt \
  -subj "/CN=localhost"
```

See [deploy/certs/README.md](/home/sanzid/playground/curenet/deploy/certs/README.md) for the certificate path expected by the proxy.

### 3. Start the full stack

From the repo root:

```bash
docker compose --env-file .env.deploy up --build
```

Services exposed through the reverse proxy:

- App: `https://localhost/`
- API health: `https://localhost/api/health`
- Swagger: `https://localhost/docs`

On another device in the same LAN, use:

- `https://<your-pc-lan-ip>/`

You may need to:

- open ports `80` and `443` in your OS firewall
- accept the browser warning for the self-signed certificate

### 4. Persistent data

Docker Compose uses named volumes for:

- MySQL data
- uploaded files under `/uploads`

So restarts do not lose records or uploaded imaging/profile files.

### 5. Azure VM later

The same stack can be reused on an Azure VM:

1. install Docker and the Compose plugin
2. copy the repository or deployment bundle
3. create `.env.deploy`
4. provide TLS certs under `deploy/certs/`
5. run `docker compose --env-file .env.deploy up -d --build`

When you have a real domain, replace the self-signed cert with a real certificate and set:

- `APP_BASE_URL=https://your-domain`
- `CORS_ORIGIN=https://your-domain`

## Available Commands

### Backend

```bash
npm run dev
npm start
npm run reminder-worker
npm test
npm run migrate
npm run generate-migrations
npm run create-admin
```

### Frontend

```bash
npm run dev
npm run build
npm run lint
npm run preview
```

## Database And Migrations

- Migrations run automatically when the backend starts.
- To execute migrations without starting the server, run `npm run migrate` inside `backend`.
- Migration files live in `backend/src/migrations/` and use a numbered naming pattern such as `000001-users.mjs`.
- New migrations should use the next sequence number and export `up` and `down`.
- `npm run generate-migrations` rewrites migration files from Sequelize models. Review the diff carefully before committing.

If you are working with an older local database created from previous migration naming conventions, reset `SequelizeMeta` and rerun migrations if necessary.

## Authentication And Admin Setup

- Public users can register as patients or doctors.
- Admin users cannot self-register through the public UI.
- Public registration now creates an unverified account and sends a 6-digit email verification code.
- Successful email verification starts the login session immediately.
- If `AUTH_ALLOW_UNVERIFIED_LOGIN=true`, local development can bypass the verification gate for unverified users at login.
- Password reset now sends a real email reset link through the same SMTP configuration used by email verification.
- Medication reminders use a separate worker process so scheduled delivery does not run inside the API request server.
- Medical imaging uploads reuse the local `uploads/` storage flow and are served from the backend static uploads path.
- In deployed mode, the backend is expected to run behind Nginx with `TRUST_PROXY=1` so secure auth cookies work correctly over HTTPS.
- Create the first admin from the `backend` directory with:

```bash
npm run create-admin
```

- The command uses `ADMIN_EMAIL` and `ADMIN_PASSWORD` from `.env`, or accepts values passed through the script.
- If an admin password was inserted manually without hashing, use:

```bash
node scripts/update-admin-password.mjs <email> <newPassword>
```

## API Summary

### Auth

Base path: `/api/auth`

- `POST /register`
- `POST /login`
- `POST /verify-email`
- `POST /resend-verification-code`
- `GET /verification-status`
- `POST /logout`
- `GET /profile`
- `PUT /profile`
- `POST /forgot-password`
- `GET /verify-reset-token`
- `POST /reset-password`

### Patients

Base path: `/api/patients`

- `GET /profile`
- `PUT /profile`
- `GET /history`
- `PUT /history`
- `GET /:id/dashboard/stats`
- `GET /:id/appointments`

### Imaging

Base path: `/api/imaging`

- `POST /`
- `GET /my`
- `GET /patient/:patientId`
- `GET /:id`
- `DELETE /:id`

### Doctors

Base path: `/api/doctors`

- `GET /`
- `GET /profile`
- `PUT /profile`
- `POST /upload-image`
- `GET /:id`
- `GET /:id/available-slots`
- `GET /:id/upcoming-slots`
- `GET /:id/ratings`
- `GET /:id/dashboard/stats`
- `GET /:id/appointments`
- `GET /:id/patients`
- `GET /:id/patients/:patientId/context`

### Appointments

Base path: `/api/appointments`

- `POST /`
- `GET /`
- `GET /:id`
- `PUT /:id/cancel`
- `PUT /:id/approve`
- `PUT /:id/reject`
- `PUT /:id/start`
- `PUT /:id/complete`

### Prescriptions

Base path: `/api/prescriptions`

- `GET /appointment/:id`
- `POST /`

### Ratings

Base path: `/api/ratings`

- `GET /doctor/:id`
- `GET /my-ratings`
- `POST /`

### Admin

Base path: `/api/admin`

- `GET /stats`
- `GET /analytics/appointments`
- `GET /doctor-verifications`

## Frontend Routes

### Public Routes

- `/`
- `/about`
- `/contact`
- `/login`
- `/register`
- `/verify-email`
- `/forgot-password`
- `/reset-password`
- `/doctors`
- `/doctors/:id`

### Authenticated App Routes

- `/app`
- `/app/patient-dashboard`
- `/app/patient-medical-history`
- `/app/patient-imaging`
- `/app/doctor-dashboard`
- `/app/receptionist-dashboard`
- `/app/receptionist-appointments`
- `/app/receptionist-doctors`
- `/app/admin-dashboard`
- `/app/admin-clinics`
- `/app/patient-profile`
- `/app/doctor-profile`
- `/app/patient-appointments`
- `/app/patient-prescriptions`
- `/app/patient-reminders`
- `/app/doctor-appointments`
- `/app/doctor-my-patients`
- `/app/doctors`
- `/app/users`
- `/app/admin-analytics`
- `/app/admin-logs`

## Testing

### Backend

Run:

```bash
cd backend
npm test
```

Notes:

- Unit-style tests run directly with Node's built-in test runner.
- Integration coverage in `backend/tests/integration.test.mjs` is opt-in and depends on environment variables such as `RUN_BACKEND_INTEGRATION`, `TEST_PATIENT_TOKEN`, `TEST_DOCTOR_TOKEN`, and related seeded data.

### Frontend

Current verification is build- and lint-oriented:

```bash
cd frontend
npm run build
npm run lint
```

## Operational Notes

- Uploaded doctor profile images are served from `/uploads`.
- Uploaded medical imaging files are also served from `/uploads`.
- CORS defaults to `http://localhost:5173` and `http://localhost:3000` unless overridden.
- Production-style deployment is same-origin through Nginx: frontend at `/` and backend at `/api`.
- The reminder worker is a separate process and should run as its own container in Docker deployments.

## Evaluation Mapping

- `User Authentication & Authorization`
  - multi-role auth, email verification, password reset, and protected workspaces
- `Patient Management`
  - registration, profile, medical history, appointment booking, prescriptions, reminders, and imaging access
- `Doctor Dashboard`
  - appointment desk, patient continuity, prescriptions, and imaging upload/view workflows
- `Administrative Features`
  - user management, doctor approval, clinic management, analytics, and audit logs
- `Additional Feature 1`
  - medication tracking and reminders
- `Additional Feature 2`
  - medical imaging upload and viewing

## Status

The current implementation covers authentication, public pages, role-based dashboards, profiles, appointments, prescriptions, ratings, and admin reporting screens. Additional feature planning and engineering tasks are tracked in `TASKS.md`.
