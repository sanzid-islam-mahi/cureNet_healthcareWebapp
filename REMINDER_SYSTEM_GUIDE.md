# CureNet Medication Reminder System Guide

This document explains the medication reminder system from start to finish.

It is written for learning and maintenance:
- what the feature does
- how data moves through the system
- which file does what
- which API returns what
- when the worker sends reminders
- which models exist and why
- how notifications and email fit in
- how to debug the system when reminders do not appear

## 1. Big Picture

The reminder system is built around one idea:

1. a doctor writes a prescription
2. a patient chooses one medicine from that prescription
3. the patient creates a reminder plan for that medicine
4. the backend expands that plan into many reminder doses
5. a worker process checks due doses on a schedule
6. when a dose becomes due, the worker:
   - marks it as `sent`
   - creates an in-app notification
   - tries to send an email
7. if the patient does not mark that dose taken within the grace window, the worker marks it `missed`

This means the system is not based on ad hoc timers in the browser. It is database-driven.

## 2. Main Concepts

There are two reminder-specific models:

### `MedicationReminderPlan`
One plan represents one medicine from one prescription.

Why it exists:
- the patient may want reminders for only some medicines, not the whole prescription
- the patient may choose exact reminder times that differ from the doctor’s wording
- the system needs a stable parent record for pause, resume, stop, edit, and history

Example meaning:
- prescription `#12`
- medicine at `medicineIndex = 1`
- remind at `08:00` and `20:00`
- for `2026-03-26` to `2026-03-30`

### `MedicationReminderDose`
One dose is one scheduled reminder event.

Why it exists:
- a medicine can have many reminder events
- each event can be independently `scheduled`, `sent`, `taken`, `missed`, or `skipped`
- the worker needs concrete rows to process
- the patient needs dose-level adherence history

Example meaning:
- take Napa on `2026-03-27` at `08:00`
- this dose was sent at `08:01`
- later it was marked taken at `08:10`

## 3. File Map

### Backend reminder domain

- [backend/src/models/MedicationReminderPlan.js](/home/sanzid/playground/curenet/backend/src/models/MedicationReminderPlan.js)
  - Sequelize model for reminder plans
- [backend/src/models/MedicationReminderDose.js](/home/sanzid/playground/curenet/backend/src/models/MedicationReminderDose.js)
  - Sequelize model for dose rows
- [backend/src/migrations/000016-medication-reminders.mjs](/home/sanzid/playground/curenet/backend/src/migrations/000016-medication-reminders.mjs)
  - creates the reminder tables
- [backend/src/lib/reminders.js](/home/sanzid/playground/curenet/backend/src/lib/reminders.js)
  - pure scheduling helpers
  - frequency inference
  - dose generation
  - replenishment window calculation
- [backend/src/controllers/remindersController.js](/home/sanzid/playground/curenet/backend/src/controllers/remindersController.js)
  - API logic for preview, create, update, list, mark taken, pause/resume/stop
- [backend/src/routes/reminders.js](/home/sanzid/playground/curenet/backend/src/routes/reminders.js)
  - Express routes for the reminder API
- [backend/src/index.js](/home/sanzid/playground/curenet/backend/src/index.js)
  - mounts the reminder API at `/api/reminders`

### Worker and delivery

- [backend/src/lib/reminderWorker.js](/home/sanzid/playground/curenet/backend/src/lib/reminderWorker.js)
  - the worker logic
  - replenishes future doses
  - processes due doses
  - processes missed doses
- [backend/src/reminder-worker.js](/home/sanzid/playground/curenet/backend/src/reminder-worker.js)
  - standalone worker process entrypoint
- [backend/src/lib/mail.js](/home/sanzid/playground/curenet/backend/src/lib/mail.js)
  - sends reminder email
- [backend/src/lib/notifications.js](/home/sanzid/playground/curenet/backend/src/lib/notifications.js)
  - creates persisted notifications and emits live events
- [backend/src/models/Notification.js](/home/sanzid/playground/curenet/backend/src/models/Notification.js)
  - notification database model
- [backend/src/controllers/notificationsController.js](/home/sanzid/playground/curenet/backend/src/controllers/notificationsController.js)
  - notification list/read API and SSE stream

