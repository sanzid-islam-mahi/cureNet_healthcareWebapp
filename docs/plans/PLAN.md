# Medication Reminder + Email Verification Plan

## Summary
Build a patient medication reminder system on top of the current prescription flow, using `in-app notifications + email` for delivery, a `dedicated worker` for scheduled execution, and `email verification required before login` in normal environments with a `development-only bypass toggle`.

The reminder system should not infer exact reminder times directly from doctor-entered frequency text alone. Instead, the doctor keeps entering the prescription frequency as today, and the patient gets a reminder setup flow that proposes smart default times based on that frequency, then confirms or edits the exact reminder schedule. Patients must also be able to mark medicines as taken from the app, including repeated action clicks across the day for multi-dose medicines.

## Implementation Changes

### 1. Auth and email verification
- Add persistent email verification state to users:
  - `emailVerifiedAt` nullable timestamp
  - optional `emailVerificationRequired` behavior controlled by environment
- Add a verification-code/token model and lifecycle separate from password reset:
  - code/token value, user id, purpose, expiresAt, consumedAt, retry/attempt metadata
- Change registration flow:
  - create account in unverified state
  - send verification code by email
  - do not issue a usable login session in normal environments until verification succeeds
- Add auth endpoints for:
  - `POST /api/auth/verify-email`
  - `POST /api/auth/resend-verification-code`
  - optional `GET /api/auth/verification-status` if needed by frontend boot flow
- Change login flow:
  - if verification is required and user is unverified, reject login with a dedicated error code the frontend can route on
- Add a development toggle:
  - recommended env var such as `AUTH_ALLOW_UNVERIFIED_LOGIN=true` for local/dev only
  - in production/staging default to verification required
- Keep password reset separate from verification so the flows do not share state or tokens

### 2. Email infrastructure
- Introduce a mail service abstraction in backend:
  - provider adapter interface
  - template helpers for verification codes and medication reminders
- Start with SMTP-compatible transport or a provider-friendly abstraction so deployment can move later without rewriting business logic
- Required mail types in v1:
  - email verification code
  - resend verification code
  - medication reminder email
  - optional missed-dose summary email only if explicitly implemented, otherwise out of scope for v1
- Add environment-based configuration for provider credentials, sender identity, and app base URL
- Make email sending async-safe:
  - failures should be logged and persisted for retry where appropriate
  - auth/verification state must not silently succeed if verification email dispatch fails during required-verification flows without a clear recovery path

### 3. Reminder data model
- Keep existing `Prescription.medicines` as the source medication list
- Add new normalized reminder entities rather than overloading prescription JSON:
  - `MedicationReminderPlan`
    - patientId, prescriptionId, appointmentId, medicine key/index snapshot, medicine display fields, frequency label, status, timezone, start/end dates
  - `MedicationReminderDose`
    - reminderPlanId, scheduledAt, status (`scheduled`, `sent`, `taken`, `missed`, `skipped`), sentAt, takenAt, source channel flags, metadata
- Snapshot the relevant medicine fields onto the reminder plan so edits to later prescriptions do not corrupt historical reminder execution
- Support one reminder plan per medicine, with many scheduled dose rows generated from the confirmed schedule
- Use patient-local timezone as a first-class field on reminder plans; do not schedule purely in server time

### 4. Reminder creation UX and APIs
- Add a patient reminder-setup flow from prescription history and/or prescription detail views
- Reminder setup behavior:
  - parse medicine frequency into a coarse category when possible (`once daily`, `twice daily`, `three times daily`, `every X hours`, etc.)
  - present smart suggested times to the patient based on that category
  - require explicit confirmation/edit of actual reminder times before activation
- Add APIs for:
  - create reminder plan from a prescription medicine
  - preview generated schedule before saving
  - update reminder times / pause / resume / stop
  - list active reminder plans and upcoming doses
  - mark a dose taken
  - optionally mark skipped
- The “taken” interaction should support repeated clicks across the day by targeting individual dose records, not a single one-time medicine state
- Frontend should render actions at the dose level:
  - upcoming
  - due now
  - taken
  - missed
