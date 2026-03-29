# Admin Implementation Plan

This plan covers the admin scope, backend changes, and frontend pages so the CureNET admin dashboard matches the intended design (Figma-inspired) and supports user management, doctor approval, active/inactive users, analytics, and audit logs.

---

## 1. Professional field (scope) – what admin does

| Area | Responsibility |
|------|----------------|
| **User management** | Create users (admin, patient, doctor). Edit existing users (profile fields, role). Set any user **active** or **inactive**; only active users can log in. |
| **Doctor approval** | List doctors with status (Verified / Pending). **Verify** or **Unverify** doctors. Only **verified** doctors appear in the public/patient doctors list and can be booked for appointments. |
| **Patient overview** | List patients with key info (name, ID, last visit, status). View details; optional “Reports” later (lab out of scope). |
| **Appointment oversight** | View today’s and recent appointments (completed / pending). No lab “reports generated” in scope. |
| **Analytics** | See analytics (e.g. appointments over time, by status/type, completion rate). |
| **Audit logs** | See system audit logs (login, doctor verified/unverified, user created/updated, prescription created, etc.). |
| **Quick actions** | Add user (admin/patient/doctor), Verify doctors (link to doctor management), optional placeholders for “Generate report” and “Hospital settings” (can be UI-only initially). |

**Out of scope (per project):** Lab reports, lab tests, “Reports generated” as a real metric. Design may show “Reports generated”; we treat it as a placeholder .

---

## 2. Current state vs target

| Item | Current | Target |
|------|---------|--------|
| **User.isActive** | Exists; login and auth middleware reject inactive users | Keep; add admin API to set active/inactive. |
| **Doctor verification** | No `verified` flag; all doctors listed | Add `Doctor.isVerified` (or `verified`); only verified doctors in `GET /doctors`. Admin verify/unverify. |
| **Admin stats** | totalUsers, totalDoctors, totalPatients, totalAppointments | Add: pending doctor count, today’s appointments, completed today, optional placeholder “reports”. |
| **Admin users** | No API | List users (paginated, filter by role), create user (admin/patient/doctor), update user, set active/inactive. |
| **Admin doctors** | GET doctor-verifications only | Add: verify, unverify. List with status; search by name/email/department. |
| **Admin patients** | Placeholder | List patients (from User + Patient); search; show active status; view (link to profile or modal). |
| **Analytics** | Stub (empty counts) | Real appointment analytics: by status, by type, daily counts for period. |
| **Audit logs** | None | New model + write on: login, doctor verify/unverify, user create/update, prescription create (optional). Admin reads logs (list, filter by type/date). |

---

## 3. Backend implementation

### 3.1 Migration: Doctor verification

- **File:** `backend/src/migrations/YYYYMMDDHHMMSS-doctor-verified.mjs`
- **Up:** Add column `doctors.verified` BOOLEAN DEFAULT false (or true for existing rows so current doctors stay visible until you decide).
- **Down:** Remove column.

### 3.2 Doctor model and listing

- **Model:** Add `verified: { type: DataTypes.BOOLEAN, defaultValue: false }` to Doctor.
- **GET /api/doctors (public/patient list):** In `doctorsController.list`, add `where.verified = true` so only verified doctors are listed for booking.
- **Admin:** Do **not** filter by verified when listing for admin (admin sees all doctors and their status).

### 3.3 Admin API (all under `/api/admin`, admin-only)

| Method | Route | Purpose |
|--------|--------|--------|
| GET | `/stats` | Extend response: totalDoctors, totalPatients, totalAppointments, totalUsers, **pendingDoctorCount**, **todayAppointments**, **completedToday**, **pendingToday** (optional: reportsGenerated placeholder). |
| GET | `/users` | List users (paginated). Query: `page`, `limit`, `role`, `search` (email/name), `isActive`. Return users (no password) with role, isActive; include doctorId/patientId if present. |
| POST | `/users` | Create user (admin, patient, or doctor). Body: email, password, firstName, lastName, role, phone?, … For doctor: create Doctor row with verified false. |
| PUT | `/users/:id` | Update user (profile fields, role). Allow set **isActive**. If role changed to/from doctor, create/remove Doctor row as needed. |
| PATCH | `/users/:id/active` | Set isActive true/false (convenience endpoint; or use PUT /users/:id with body { isActive }). |
| GET | `/doctors` or reuse `/doctor-verifications` | List all doctors for admin (with User). Include **verified**. Support query: search, department, verified (true/false). |
| PUT | `/doctors/:id/verify` | Set doctor.verified = true. |
| PUT | `/doctors/:id/unverify` | Set doctor.verified = false. |
| GET | `/patients` | List patients (User where role=patient + Patient). Paginated, search. Return user + patient info, isActive. |
| GET | `/analytics/appointments` | Real implementation: aggregate appointments by date range, status, type; return daily counts, statusCounts, typeCounts. |
| GET | `/logs` | List audit logs. Query: type, from, to, limit. Paginated. |
| POST | (internal) | Audit log helper: write log (action, userId, entityType, entityId, details, ip?). Call on login, verify/unverify, user create/update, etc. |