### Frontend patient flow

- [frontend/src/pages/PatientPrescriptionHistory.tsx](/home/sanzid/playground/curenet/frontend/src/pages/PatientPrescriptionHistory.tsx)
  - patient can open `Set reminder` or `Edit reminder` per medicine
- [frontend/src/components/PrescriptionView.tsx](/home/sanzid/playground/curenet/frontend/src/components/PrescriptionView.tsx)
  - patient can open full prescription details
- [frontend/src/components/ReminderSetupModal.tsx](/home/sanzid/playground/curenet/frontend/src/components/ReminderSetupModal.tsx)
  - create/edit reminder modal
  - schedule preview UI
- [frontend/src/pages/PatientReminders.tsx](/home/sanzid/playground/curenet/frontend/src/pages/PatientReminders.tsx)
  - reminder plans page
  - today’s medicines
  - dose history
- [frontend/src/components/Navbar.tsx](/home/sanzid/playground/curenet/frontend/src/components/Navbar.tsx)
  - opens live notification modal
- [frontend/src/components/NotificationCenterModal.tsx](/home/sanzid/playground/curenet/frontend/src/components/NotificationCenterModal.tsx)
  - modern modal-based notification center

## 4. The Data Model in Detail

### 4.1 `MedicationReminderPlan`

Defined in [MedicationReminderPlan.js](/home/sanzid/playground/curenet/backend/src/models/MedicationReminderPlan.js).

Fields:
- `id`
- `patientId`
  - the patient who owns the reminder
- `prescriptionId`
  - the prescription this reminder came from
- `appointmentId`
  - linked appointment if available
- `medicineIndex`
  - which medicine inside `prescription.medicines[]` this plan belongs to
- `medicineName`
  - snapshot for stable display
- `dosage`
  - snapshot for stable display
- `frequencyLabel`
  - doctor-entered frequency string, such as `BD` or `Twice daily`
- `instructions`
  - snapshot of reminder-relevant instruction text
- `status`
  - one of:
    - `active`
    - `paused`
    - `stopped`
- `timezone`
  - patient-selected timezone string
- `startDate`
- `endDate`
- `scheduleTimes`
  - exact daily reminder times in `HH:MM`
- `lastGeneratedAt`
  - tracks replenishment activity

Why some fields are copied from the prescription:
- prescriptions can change later
- the reminder still needs stable historical meaning
- dose notifications should still say the correct medicine name even if the source prescription is updated later

### 4.2 `MedicationReminderDose`

Defined in [MedicationReminderDose.js](/home/sanzid/playground/curenet/backend/src/models/MedicationReminderDose.js).

Fields:
- `id`
- `reminderPlanId`
- `scheduledAt`
  - exact timestamp for this dose
- `status`
  - one of:
    - `scheduled`
    - `sent`
    - `taken`
    - `missed`
    - `skipped`
- `sentAt`
  - when worker actually sent it
- `takenAt`
  - when patient marked it taken
- `skippedAt`
  - reserved for skip support
- `channelState`
  - can hold per-channel delivery info later
- `metadata`
  - currently used for compact schedule info like:
    - `scheduledDate`
    - `scheduledTime`

Why doses are separate rows:
- easier worker processing
- easier missed/taken tracking
- easier today view
- easier adherence reporting

### 4.3 `Notification`

Defined in [Notification.js](/home/sanzid/playground/curenet/backend/src/models/Notification.js).

Reminder-related notifications currently use:
- `type: medication_reminder_due`
- `type: medication_dose_missed`

This is separate from reminder plans because notifications are delivery records, not schedule records.

## 5. Relationships

The reminder system sits on top of the existing clinical data:

- `User`
  - owns login/auth identity
- `Patient`
  - belongs to `User`
  - owns reminder plans
- `Appointment`
  - may be linked to the reminder plan through the original prescription flow
- `Prescription`
  - source of the medicine list
- `MedicationReminderPlan`
  - belongs to one patient and one prescription
- `MedicationReminderDose`
  - belongs to one reminder plan
- `Notification`
  - belongs to one user

In plain language:
- the prescription is the source
- the plan is the patient’s reminder setup
- the dose is the executable reminder event
- the notification is the delivery output

## 6. End-to-End Product Flow

