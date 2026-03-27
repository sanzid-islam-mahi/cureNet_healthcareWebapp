# Medical Imaging Feature Plan

## Summary
Implement `medical imaging upload and viewing` first as the next rubric-ready additional feature. V1 will be `provider-managed`: doctors or clinic staff upload imaging records, and patients can view/download them. Each imaging record will belong to a `patient` and may optionally link to an `appointment`, which keeps the feature useful both for immediate visit context and for longitudinal medical history.

This is the best fit for the current codebase because the repo already has upload infrastructure, patient/doctor record flows, medical history, clinic operations, and role-based dashboards. The design should leave a smooth extension path for `laboratory test results` later by following the same patient + optional appointment record pattern.

## Implementation Changes

### 1. Data model and storage
- Add a new imaging entity, for example `MedicalImagingRecord`, with:
  - `patientId`
  - `appointmentId` nullable
  - `uploadedByUserId`
  - `title`
  - `studyType` such as X-ray, MRI, CT, Ultrasound, Echo, Mammography, Other
  - `bodyPart` nullable
  - `studyDate` nullable
  - `sourceType` with default `provider`
  - `reportText` nullable
  - `notes` nullable
  - `fileUrl`
  - `fileName`
  - `mimeType`
  - `fileSize`
  - `status` with default `available`
- Reuse the existing `uploads` filesystem pattern and multer config style instead of introducing a new storage mechanism.
- Keep v1 to single-file records per imaging entry. If a study has multiple files later, add an attachment table then; do not add that complexity now.

### 2. Backend API
- Add imaging endpoints, likely under a dedicated route such as `/api/imaging`:
  - `POST /api/imaging`
    - doctor-only for v1
    - multipart upload
    - requires `patientId`
    - accepts optional `appointmentId`
  - `GET /api/imaging/patient/:patientId`
    - doctor access for their patient context
    - patient access only for self if you also expose a self route
  - `GET /api/imaging/my`
    - patient self-view list
  - `GET /api/imaging/:id`
    - patient self or authorized doctor
  - `DELETE /api/imaging/:id`
    - doctor/admin only for v1
- Validation rules:
  - patient must exist
  - optional appointment, if provided, must belong to that patient
  - doctor uploads should be allowed only when the doctor has a legitimate relationship to the patient, preferably via an appointment history
  - accepted file types should be constrained to common image/PDF medical formats
- Response payloads should include:
  - patient reference
  - optional appointment reference
  - uploader reference
  - file metadata
  - report metadata

### 3. Doctor workflow
- Add imaging access to the doctor-side patient context modal/page.
- In the patient context area, include:
  - imaging history list
  - direct upload action
  - direct open/download action
- In doctor appointment workflow, allow attaching imaging either:
  - from the patient context surface, or
  - directly from the consultation/prescription area if that is cleaner in the existing UX
- Keep v1 focused on upload and viewing, not annotation or measurement tools.

### 4. Patient workflow
- Add a patient-facing imaging page or section under records, for example:
  - `/app/patient-imaging`, or
  - a clear section inside medical history if that keeps the records experience stronger
- Show:
  - study title/type
  - date
  - linked appointment if present
  - doctor/uploader
  - view/download action
  - report summary if available
- Also surface imaging records in the patient medical history module as a dedicated subsection so the feature is visibly integrated into clinical history.

### 5. Admin/reception/clinic behavior
- No receptionist upload in v1.
- No separate admin imaging management UI in v1 unless deletion/review becomes necessary.
- Keep the operational story simple:
  - doctor uploads imaging to patient record
  - patient views/downloads
  - clinic context remains visible through the linked appointment when present

### 6. API docs and evaluation readiness
- Update Swagger for all new imaging routes, request bodies, multipart upload behavior, and response schemas.
- Update `TASKS.md` to mark the additional rubric feature as implemented.
- Update README requirement-to-feature mapping so `Medical imaging upload and viewing` is clearly demonstrable during evaluation.

## Public API / Interface Changes
- New backend imaging resource and model.
- New multipart upload endpoint for doctor/provider imaging uploads.
- New patient self-view imaging endpoint.
- New doctor patient-context imaging list endpoint or inclusion in existing patient-context payload.
- New frontend route/page or medical-history section for patient imaging.
- New doctor-side imaging upload/view UI in patient context.

## Test Plan
- Doctor can upload imaging for a valid patient.
- Upload with invalid patient fails.
- Upload with mismatched `appointmentId` and `patientId` fails.
- Patient can list only their own imaging records.
- Doctor can view imaging only for authorized patients.
- Unauthorized patient cannot read another patient’s imaging.
- File type validation rejects unsupported uploads.
- Medical history aggregation includes imaging summary entries once implemented there.
- Frontend renders:
  - empty imaging state
  - populated list state
  - doctor upload success path
  - patient download/view path

## Assumptions and Defaults
- Chosen feature: `medical imaging upload and viewing`
- V1 scope: `provider-managed uploads first`
- Record ownership model: `patient + optional appointment`
- Storage model: existing local uploads pattern, not cloud object storage yet
- V1 file model: one uploaded file per imaging record
- Labs are intentionally deferred, but this imaging record pattern should be reusable later for a parallel `LabResultRecord` design
