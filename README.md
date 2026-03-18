# CureNet

CureNet is a full-stack healthcare platform for patients, doctors, and administrators. It provides authentication, role-based dashboards, doctor discovery, profile management, appointment booking, prescription handling, ratings, and administrative oversight.

## Overview

The repository contains two applications:

- `backend`: Express API with Sequelize, MySQL, JWT authentication, Swagger documentation, and AdminJS.
- `frontend`: React + TypeScript single-page application built with Vite and Tailwind CSS.

## Core Capabilities

### Patient

- Register, sign in, and manage profile details
- Discover verified doctors by specialty
- Book appointments using doctor availability windows
- View appointment history and prescription details
- Rate completed consultations

### Doctor

- Maintain professional profile and chamber availability
- Review, approve, reject, start, and complete appointments
- View recent patients and appointment queues
- Create and review prescriptions

### Admin

- Access platform dashboard and analytics
- Review doctor verification status
- View user, doctor, patient, and audit-oriented admin screens

## Tech Stack

### Backend

- Node.js
- Express
- Sequelize
- MySQL
- JWT authentication
- Umzug migrations
- AdminJS
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
- `ADMIN_SESSION_SECRET`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

Install dependencies and start the API:

```bash
npm install
npm run dev
```

Backend endpoints:

- API base: `http://localhost:5000`
- Health check: `GET /api/health`
- Swagger UI: `http://localhost:5000/docs`
- Admin panel: `http://localhost:5000/admin`

### 2. Start the Frontend

```bash
cd frontend
cp .env.example .env
```

Optional frontend environment value:

- `VITE_API_URL` if the API is not available at `http://localhost:5000/api`

Install dependencies and start the frontend:

```bash
npm install
npm run dev
```

Frontend application:

- App URL: `http://localhost:5173`

## Available Commands

### Backend

```bash
npm run dev
npm start
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
- `GET /profile`
- `PUT /profile`
- `POST /forgot-password`
- `GET /verify-reset-token`
- `POST /reset-password`

### Patients

Base path: `/api/patients`

- `GET /profile`
- `PUT /profile`
- `GET /:id/dashboard/stats`
- `GET /:id/appointments`

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
- `/forgot-password`
- `/reset-password`
- `/doctors`
- `/doctors/:id`

### Authenticated App Routes

- `/app`
- `/app/patient-dashboard`
- `/app/doctor-dashboard`
- `/app/admin-dashboard`
- `/app/patient-profile`
- `/app/doctor-profile`
- `/app/patient-appointments`
- `/app/doctor-appointments`
- `/app/doctor-my-patients`
- `/app/doctors`
- `/app/users`
- `/app/admin-doctors`
- `/app/admin-patients`
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
- CORS defaults to `http://localhost:5173` and `http://localhost:3000` unless overridden.
- If custom AdminJS components change, remove `backend/.adminjs/` and restart the backend to force a rebuild.

## Status

The current implementation covers authentication, public pages, role-based dashboards, profiles, appointments, prescriptions, ratings, and admin reporting screens. Additional feature planning and engineering tasks are tracked in `TASKS.md`.