### Step 1: doctor creates a prescription

This already exists in the appointment/prescription flow.

The reminder system reads from prescription medicines. It does not replace the prescription system.

The key detail is:
- a doctor enters clinical frequency like `OD`, `BD`, `Twice daily`, `Every 8 hours`
- the reminder system uses that as a suggestion, not the final schedule

### Step 2: patient opens prescription history

File:
- [frontend/src/pages/PatientPrescriptionHistory.tsx](/home/sanzid/playground/curenet/frontend/src/pages/PatientPrescriptionHistory.tsx)

What happens:
- the page loads prescription history from `/prescriptions/history/patient`
- it also loads reminder plans from `/reminders`
- it builds a lookup by `prescriptionId + medicineIndex`
- each medicine row shows either:
  - `Set reminder`
  - `Edit reminder`

Important design decision:
- reminders are per medicine, not per prescription

### Step 3: patient opens reminder setup modal

File:
- [frontend/src/components/ReminderSetupModal.tsx](/home/sanzid/playground/curenet/frontend/src/components/ReminderSetupModal.tsx)

What the modal does:
- chooses the medicine
- shows doctor instruction context
- shows planned duration
- lets patient choose exact daily times
- lets patient preview the generated doses
- lets patient create or edit the reminder plan

This is the core UX rule:
- doctor instruction tells the patient what the medicine schedule means clinically
- patient reminder times tell the system exactly when to send reminders

### Step 4: frontend calls preview API

Endpoint:
- `POST /api/reminders/preview`

Controller:
- [remindersController.js](/home/sanzid/playground/curenet/backend/src/controllers/remindersController.js)

Purpose:
- do not save anything yet
- show the patient what the schedule would look like

Typical request body:

```json
{
  "prescriptionId": 1,
  "medicineIndex": 0,
  "startDate": "2026-03-26",
  "endDate": "2026-03-30",
  "timezone": "Asia/Dhaka",
  "scheduleTimes": ["08:00", "20:00"]
}
```

Important behavior:
- if `scheduleTimes` is omitted, backend derives defaults from the medicine frequency
- this uses `resolveScheduleTimes(...)` in [reminders.js](/home/sanzid/playground/curenet/backend/src/lib/reminders.js)

Success response shape:

```json
{
  "success": true,
  "data": {
    "preview": {
      "medicineName": "Napa",
      "dosage": "500 mg 1 tablet",
      "frequencyLabel": "BD",
      "instructions": "After food",
      "timezone": "Asia/Dhaka",
      "startDate": "2026-03-26",
      "endDate": "2026-03-30",
      "scheduleTimes": ["08:00", "20:00"],
      "suggestedTimes": ["08:00", "20:00"],
      "usedFrequencyDefault": false,
      "generatedUntil": "2026-03-30",
      "doseCount": 10,
      "doses": [
        {
          "scheduledAt": "2026-03-26T08:00:00.000Z",
          "metadata": {
            "scheduledDate": "2026-03-26",
            "scheduledTime": "08:00"
          }
        }
      ]
    }
  }
}
```

Common error responses:
- `400`
  - invalid payload
  - invalid medicine index
  - missing start date
- `403`
  - patient tried to use another patient’s prescription
- `404`
  - prescription not found

### Step 5: frontend calls create API

Endpoint:
- `POST /api/reminders`

Controller:
- [remindersController.js](/home/sanzid/playground/curenet/backend/src/controllers/remindersController.js)

What it does:
- validates the request
- checks the prescription belongs to the logged-in patient
- extracts one medicine snapshot from the prescription
- resolves schedule times
- generates all dose rows
- creates one plan row
- bulk inserts dose rows

Success response:

```json
{
  "success": true,
  "data": {
    "reminderPlan": {
      "id": 1,
      "patientId": 2,
      "prescriptionId": 1,
      "appointmentId": 1,
      "medicineIndex": 0,
      "medicineName": "Napa",
      "dosage": "500 mg 1 tablet",
      "frequencyLabel": "BD",
      "instructions": "After food",
      "status": "active",
      "timezone": "Asia/Dhaka",
      "startDate": "2026-03-26",
      "endDate": "2026-03-30",
      "scheduleTimes": ["08:00", "20:00"],
      "doses": []
    }
  }
}
```

