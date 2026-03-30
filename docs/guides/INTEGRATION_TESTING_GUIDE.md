# CureNet Integration Testing Guide

This guide shows how to:

- log in to the local API with seeded demo accounts
- extract auth tokens in `fish`
- run the backend integration tests

It assumes:

- the backend is running on `http://localhost:5000`
- demo users have already been refreshed with:

```bash
cd backend
npm run create-demo-users
```

## 1. Demo Accounts Used For Testing

From [DEMO_CREDENTIALS.md](/home/sanzid/playground/curenet/docs/guides/DEMO_CREDENTIALS.md):

- patient: `patient.nabil@curenet.local` / `Patient123`
- doctor: `doctor.asha@curenet.local` / `Doctor123`
- receptionist: `receptionist.maya@curenet.local` / `Reception123`

## 2. Raw Login Curl Commands

Use these if you want to inspect the full response manually.

### Patient

```bash
curl -i -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "patient.nabil@curenet.local",
    "password": "Patient123"
  }'
```

### Doctor

```bash
curl -i -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "doctor.asha@curenet.local",
    "password": "Doctor123"
  }'
```

### Receptionist

```bash
curl -i -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "receptionist.maya@curenet.local",
    "password": "Reception123"
  }'
```

The JWT is returned inside the `Set-Cookie` header as `curenet_auth=...`.

## 3. `fish` Token Commands

These commands log in and extract the cookie token directly into shell variables.

The header-only pattern below is the most reliable one:

- `-D -` prints response headers
- `-o /dev/null` discards the JSON body
- the regex extracts the `curenet_auth` cookie value

If you are testing locally, use `http://localhost:5000`.
If you are testing the deployed site, replace the base URL with `https://curenet.app`.

### Patient token

```fish
set PATIENT_TOKEN (curl -s -D - -o /dev/null -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "patient.nabil@curenet.local",
    "password": "Patient123"
  }' \
  | string match -r '.*curenet_auth=([^;]+).*' \
  | string replace -r '.*curenet_auth=' '' \
  | string replace -r ';.*' '')
```

### Doctor token

```fish
set DOCTOR_TOKEN (curl -s -D - -o /dev/null -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "doctor.asha@curenet.local",
    "password": "Doctor123"
  }' \
  | string match -r '.*curenet_auth=([^;]+).*' \
  | string replace -r '.*curenet_auth=' '' \
  | string replace -r ';.*' '')
```

### Receptionist token

```fish
set RECEPTIONIST_TOKEN (curl -s -D - -o /dev/null -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "receptionist.maya@curenet.local",
    "password": "Reception123"
  }' \
  | string match -r '.*curenet_auth=([^;]+).*' \
  | string replace -r '.*curenet_auth=' '' \
  | string replace -r ';.*' '')
```

## 4. Verify A Token

Use the profile endpoint to confirm the token works.

Example:

```fish
curl -s http://localhost:5000/api/auth/profile \
  -H "Authorization: Bearer $DOCTOR_TOKEN"
```

If the token is valid, the API returns the logged-in user profile.

## 5. Run The Integration Tests

The integration tests live in:

- [integration.test.mjs](/home/sanzid/playground/curenet/backend/tests/integration.test.mjs)

Run them from the `backend` directory.

### Example in `fish`

```fish
cd /home/sanzid/playground/curenet/backend

env \
  RUN_BACKEND_INTEGRATION=1 \
  TEST_BASE_URL=http://localhost:5000 \
  TEST_PATIENT_TOKEN="$PATIENT_TOKEN" \
  TEST_DOCTOR_TOKEN="$DOCTOR_TOKEN" \
  TEST_RECEPTIONIST_TOKEN="$RECEPTIONIST_TOKEN" \
  TEST_DOCTOR_ID="3" \
  TEST_APPOINTMENT_DATE="2026-04-11" \
  TEST_RESCHEDULE_DATE="2026-04-13" \
  TEST_APPOINTMENT_WINDOW="morning" \
  TEST_RESCHEDULE_WINDOW="evening" \
  TEST_CONCURRENCY_DATE="2026-04-14" \
  TEST_CONCURRENCY_WINDOW="morning" \
  npm test
```

## 6. Important Notes

- `TEST_DOCTOR_ID` must be the doctor profile ID, not the user ID.
- In the seeded local data, `doctor.asha@curenet.local` currently maps to doctor profile ID `3`.
- The example dates above intentionally match doctor `3` availability:
  - `2026-04-11` is a Saturday and supports `morning`
  - `2026-04-13` is a Monday and supports `evening`
  - `2026-04-14` is a Tuesday and supports `morning`
- If the receptionist login fails, rerun:

```bash
cd backend
npm run create-demo-users
```

- If a test is skipped, it usually means one of the required env vars is missing.

## 7. What The Integration Tests Cover

Current flows include:

- health endpoint check
- auth register/login/profile/logout/reset-invalid flow
- RBAC block for admin routes
- appointment create and status transitions
- patient reschedule flow
- receptionist reschedule flow
- duplicate booking prevention scenario
