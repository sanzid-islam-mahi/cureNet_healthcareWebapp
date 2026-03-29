# CureNet Demo Credentials

This document explains the seeded demo accounts for local testing and demos.

## 1. Create The Demo Accounts

From the `backend` directory:

```bash
npm run create-demo-users
```

This script will create or refresh:
- multiple demo doctors
- multiple demo patients
- one demo receptionist
- one demo admin
- one demo clinic
- one structured medical history record per seeded patient
- several appointments across different workflow states
- completed prescriptions linked to past appointments
- active reminder plans and dose rows for selected prescription medicines

It is safe to rerun. The script updates the same demo accounts instead of creating duplicates.

## 2. Default Credentials

### Demo Doctors

- `doctor.asha@curenet.local` / `Doctor123`
- `doctor.farhan@curenet.local` / `Doctor123`
- `doctor.nadia@curenet.local` / `Doctor123`

### Demo Patients

- `patient.nabil@curenet.local` / `Patient123`
- `patient.sadia@curenet.local` / `Patient123`
- `patient.rashed@curenet.local` / `Patient123`

### Demo Receptionist

- `receptionist.maya@curenet.local` / `Reception123`

### Demo Admin

- `admin.demo@curenet.local` / `Admin123`

## 3. What Gets Seeded

### Doctor

The script populates a full professional profile, including:
- name
- phone
- date of birth
- gender
- address
- BMDC registration number
- department
- experience
- education
- certifications
- hospital
- location
- personal address
- consultation fee
- bio
- degrees
- awards
- languages
- services
- chamber windows
- verified status
- assigned clinic

It seeds multiple doctors across:
- Cardiology
- General Medicine
- Endocrinology

### Patient

The script populates:
- name
- phone
- date of birth
- gender
- address
- blood type
- allergies
- emergency contact
- emergency phone
- insurance provider
- insurance number

It also creates structured medical history fields:
- chronic conditions
- past procedures
- family history
- current long-term medications
- immunization notes
- lifestyle/risk notes
- general medical notes

It seeds multiple patients with different:
- allergies
- blood groups
- long-term conditions
- emergency contacts
- insurance records

### Clinic

The seeded operational staff are assigned around:
- `CureNet Central Clinic`

That helps with:
- doctor public profile
- booking flow
- receptionist and clinic-scoped operations
- admin walkthroughs with clinic-aware data

### Appointments, Prescriptions, And Reminders

The script also seeds:
- completed appointments with prescriptions
- approved upcoming appointments
- requested appointments for receptionist review
- an in-progress appointment for doctor workflow testing
- active medication reminder plans for selected patient medicines

That helps populate:
- doctor appointment desk
- receptionist queue
- patient appointment history
- prescription history
- reminder workspace

## 4. Notes

- The script marks all demo users as active.
- The script marks all demo users as email verified.
- Passwords are hashed through the normal `User` model hooks.
- If a user already exists with the same email but the wrong role, the script will stop instead of silently changing roles.
- The receptionist is assigned to the demo clinic.
- The admin is created as a platform-wide admin account without a separate profile model.