Possible errors:
- `400`
  - validation failure
- `403`
  - unauthorized prescription ownership
- `404`
  - prescription not found
- `409`
  - active or paused reminder already exists for that exact `prescriptionId + medicineIndex`

### Step 6: patient manages plans on reminder page

File:
- [frontend/src/pages/PatientReminders.tsx](/home/sanzid/playground/curenet/frontend/src/pages/PatientReminders.tsx)

This page loads:
- `GET /api/reminders`
- `GET /api/reminders/doses`

It shows:
- reminder plan cards
- today’s medicines
- recent dose history

It also allows:
- edit plan
- pause plan
- resume plan
- stop plan
- mark dose taken

## 7. API Endpoints and Responses

All reminder routes are defined in [backend/src/routes/reminders.js](/home/sanzid/playground/curenet/backend/src/routes/reminders.js).

They are:
- authenticated
- patient-only

### 7.1 `POST /api/reminders/preview`

Use:
- calculate a schedule before saving

Response:
- `success: true`
- `data.preview`

### 7.2 `POST /api/reminders`

Use:
- create a new reminder plan and its dose rows

Response:
- `success: true`
- `data.reminderPlan`

### 7.3 `PUT /api/reminders/:id`

Use:
- edit an existing plan

Important behavior:
- preserves historical doses already marked:
  - `taken`
  - `missed`
  - `skipped`
- deletes only pending future-like doses
- regenerates the schedule

Response:
- `success: true`
- `data.reminderPlan`

### 7.4 `GET /api/reminders`

Use:
- load reminder plans

Optional query:
- `status=active|paused|stopped`

Response:

```json
{
  "success": true,
  "data": {
    "reminderPlans": [
      {
        "id": 1,
        "medicineName": "Napa",
        "status": "active",
        "scheduleTimes": ["08:00", "20:00"],
        "prescription": {
          "appointment": {
            "doctor": {
              "firstName": "Sanzid",
              "lastName": "Islam"
            }
          }
        }
      }
    ]
  }
}
```

### 7.5 `GET /api/reminders/doses`

Use:
- load dose rows for the patient

Optional query:
- `status=scheduled|sent|taken|missed|skipped`

Response:

```json
{
  "success": true,
  "data": {
    "doses": [
      {
        "id": 12,
        "reminderPlanId": 1,
        "scheduledAt": "2026-03-27T08:00:00.000Z",
        "status": "taken",
        "sentAt": "2026-03-27T08:01:00.000Z",
        "takenAt": "2026-03-27T08:10:00.000Z",
        "metadata": {
          "scheduledDate": "2026-03-27",
          "scheduledTime": "08:00"
        },
        "plan": {
          "id": 1,
          "medicineName": "Napa"
        }
      }
    ]
  }
}
```

### 7.6 `POST /api/reminders/doses/:id/taken`

Use:
- mark one dose as taken

Important behavior:
- idempotent
- if already `taken`, API still returns success

Success response:
- `success: true`
- `data.dose`

### 7.7 `PUT /api/reminders/:id/pause`

Use:
- sets plan status to `paused`

Response:
- `success: true`
- `data.reminderPlan`

### 7.8 `PUT /api/reminders/:id/resume`

Use:
- sets plan status to `active`

Response:
- `success: true`
- `data.reminderPlan`

### 7.9 `PUT /api/reminders/:id/stop`

Use:
- sets plan status to `stopped`

Response:
- `success: true`
- `data.reminderPlan`

## 8. Scheduling Logic

The core scheduling code lives in [backend/src/lib/reminders.js](/home/sanzid/playground/curenet/backend/src/lib/reminders.js).

### 8.1 `inferScheduleTimesFromFrequency(frequencyLabel)`

Purpose:
- when patient does not provide exact times, use doctor frequency as a safe default suggestion

Examples:
- `OD` -> `["08:00"]`
- `BD` -> `["08:00", "20:00"]`
- `TDS` -> `["08:00", "14:00", "20:00"]`
- `QID` -> `["06:00", "12:00", "18:00", "22:00"]`
- `Every 8 hours` -> `["06:00", "14:00", "22:00"]`
- `At bedtime` -> `["22:00"]`

