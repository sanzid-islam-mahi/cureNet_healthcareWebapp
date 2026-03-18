# CureNet Frontend

This application is the React frontend for CureNet. It provides the public website, authentication flows, and role-based app experiences for patients, doctors, and administrators.

## Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS
- React Router
- React Query
- Axios

## Development

```bash
cp .env.example .env
npm install
npm run dev
```

Default local URL:

- `http://localhost:5173`

## Environment

Optional environment variables:

- `VITE_API_URL` to override the default API base URL of `http://localhost:5000/api`

## Available Commands

```bash
npm run dev
npm run build
npm run lint
npm run preview
```

## Application Areas

### Public

- Landing page
- About and contact pages
- Login and registration
- Forgot password and reset password
- Doctor discovery and doctor profile view

### Authenticated

- Patient dashboard, profile, and appointments
- Doctor dashboard, profile, appointments, and patient context views
- Admin dashboard, user management, doctor management, patient management, analytics, and logs

## Routing

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

### App Routes

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
- `/app/admin-analytics`
- `/app/admin-logs`

## Notes

- Authentication state is managed through the shared auth context in `src/context/AuthContext.tsx`.
- API calls are made against the backend through Axios and React Query.
- Production verification should include at least `npm run build` and `npm run lint`.
