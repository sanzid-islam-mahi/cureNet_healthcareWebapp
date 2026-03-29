# Medical History Module Plan

## Summary
We’ll implement medical history as a new dedicated patient workspace, not by overloading the current profile page. The module will use a hybrid model: most of the history will be derived from existing appointments, prescriptions, reminders, allergies, and patient profile data, and we’ll add a small new structured history record for the parts you do not currently store cleanly.

This gives you a strong evaluation story without forcing a disruptive data-model rewrite.

## Implementation Changes

### 1. Product shape
- Add a new patient route and nav entry such as `/app/patient-medical-history`.
- Keep [PatientProfile.tsx](/home/sanzid/playground/curenet/frontend/src/pages/PatientProfile.tsx) focused on editable identity, emergency, and insurance data.
- Build the new page as a read-heavy history workspace with an edit panel only for the new structured history fields.

### 2. Data model
- Add one new patient-linked medical history record/table for structured fields not currently modeled:
  - chronic conditions
  - past surgeries/procedures
  - family history
  - current long-term medications
  - immunization notes or other general medical notes
  - lifestyle/risk notes if you want them in scope
- Keep existing fields where they are:
  - allergies, blood type, emergency info stay on `Patient`
  - diagnoses and medicines stay on `Prescription`
  - visit history stays on `Appointment`
  - reminder status stays on reminder tables
- Treat the new table as an extension record, not a replacement for patient profile.

### 3. Backend API
- Add a new patient medical-history endpoint group, for example:
  - `GET /api/patients/history`
  - `PUT /api/patients/history`
- `GET` should return one aggregated payload with:
  - profile health summary: blood type, allergies, emergency readiness
  - structured history record: chronic conditions, surgeries, family history, long-term meds, notes
  - timeline summary derived from existing data:
    - completed appointments
    - diagnoses from prescriptions
    - prescriptions with medicines
    - active reminders for current medications
- Add doctor read access only if it materially helps current doctor workflows; otherwise keep v1 patient-scoped and reuse doctor continuity separately.
- Add Swagger coverage for the new endpoints and aggregated response shape.

### 4. Frontend experience
- New patient medical history page should have four sections:
  - `Clinical Snapshot`
    - blood type, allergies, emergency readiness, active reminder count
  - `Structured Medical Background`
    - chronic conditions, surgeries, family history, long-term medications, notes
  - `Care Timeline`
    - reverse-chronological completed visits with diagnosis, doctor, and appointment date
  - `Prescription History`
    - recent prescriptions, linked record modal, and current active reminder status
- Use compact cards and timeline rows, not oversized hero blocks.
- Add direct links from the history page to:
  - prescription record modal
  - reminder workspace
  - profile page for safety-data edits
- On the patient dashboard, add a small “Medical history” entry point rather than duplicating the whole module there.

### 5. Validation and permissions
- Only the authenticated patient can edit their structured medical-history record.
- The aggregated `GET` endpoint must only return records belonging to the logged-in patient.
- `PUT` should validate text-array style fields consistently, even if stored as JSON or normalized strings.
- Empty-state behavior should be explicit:
  - if there is no structured history record yet, create-on-first-save
  - timeline still renders from existing appointments/prescriptions

## Public API / Type Changes
- New backend resource for patient medical history.
- New frontend medical history page and route.
- New shared response type for aggregated medical history data:
  - patient summary
  - structured history
  - timeline entries
  - prescription entries
  - active medication/reminder summary

## Test Plan
- Patient can fetch only their own medical history aggregate.
- Patient can create/update the structured history record.
- Aggregated history includes existing allergies/profile data correctly.
- Completed appointments and prescription diagnoses appear in the timeline in descending date order.
- Prescription history links remain valid for records with and without reminders.
- Empty-state patient with no completed visits still gets a valid history response.
- Frontend page renders:
  - no-history state
  - partial-history state
  - full-history state with prescriptions and reminders

## Assumptions and Defaults
- We are using a dedicated history page.
- We are using a hybrid model, not migrating all health data into a new table.
- Allergies and blood type remain on the existing patient profile model.
- Diagnoses continue to come from prescriptions and completed appointments, not a new diagnosis table.
- v1 is patient-facing first; doctor continuity remains its own workflow unless later unified deliberately.