### 3.4 Audit log model and wiring

- **Model:** `AuditLog` (or `audit_logs`): id, action (string), userId (nullable), entityType (string, e.g. 'user','doctor'), entityId (nullable), details (JSON or text), ip (optional), createdAt.
- **Migration:** Create table.
- **Helper:** `logAudit({ action, userId, entityType, entityId, details, ip })`. Call from:
  - Auth: on login (action: 'user_login', userId, details: { email }).
  - Admin: on user create/update (action: 'user_created' / 'user_updated'), doctor verify/unverify (action: 'doctor_verified' / 'doctor_unverified').
  - Optionally: prescription create (action: 'prescription_created').

### 3.5 Auth

- **Login:** Already reject if `!user.isActive`. Keep message e.g. “Account is deactivated”.
- **Token validation (middleware):** Already check isActive. No change.

---

## 4. Frontend implementation (Figma-inspired)

### 4.1 Admin dashboard (`/app/admin-dashboard`)

- **Welcome banner:** “Good Morning, Admin” (or time-based), subtitle “Welcome to the Healthcare Admin Dashboard. Manage doctors, patients, and system operations.” Use blue banner style.
- **Stat cards (6):**  
  Total Doctors (with “X pending verification”), Total Patients (“Active users”), Today’s Appointments (“X in progress”), Completed Today (“X% completion rate”), Pending Appointments (“scheduled for today”), Reports Generated (placeholder “— this month” or hide).
- **Quick actions:** Buttons: Add User (→ modal or /app/users with create), Verify Doctors (→ /app/admin-doctors?pending=true), Generate Report (placeholder), Hospital Settings (placeholder), System Analytics (→ /app/admin-analytics or section below).
- **Doctor management (table):** Section title “Doctor management”, search input “Search doctors…”. Columns: Doctor (name + email), ID (e.g. DR-{id}), Specialization (department), License (bmdcRegistrationNumber), Experience, Patients (count from appointments or placeholder), Status (Verified / Pending pill), Actions (View, Edit, Delete icons). Link “Verify” in quick actions to this section or to admin-doctors with filter.
- **Patient overview (cards or table):** Section “Patient overview”, “Search patients…”. Cards: avatar/initials, name, ID (PT-{id}), age, last visit (last appointment date), “Reports” (placeholder), Active pill, View / Reports / menu. Reuse or link to Admin Patients page.
- **Appointment management:** Tabs “Completed today” / “Pending”. List appointments: patient name, ID, doctor, time, type, duration, “Report uploaded” pill for completed (optional). Data from GET appointments for today (admin endpoint or reuse analytics).
- **System audit logs:** Section “System audit logs”. Columns: icon/type, description, user/entity, date/time, details (e.g. IP), category tag. Data from GET /admin/logs.

**Data:**  
- Stats from GET /admin/stats (extended).  
- Doctors from GET /admin/doctor-verifications (or GET /admin/doctors) with verify/unverify actions.  
- Patients from GET /admin/patients.  
- Appointments from GET /admin/analytics/appointments or new GET /admin/appointments?date=today.  
- Logs from GET /admin/logs.

### 4.2 Users page (`/app/users`)

- List users (table): email, name, role, status (Active/Inactive), actions (Edit, Toggle active).
- “Add user” button → modal or separate page: form (email, password, firstName, lastName, role: admin/patient/doctor; if doctor, optional BMDC/department). POST /admin/users.
- Edit user: modal or inline edit (name, email, role, isActive). PUT /admin/users/:id. Optionally PATCH /admin/users/:id/active for toggle.

### 4.3 Admin Doctors page (`/app/admin-doctors`)