- Prevent duplicate “taken” submissions for the same dose with idempotent backend handling

### 5. Reminder execution architecture
- Use a dedicated worker process/container for reminder execution
- Worker responsibilities:
  - poll due dose records
  - deliver in-app notification records
  - send reminder emails
  - update delivery state atomically
  - mark overdue unsatisfied doses as missed after a defined grace window
- API process should remain stateless and must not own the scheduler loop
- For Docker deployment:
  - run separate `api` and `worker` services against the same database
  - Nginx sits in front of the API only
- For Azure deployment:
  - plan for API app/container + worker app/container separately
- For Cloudflare:
  - do not assume Cloudflare itself runs the worker; if fronted by Cloudflare, the reminder worker still needs a real compute runtime elsewhere
- Add locking/claiming in the worker so horizontally scaled workers do not send duplicate reminders

### 6. In-app notification behavior
- Reuse the existing notifications table/system for reminder delivery records to patients
- Add new notification types such as:
  - `medication_reminder_due`
  - `medication_dose_missed`
  - `medication_plan_started`
- Current repo has no realtime socket/SSE layer
- For v1, do not block on sockets:
  - unread bell and notifications page continue to work through polling/refetch
- If realtime is added later, layer it on top of the same persisted notifications rather than making sockets the source of truth

### 7. Frontend flows
- Auth:
  - registration ends in “check your email / enter code”
  - login handles “email not verified” cleanly and routes to verification UI
  - dev mode can bypass this only when backend env toggle allows it
- Patient:
  - prescription history/detail pages gain “Set reminder”
  - reminder wizard shows suggested times from frequency, then editable exact times
  - reminders dashboard shows active medications, next doses, overdue doses, taken history
  - dose cards expose `Taken` action on each scheduled dose
- Optional but recommended:
  - add patient timezone selection in profile if no reliable timezone exists today
- Doctor:
  - no major workflow change in v1 beyond continuing to enter prescription frequency as they do now

## Public API / Interface Changes
- New auth endpoints for email verification and resend
- Login/register behavior changes:
  - unverified accounts cannot log in unless development bypass is enabled
- New reminder endpoints for:
  - plan creation
  - plan editing
  - schedule preview
  - dose list
  - mark taken / skip
- New backend env/config surface:
  - email provider settings
  - sender identity
  - app URL
  - `AUTH_ALLOW_UNVERIFIED_LOGIN`
  - worker polling interval / reminder grace window / timezone defaults

## Test Plan
- Auth:
  - register creates unverified account and verification token/code
  - verify-email marks user verified
  - resend invalidates or supersedes prior code according to chosen token policy
  - login blocked for unverified users in normal mode
  - login allowed in dev when bypass toggle is enabled
- Reminder creation:
  - patient can create reminder plans only for their own prescriptions
  - preview returns suggested schedule based on frequency category
  - saving plan creates dose rows with exact confirmed times
- Reminder execution:
  - worker claims due doses once
  - creates notification rows
  - sends email once per due dose
  - does not duplicate sends on retries or multiple workers
  - transitions overdue doses to missed correctly
- Dose actions:
  - marking taken updates one specific dose only
  - repeated doses on the same day remain independently actionable
  - duplicate taken clicks are idempotent
- Permissions:
  - doctors cannot manage patient reminder plans
  - patients cannot create reminders for another patient’s prescriptions
- Deployment:
  - API works without worker
  - reminders do not execute without worker, but data APIs remain valid
  - worker can run independently against the shared DB

## Assumptions and Defaults
- Use persisted DB scheduling, not in-memory timers
- Use a dedicated worker container/process, not API-embedded cron
- Use in-app notifications plus email for v1 delivery
- Realtime sockets/SSE are out of scope for v1; polling over persisted notifications remains the delivery surface in the UI
- Verification-before-login is the default production behavior
- A development-only env toggle exists to bypass verification locally
- Reminder times are patient-confirmed exact times generated from smart frequency suggestions, not hard-guessed from free-text alone
- Cloudflare is treated as edge/proxy/CDN in front of deployed services, not as the primary reminder execution runtime
