# CureNet Image Uploads Guide

This document explains the image and file upload system used in CureNet.

It covers:
- patient profile image uploads
- doctor profile image uploads
- medical imaging uploads
- where files are stored
- which upload middleware handles which file type
- how the frontend consumes uploaded file URLs

## 1. Big Picture

CureNet has two upload categories:

1. `profile images`
- patient profile image
- doctor profile image

2. `medical imaging files`
- appointment-linked provider uploads
- patient-owned external uploads

All uploaded files are stored under the shared backend uploads directory and served from:
- `/uploads/...`

That means the system is file-based and server-hosted, not cloud object storage.

## 2. Main Concepts

### Shared uploads directory
The backend serves uploaded files statically from `/uploads`.

Why it exists:
- uploaded profile images and imaging documents need to be reachable by URL
- Docker deployment mounts this path into a volume so restarts do not lose files

### Two separate multer configs
The project uses two upload middlewares:

- general profile-image uploads
- medical imaging uploads

Why they are separate:
- profile pictures and medical imaging have different rules
- profile images are smaller and image-only
- imaging supports image files plus PDF and a larger size limit

### URL storage
The database stores file paths like:
- `/uploads/patient-12345.jpg`
- `/uploads/imaging-12345.pdf`

Why this matters:
- frontend can combine the API origin with the stored path
- URLs stay portable across local and deployed environments

## 3. File Map

### Upload configuration

- [backend/src/config/appPaths.js](/home/sanzid/playground/curenet/backend/src/config/appPaths.js)
  - central uploads directory resolution
- [backend/src/config/multerConfig.js](/home/sanzid/playground/curenet/backend/src/config/multerConfig.js)
  - profile image upload middleware
- [backend/src/config/imagingUpload.js](/home/sanzid/playground/curenet/backend/src/config/imagingUpload.js)
  - medical imaging upload middleware

### Profile image flows

- [backend/src/controllers/patientsController.js](/home/sanzid/playground/curenet/backend/src/controllers/patientsController.js)
  - patient profile image upload is handled inside `updateProfile()`
- [backend/src/controllers/doctorsController.js](/home/sanzid/playground/curenet/backend/src/controllers/doctorsController.js)
  - doctor profile image upload is handled by `uploadImage()`
- [backend/src/routes/patients.js](/home/sanzid/playground/curenet/backend/src/routes/patients.js)
  - `PUT /api/patients/profile`
- [backend/src/routes/doctors.js](/home/sanzid/playground/curenet/backend/src/routes/doctors.js)
  - `POST /api/doctors/upload-image`

### Medical imaging flows

- [backend/src/models/MedicalImagingRecord.js](/home/sanzid/playground/curenet/backend/src/models/MedicalImagingRecord.js)
  - imaging metadata model
- [backend/src/lib/medicalImaging.js](/home/sanzid/playground/curenet/backend/src/lib/medicalImaging.js)
  - allowed study/source/status values
  - serialization helpers
- [backend/src/controllers/imagingController.js](/home/sanzid/playground/curenet/backend/src/controllers/imagingController.js)
  - create, update, list, get, delete imaging records
- [backend/src/routes/imaging.js](/home/sanzid/playground/curenet/backend/src/routes/imaging.js)
  - imaging API routes

### Frontend consumers

- [frontend/src/lib/runtimeConfig.ts](/home/sanzid/playground/curenet/frontend/src/lib/runtimeConfig.ts)
  - resolves uploaded asset URLs correctly
- [frontend/src/pages/PatientProfile.tsx](/home/sanzid/playground/curenet/frontend/src/pages/PatientProfile.tsx)
  - patient profile image UI
- [frontend/src/pages/DoctorProfile.tsx](/home/sanzid/playground/curenet/frontend/src/pages/DoctorProfile.tsx)
  - doctor profile image UI
- [frontend/src/components/MedicalImagingList.tsx](/home/sanzid/playground/curenet/frontend/src/components/MedicalImagingList.tsx)
  - imaging file list/view layer

## 4. Upload Storage Model