- Replace placeholder. Table: same as dashboard “Doctor management” (search, columns, Verified/Pending, actions).
- Verify / Unverify buttons per row (or in row menu). Call PUT /admin/doctors/:id/verify and PUT /admin/doctors/:id/unverify.
- Optional: View (navigate to doctor profile or read-only modal), Edit (navigate or modal for doctor profile fields).

### 4.4 Admin Patients page (`/app/admin-patients`)

- Replace placeholder. List patients (cards or table): name, ID, age, last visit, active status, View.
- Search. Data from GET /admin/patients. Optional: “Set active/inactive” if we expose user id.

### 4.5 Analytics page or section

- Route: `/app/admin-analytics` or a tab/section on dashboard.
- Charts/summary from GET /admin/analytics/appointments: daily counts, status breakdown, type breakdown. Use simple bars or numbers; optional chart library.

### 4.6 Audit logs page or section

- Route: `/app/admin-logs` or section on dashboard.
- Table or list from GET /admin/logs. Filters: type (e.g. authentication, user-management, doctor), date range. Show: action, user/entity, time, details, category.

### 4.7 Layout and nav

- Admin nav already has Dashboard, Users, Doctors (admin-doctors), Patients (admin-patients). Add “Analytics” and “Logs” if separate pages, or keep as dashboard sections.
- Style: align with Figma (blue banner, white cards, pills for status, table with search). Use existing Tailwind and app color (#3990D7 etc.).

---

## 5. Implementation order

| Step | Task | Notes |
|------|------|--------|
| 1 | Migration: add `doctors.verified` | Default false for new; optionally true for existing. |
| 2 | Doctor model + list filter | Add verified to model. In list (public), filter by verified. |
| 3 | Admin: extend stats, verify/unverify | getStats: pending doctors, today’s appointments, completed today. Routes: PUT verify, PUT unverify. |
| 4 | Admin: users list, create, update, active | GET/POST /admin/users, PUT /admin/users/:id, set isActive. |
| 5 | Admin: doctors list (all) with search | GET /admin/doctors or extend doctor-verifications; include verified; query params. |
| 6 | Admin: patients list | GET /admin/patients, paginated + search. |
| 7 | Admin: analytics (real) | Implement getAppointmentAnalytics with real Appointment aggregates. |
| 8 | Audit log model + migration | Create table; helper; call on login, user create/update, verify/unverify. |
| 9 | Admin: GET /admin/logs | List logs with filters. |
| 10 | Frontend: Admin dashboard redesign | Welcome banner, 6 stat cards, quick actions, doctor table, patient cards, appointments tabs, audit logs section. |
| 11 | Frontend: Users page | List, add user modal, edit, toggle active. |
| 12 | Frontend: Admin Doctors page | Table, verify/unverify, search. |
| 13 | Frontend: Admin Patients page | List, search, view. |
| 14 | Frontend: Analytics + Logs | Pages or dashboard sections; wire to APIs. |

---

## 6. Out of scope (per project)

- Lab reports, lab tests, “Reports generated” as real data.
- Hospital settings (can be a dead link or placeholder).
- “Generate report” can be UI-only or export CSV of users/doctors/appointments later.

---

## 7. File checklist

**Backend**

- `src/migrations/YYYYMMDDHHMMSS-doctor-verified.mjs`
- `src/migrations/YYYYMMDDHHMMSS-audit-logs.mjs`
- `src/models/Doctor.js` (add verified)
- `src/models/AuditLog.js` (new)
- `src/controllers/adminController.js` (extend stats, users CRUD, doctors verify/unverify, patients list, analytics, logs)
- `src/routes/admin.js` (new routes)
- `src/controllers/authController.js` (call audit log on login; ensure isActive check kept)
- `src/controllers/doctorsController.js` (list: where.verified = true for public list)

**Frontend**

- `src/pages/AdminDashboard.tsx` (redesign)
- `src/pages/AdminUsers.tsx` (new, or replace Users placeholder)
- `src/pages/AdminDoctors.tsx` (new, or replace admin-doctors placeholder)
- `src/pages/AdminPatients.tsx` (new, or replace admin-patients placeholder)
- `src/pages/AdminAnalytics.tsx` (optional if not embedded in dashboard)
- `src/pages/AdminLogs.tsx` (optional if not embedded in dashboard)
- `App.tsx` (wire routes)
- `Layout.tsx` (admin nav links if needed)

This plan aligns the admin area with the Figma design and your requirements: one place to manage users (create/edit, active/inactive), approve doctors (only verified in appointments list), and see analytics and logs.
