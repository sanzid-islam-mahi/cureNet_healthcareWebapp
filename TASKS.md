# CureNet Tasks

## Current Priorities

- [x] Align README route documentation with the actual frontend routes and feature set.
(done)
- [x] Add frontend route-level code splitting to reduce the large initial JS bundle.
- [ ] Strengthen backend integration coverage so `npm test` validates real API behavior, not mostly skipped cases.
- [x] Improve auth/session security beyond `localStorage` token storage.

## Feature Work

- [x] Build the missing doctor patient management area behind `/app/doctor-my-patients` instead of the previous placeholder.
- [x] Add richer admin user management flows for activation, deactivation, and role oversight.
- [x] Expand doctor availability management UX for chamber windows, blocked dates, and schedule exceptions.
- [x] Improve appointment booking UX around triage warnings, profile completeness prompts, and slot selection.
- [x] Add prescription history views for patients and continuity-of-care views for doctors.
- [x] Add appointment notifications for key transitions such as approval, rejection, cancellation, and completion.

## Evaluation Readiness

### Core Requirements

- [x] User authentication and authorization:
  multi-role access, secure login/logout, password reset, and account management are implemented.
- [x] Patient management:
  formalize medical history tracking as a clearer longitudinal patient record instead of leaving it spread across appointments, prescriptions, and profile details.
- [x] Doctor dashboard:
  appointment management, patient record access, and prescription workflows are implemented.
- [ ] Administrative features:
  strengthen hospital/clinic management so it is a real module, not just scattered admin settings and doctor availability data.

### Additional Features

- [x] Medication tracking and reminders:
  reminder plans, doses, worker execution, in-app notifications, and email delivery are implemented.
- [ ] Health monitoring dashboard:
  decide whether to formalize this as a real patient health dashboard or stop claiming it as a rubric feature.
- [ ] Add one more clearly demonstrable additional feature from the rubric.
  Recommended options:
  laboratory test results integration
  medical imaging upload and viewing

### Presentation Readiness

- [ ] Prepare a requirement-to-feature mapping in the README for evaluation/demo use.
- [ ] Add a formal "Medical History" patient view that explicitly shows diagnoses, prescriptions, allergies, chronic conditions, and prior appointments.
- [ ] Add a formal "Clinic Management" admin view for clinic profile, departments, chambers/locations, and operating settings.

## Backend Hardening

- [ ] Break large controllers into smaller service-oriented modules to reduce feature coupling.
- [ ] Add stronger validation at the route boundary for appointment, profile, and admin payloads.
- [ ] Review and tighten authorization checks across doctor, patient, and admin endpoints.
- [ ] Separate migration execution from normal app startup for production deployment safety.
- [ ] Add better audit coverage for admin actions and sensitive profile changes.

## Frontend Hardening

- [ ] Standardize API hooks around React Query to avoid scattered request logic across pages.
- [ ] Reduce duplicated role and route assumptions by centralizing app navigation config.
- [ ] Improve loading, empty, and error states for dashboard and appointment-heavy screens.
- [ ] Audit form validation consistency across login, registration, profile, and booking flows.
- [ ] Add end-to-end tests for critical user journeys.

## Performance

- [ ] Split heavy admin and dashboard screens into lazy-loaded route chunks.
- [ ] Audit large static assets and compress or replace oversized images where possible.
- [ ] Review expensive dashboard queries and add pagination or tighter limits where needed.

## Quality And Ops

- [ ] Add a root-level workspace README section for common commands across frontend and backend.
- [ ] Add CI steps for backend tests, frontend lint, and frontend production build.
- [ ] Add seed/dev fixture tooling for local role-based testing.
- [ ] Document required test environment variables and expected local setup for integration tests.

## Notes

- Use this file as the implementation queue.
- When starting a feature, move it into an "In Progress" section or mark it complete here.