## 4.1 Physical storage

The files are written to the uploads directory returned by:
- `getUploadsDir()` in [backend/src/config/appPaths.js](/home/sanzid/playground/curenet/backend/src/config/appPaths.js)

The backend then serves:
- `app.use('/uploads', express.static(uploadsDir))`

So if the DB stores:
- `/uploads/patient-123.jpg`

the browser can request:
- `https://host/uploads/patient-123.jpg`

## 4.2 Docker behavior

In deployment, uploads are persisted through a Docker volume.

Why this matters:
- container restarts do not erase files
- imaging and profile pictures survive rebuilds

## 5. Profile Image Uploads

Profile images use:
- [backend/src/config/multerConfig.js](/home/sanzid/playground/curenet/backend/src/config/multerConfig.js)
- [backend/src/lib/profileImages.js](/home/sanzid/playground/curenet/backend/src/lib/profileImages.js)

Rules:
- allowed extensions:
  - JPG
  - JPEG
  - PNG
  - GIF
  - WEBP
- size limit:
  - `5 MB`

Filename behavior:
- prefix is based on `req.user.role`
- output looks like:
  - `patient-<timestamp>.jpg`
  - `doctor-<timestamp>.png`

Why role prefixes help:
- easier debugging in the uploads folder
- quick visual distinction between profile-image categories

Optimization behavior:

- the raw uploaded file is first written by Multer
- the backend then normalizes the image with `sharp`
- the final stored profile picture is converted to `webp`
- the image is resized to fit within `512x512`
- image data is re-encoded in optimized form
- the original raw upload is removed after the optimized version is created

Why this helps:

- profile images load faster throughout the app
- avatar-heavy screens such as navbar, doctor lists, and profile pages transfer fewer bytes
- storage use is lower for repeated profile-image access

## 5.1 Patient profile image flow

Route:
- `PUT /api/patients/profile`

Middleware:
- `upload.single('profileImage')`

Controller:
- `updateProfile()` in [patientsController.js](/home/sanzid/playground/curenet/backend/src/controllers/patientsController.js)

What happens:

1. user must be an authenticated patient
2. multer stores the file
3. controller builds:
   - `profileImage = /uploads/<filename>`
4. patient row is updated
5. updated patient payload is returned

Important note:
- patient image upload is bundled into the profile update route, not a separate dedicated image endpoint

## 5.2 Doctor profile image flow

Route:
- `POST /api/doctors/upload-image`

Middleware:
- `upload.single('profileImage')`

Controller:
- `uploadImage()` in [doctorsController.js](/home/sanzid/playground/curenet/backend/src/controllers/doctorsController.js)

What happens:

1. user must be an authenticated doctor
2. multer stores the file
3. controller writes:
   - `imageUrl = /uploads/<filename>`
4. doctor profile row is updated
5. response returns the image URL

Example success response:

```json
{
  "success": true,
  "data": {
    "imageUrl": "/uploads/doctor-1710000000000.png"
  }
}
```

## 6. Medical Imaging Uploads

Medical imaging uses:
- [backend/src/config/imagingUpload.js](/home/sanzid/playground/curenet/backend/src/config/imagingUpload.js)

Rules:
- allowed MIME types:
  - PDF
  - JPEG
  - PNG
  - WEBP
  - GIF
  - TIFF
  - BMP
- size limit:
  - `12 MB`

Filename behavior:
- files are named like:
  - `imaging-<timestamp>.pdf`

Why medical imaging uses a separate middleware:
- profile pictures do not need PDF or TIFF
- imaging needs a wider allowed file set
- imaging files can be larger

## 6.1 Imaging data model

Medical imaging is not just “file upload”.

Each file also creates a `MedicalImagingRecord` row with:
- `patientId`
- `appointmentId`
- `uploadedByUserId`
- `title`
- `studyType`
- `bodyPart`
- `studyDate`
- `sourceType`
- `reportText`
- `notes`
- `fileUrl`
- `fileName`
- `mimeType`
- `fileSize`
- `status`