This is not the final truth for the patient. It is a default.

### 8.2 `resolveScheduleTimes(scheduleTimes, frequencyLabel)`

Rules:
- if patient provided explicit `scheduleTimes`, use them
- otherwise infer defaults from `frequencyLabel`

### 8.3 `buildDoseSchedule(...)`

Purpose:
- expand date range + daily times into actual dose rows

Input:
- `startDate`
- `endDate`
- `scheduleTimes`
- or `frequencyLabel`

Output:
- normalized `scheduleTimes`
- `generatedUntil`
- `doses[]`

Each generated dose contains:
- `scheduledAt`
- `metadata.scheduledDate`
- `metadata.scheduledTime`

### 8.4 `buildDoseReplenishmentWindow(...)`

Purpose:
- let the worker keep future scheduled doses stocked ahead of time

This is why the worker can keep reminders alive without generating infinite rows on day one.

## 9. Worker Architecture

The worker logic is split in two files:

- [backend/src/reminder-worker.js](/home/sanzid/playground/curenet/backend/src/reminder-worker.js)
  - process entrypoint
- [backend/src/lib/reminderWorker.js](/home/sanzid/playground/curenet/backend/src/lib/reminderWorker.js)
  - worker business logic

### 9.1 How the worker starts

Script:

```bash
cd backend
npm run reminder-worker
```

This script is defined in [backend/package.json](/home/sanzid/playground/curenet/backend/package.json).

On startup it:
1. loads env vars
2. connects to the database
3. runs migrations
4. enters the worker loop

### 9.2 Worker env vars

Defined in [backend/.env.example](/home/sanzid/playground/curenet/backend/.env.example):

- `REMINDER_WORKER_POLL_MS`
  - how often the loop runs
  - default `60000`
- `REMINDER_WORKER_BATCH_SIZE`
  - max rows processed per tick
  - default `25`
- `REMINDER_MISSED_GRACE_MINUTES`
  - how long after send before dose becomes missed
  - default `120`
- `REMINDER_REPLENISH_HORIZON_DAYS`
  - how far ahead to keep future doses generated
  - default `7`

Special debug env:
- `WORKER_RUN_ONCE=true`
  - runs one tick and exits

### 9.3 What happens in one worker tick

Main method:
- `runReminderWorkerOnce()`

Order:
1. `replenishActivePlans(now)`
2. `processDueReminderDoses(now)`
3. `processMissedReminderDoses(now)`

It logs:

```text
Reminder worker tick complete {
  timestamp: ...,
  replenishedDoses: ...,
  dueProcessed: ...,
  missedProcessed: ...
}
```

## 10. When the Worker Sends a Reminder

This is the most important part.

### 10.1 Due reminder send rule

The worker sends a due reminder when all of these are true:
- dose `status === 'scheduled'`
- `dose.scheduledAt <= now`
- dose belongs to a plan with `status === 'active'`

This check is in:
- `loadDueDoses(now)` inside [backend/src/lib/reminderWorker.js](/home/sanzid/playground/curenet/backend/src/lib/reminderWorker.js)

Then the worker:
1. tries to atomically claim the row by changing:
   - `scheduled -> sent`
2. inserts a notification
3. tries to send an email

This avoids duplicate send behavior when the worker loops again.

### 10.2 Missed reminder rule

The worker marks a dose missed when all of these are true:
- dose `status === 'sent'`
- `takenAt === null`
- `scheduledAt <= now - REMINDER_MISSED_GRACE_MINUTES`
- plan is still `active`

This check is in:
- `loadMissedDoses(cutoff)` inside [backend/src/lib/reminderWorker.js](/home/sanzid/playground/curenet/backend/src/lib/reminderWorker.js)

Then the worker:
1. changes `sent -> missed`
2. creates a `medication_dose_missed` notification

### 10.3 Replenishment rule

The worker also keeps future rows generated for active plans.

This happens in:
- `replenishActivePlans(now)`

It:
1. finds the latest scheduled dose for a plan
2. calculates what future date range needs to exist
3. bulk inserts new `scheduled` doses
4. updates `lastGeneratedAt`

Without this, long-running plans would run out of future doses.

## 11. Notification Flow