Why this is important:
- the file itself is only one piece
- the record gives the app clinical meaning and ownership

## 6.2 Imaging upload roles

The route is:
- `POST /api/imaging`

Allowed roles:
- `doctor`
- `receptionist`
- `patient`

But each role has different rules.

### Doctor
- must upload against an appointment
- appointment must belong to the selected patient
- appointment doctor must match `req.user.doctorId`

### Receptionist
- must upload against an appointment
- appointment clinic must match the receptionist clinic

### Patient
- can upload only external imaging
- cannot bind upload to an appointment
- `patientId` is inferred from authenticated patient account

This gives you:
- provider imaging
- external patient imaging

without mixing their rules.

## 6.3 Imaging update rules

Route:
- `PUT /api/imaging/:id`

Who can update:
- patient, but only their own `external` imaging
- doctor, but only appointment-linked imaging for their own appointment
- receptionist, but only appointment-linked imaging in their clinic
- admin

Why this matters:
- editing permissions follow ownership and clinical context

## 6.4 Imaging list routes

Patient self-view:
- `GET /api/imaging/my`

Patient-specific list:
- `GET /api/imaging/patient/:patientId`

Appointment-specific list:
- `GET /api/imaging/appointment/:appointmentId`

Single record:
- `GET /api/imaging/:id`

Delete:
- `DELETE /api/imaging/:id`

## 7. Frontend URL Handling

The frontend should not hardcode upload origins manually.

It now uses:
- `getAssetUrl()` in [frontend/src/lib/runtimeConfig.ts](/home/sanzid/playground/curenet/frontend/src/lib/runtimeConfig.ts)

Why this matters:
- local dev
- Docker deployment
- same-origin production

all need the image/file URL to resolve correctly.

This helper is what fixed the earlier issue where:
- navbar image worked
- but patient profile image broke in deployed mode

## 8. Typical Upload Flows

## 8.1 Patient profile image

1. patient opens profile
2. chooses image file
3. frontend sends multipart form to `/api/patients/profile`
4. backend stores file under `/uploads`
5. patient profile row stores `/uploads/...`
6. frontend renders image through `getAssetUrl()`

## 8.2 Doctor profile image

1. doctor opens doctor profile
2. uploads image
3. frontend posts multipart form to `/api/doctors/upload-image`
4. backend stores file under `/uploads`
5. doctor row stores `/uploads/...`
6. patient-facing doctor views can display it

## 8.3 Appointment-linked imaging

1. doctor or receptionist opens appointment imaging UI
2. chooses file and metadata
3. frontend sends multipart form to `/api/imaging`
4. backend validates role + appointment ownership
5. backend stores file
6. backend creates `MedicalImagingRecord`
7. patient and staff can later view it from records/history

## 8.4 Patient external imaging

1. patient opens personal imaging page
2. uploads their own file
3. backend stores file and creates record with:
   - `sourceType = external`
4. no appointment link is allowed

## 9. Common Debugging Paths

### Problem: upload works but image/file does not display
Check:
- DB stored `/uploads/...` path
- backend serves `/uploads`
- frontend uses `getAssetUrl()`
- Nginx proxies `/uploads` correctly

### Problem: doctor image works in one page but not another
Check:
- page is using the shared asset helper
- it is not manually stitching stale API URLs

### Problem: imaging upload rejected
Check:
- file type allowed by `imagingUpload`
- file size under `12 MB`
- role authorized
- appointment belongs to patient
- clinic/doctor relationship valid

### Problem: patient cannot upload imaging tied to appointment
That is expected by design.

Patient uploads are intentionally:
- `external`
- not appointment-bound

### Problem: files disappear after container restart
Check:
- uploads volume is mounted in deployment
- you did not run a destructive `down -v`

## 10. Practical Mental Model

If you want one simple mental model:

- profile images are lightweight avatar uploads
- medical imaging is a clinical record plus file
- files live in `/uploads`
- DB stores the path and metadata
- frontend resolves paths with `getAssetUrl()`

That is the core of the CureNet upload system.