Reminder notifications are persisted and then pushed live.

### 11.1 Persisted notification

Function:
- `createNotification(...)`

File:
- [backend/src/lib/notifications.js](/home/sanzid/playground/curenet/backend/src/lib/notifications.js)

For due reminder:
- `type: medication_reminder_due`
- `title: Medication reminder`
- `message: Time to take ...`

For missed reminder:
- `type: medication_dose_missed`
- `title: Medication dose missed`

### 11.2 Live notification event

After creating the notification row, the backend emits an event:

```js
notificationEvents.emit(`user:${userId}`, payload)
```

That is what powers real-time UI updates.

### 11.3 SSE stream

Backend route:
- `GET /api/notifications/stream`

File:
- [backend/src/controllers/notificationsController.js](/home/sanzid/playground/curenet/backend/src/controllers/notificationsController.js)

It:
- opens an SSE stream
- sends heartbeat keep-alive messages
- listens for `user:${userId}` events
- pushes notification payloads to the browser in real time

### 11.4 Frontend live UI

Files:
- [frontend/src/components/Navbar.tsx](/home/sanzid/playground/curenet/frontend/src/components/Navbar.tsx)
- [frontend/src/components/NotificationCenterModal.tsx](/home/sanzid/playground/curenet/frontend/src/components/NotificationCenterModal.tsx)

What happens:
1. Navbar opens an `EventSource`
2. listens for `notification`
3. invalidates React Query caches:
   - `['notifications']`
   - `['notifications', 'summary']`
4. shows a toast
5. bell modal can show the fresh notification instantly

## 12. Email Flow

Reminder emails are sent from:
- [backend/src/lib/mail.js](/home/sanzid/playground/curenet/backend/src/lib/mail.js)

Function:
- `sendMedicationReminderEmail({ to, firstName, medicineName, scheduledAt })`

Email subject:

```text
Medication reminder: <medicineName>
```

### What the worker does

Inside `processDueReminderDoses(...)`:
1. create in-app notification first
2. if patient has an email:
   - call `sendMedicationReminderEmail(...)`

Important:
- email send failure does not cancel the already-created notification
- it logs a `Reminder email send error`
- reminder processing still counts as processed

### Success log meaning

If you see:

```text
Mail send result: {
  accepted: ['user@example.com'],
  rejected: [],
  response: '250 2.0.0 OK: queued ...'
}
```

that is not an error.

It means:
- your app connected to SMTP successfully
- the SMTP provider accepted the email
- the provider queued it for delivery

If the email is still not visible in inbox, the issue is now provider-side delivery, spam, or inbox classification.

## 13. Frontend Behavior in Detail

### 13.1 Prescription history page

File:
- [frontend/src/pages/PatientPrescriptionHistory.tsx](/home/sanzid/playground/curenet/frontend/src/pages/PatientPrescriptionHistory.tsx)

What it does:
- shows historical prescriptions
- shows medicines under each prescription
- shows whether each medicine already has an active/paused reminder
- opens reminder modal in create or edit mode

Why this matters:
- it keeps the reminder decision tied to the actual medication record

### 13.2 Reminder setup modal

File:
- [frontend/src/components/ReminderSetupModal.tsx](/home/sanzid/playground/curenet/frontend/src/components/ReminderSetupModal.tsx)

Key UX features:
- medicine picker
- suggested times from frequency
- editable exact times
- date range selection
- timezone selection
- preview schedule
- create/update mutation

### 13.3 Patient reminders page

File:
- [frontend/src/pages/PatientReminders.tsx](/home/sanzid/playground/curenet/frontend/src/pages/PatientReminders.tsx)

What it shows:
- reminder plan cards
- today’s medicines only in the right panel
- dose history below
- counts for:
  - active plans
  - today’s doses
  - taken doses
  - missed doses

Actions supported:
- edit
- pause
- resume
- stop
- mark today’s dose as taken

## 14. Status Lifecycle

### Plan lifecycle

- `active`
  - worker can generate, send, and mark missed
- `paused`
  - plan remains but worker does not process it
- `stopped`
  - plan remains historically but is effectively ended

### Dose lifecycle

Most common path:

1. `scheduled`
2. `sent`
3. `taken`

Missed path:

1. `scheduled`
2. `sent`
3. `missed`

Possible future path:

1. `scheduled`
2. `skipped`

## 15. Important Design Choices

### Why reminders are not generated directly from frequency text only

Because doctor frequency text is clinical language, not exact patient routine.

Example:
- doctor writes `BD`
- one patient wants `08:00 + 20:00`
- another may need `09:00 + 21:00`

So the system:
- uses doctor frequency as suggestion
- uses patient-selected exact times as execution truth

### Why the worker is a separate process

Because reminder delivery is background work.

The API server should not:
- sleep in memory
- hold timers for each reminder
- depend on one web instance staying alive

A separate worker is easier to:
- run in Docker
- scale later
- keep stable in deployment

## 16. Common Debugging Checklist

If a reminder is not showing or not sending, check in this order.

### A. Does the patient have a reminder plan?

Check:
- `GET /api/reminders`

Look for:
- `status: active`
- correct `medicineIndex`
- correct `scheduleTimes`
- correct `startDate` and `endDate`

### B. Were dose rows generated?

Check the database or:
- `GET /api/reminders/doses`

Look for:
- rows with `status: scheduled`
- `scheduledAt` values that should already be due

### C. Is the worker running?

Run:

```bash
cd backend
npm run reminder-worker
```

For one debug tick:

```bash
cd backend
WORKER_RUN_ONCE=true npm run reminder-worker
```

### D. Did the worker process any doses?

Look for log:

```text
Reminder worker tick complete {
  replenishedDoses: ...,
  dueProcessed: ...,
  missedProcessed: ...
}
```

If `dueProcessed: 0`, common reasons are:
- no due dose exists yet
- plan is paused/stopped
- due dose already moved out of `scheduled`

### E. Was a notification row created?

Check `notifications` table for:
- `medication_reminder_due`
- `medication_dose_missed`

### F. Is the user looking at the correct account?

Notifications are user-specific.

If reminder notifications exist for `userId: 4` but you are logged in as another user, you will not see them.

### G. Did SMTP accept the email?

Look for:

```text
Mail send result: {
  accepted: [...],
  rejected: [],
  response: '250 ... queued ...'
}
```

If `accepted` is populated, your app succeeded.

### H. Why live notification may still not feel visible

Even if backend works:
- notification may already be marked read
- browser may not have been open when the live event fired
- user may have closed the modal
- user may be logged into a different account

## 17. Real Current Behavior Summary

As the code stands now:
- patient creates reminders manually per medicine
- reminders are not auto-created from prescriptions
- worker sends due reminder notifications and emails
- worker marks stale sent doses as missed
- notification bell is live through SSE
- email is sent through SMTP

What the reminder system does not yet do:
- receptionist workflow
- auto-approval appointment coupling
- advanced adherence analytics
- doctor-facing reminder management
- push notifications outside web/email

## 18. Recommended Reading Order

If you want to learn this feature quickly, read in this order:

1. [backend/src/models/MedicationReminderPlan.js](/home/sanzid/playground/curenet/backend/src/models/MedicationReminderPlan.js)
2. [backend/src/models/MedicationReminderDose.js](/home/sanzid/playground/curenet/backend/src/models/MedicationReminderDose.js)
3. [backend/src/lib/reminders.js](/home/sanzid/playground/curenet/backend/src/lib/reminders.js)
4. [backend/src/controllers/remindersController.js](/home/sanzid/playground/curenet/backend/src/controllers/remindersController.js)
5. [backend/src/lib/reminderWorker.js](/home/sanzid/playground/curenet/backend/src/lib/reminderWorker.js)
6. [backend/src/lib/mail.js](/home/sanzid/playground/curenet/backend/src/lib/mail.js)
7. [frontend/src/components/ReminderSetupModal.tsx](/home/sanzid/playground/curenet/frontend/src/components/ReminderSetupModal.tsx)
8. [frontend/src/pages/PatientReminders.tsx](/home/sanzid/playground/curenet/frontend/src/pages/PatientReminders.tsx)

## 19. Short Mental Model

If you want one simple sentence to remember the architecture:

The prescription gives the medicine, the reminder plan gives the schedule, the dose rows give the execution units, and the worker turns due dose rows into notifications and emails.
