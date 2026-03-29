# CureNet Viva Report

## 1. Project Overview

CureNet is a full-stack healthcare web application designed for four platform roles:

- patient
- doctor
- receptionist
- admin

The project supports authentication, clinic-based appointment workflows, prescription handling, medication reminders, notifications, patient medical history, and medical imaging management. The system is structured as a React frontend, an Express backend, a MySQL database, and a separate reminder worker, all deployable through Docker behind an Nginx reverse proxy.

## 2. Architecture Summary

Application layers:

- `frontend`
  - React + TypeScript SPA
  - role-based route protection
  - React Query for server-state caching

- `backend`
  - Express REST API
  - Sequelize ORM
  - JWT-based auth
  - Swagger/OpenAPI docs

- `worker`
  - medication reminder processing
  - due-dose and missed-dose handling

- `database`
  - MySQL persistent storage

- `reverse proxy`
  - Nginx
  - HTTPS termination
  - same-origin routing for app and API

## 3. Role-Based Feature Map

### Patient

- register and sign in
- manage profile
- browse doctors
- book appointments by clinic
- view appointments
- view prescriptions
- manage reminders
- view medical history
- upload or view imaging

### Doctor

- manage profile and availability
- handle appointment queue
- view patient continuity context
- write and edit prescriptions
- review reminders in context
- upload appointment-linked imaging

### Receptionist

- operate clinic-scoped queue
- handle appointment review workflow
- view clinic doctor roster
- support appointment-linked operational imaging flow where allowed

### Admin

- manage users
- manage clinics
- review doctor verification
- view analytics and logs

## 4. Technical Implementation Summary

Core technologies:

- React 19 + TypeScript
- Vite
- Tailwind CSS
- Express
- Sequelize
- MySQL
- JWT authentication
- Docker
- Nginx

Important technical strengths:

- role-based architecture
- clinic-aware workflow model
- dedicated reminder worker
- modular documentation for core subsystems
- production-style containerized deployment

## 5. Security Implementation

Implemented security controls:

- JWT-based authentication
- bcrypt password hashing with salt
- route-level role-based access control
- HTTPS deployment behind Nginx
- security headers
- rate limiting
- clinic-scoped and self-scoped access checks for sensitive data

Important honesty note:

- encryption in transit is implemented
- encryption at rest is only partially addressed through infrastructure and deployment boundaries, not field-level application encryption

Supporting references:

- [SECURITY_GUIDE.md](/home/sanzid/playground/curenet/docs/guides/SECURITY_GUIDE.md)
- [AUTH_SYSTEM_GUIDE.md](/home/sanzid/playground/curenet/docs/guides/AUTH_SYSTEM_GUIDE.md)

## 6. Performance Implementation

Current performance-focused choices:

- route-level lazy loading in the frontend
- React Query caching for server state
- same-origin deployment routing through Nginx
- separate reminder worker so background jobs do not block the API

Important honesty note:

- the project does not currently include formal benchmark evidence for strict response-time or load-time targets

Supporting reference:

- [PERFORMANCE_GUIDE.md](/home/sanzid/playground/curenet/docs/guides/PERFORMANCE_GUIDE.md)

## 7. Deployment Architecture And Environment Management

Deployment stack:

- `mysql`
- `backend`
- `reminder-worker`
- `frontend`
- `nginx-proxy`

The app is designed to run locally on a PC within a LAN and to be deployed on an Azure VM using the same Docker-based structure.

Environment management:

- deployment env is externalized in `.env.deploy`
- example env is documented in `.env.deploy.example`
- backend and frontend also ship local development env examples

Supporting references:

- [DEPLOYMENT_GUIDE.md](/home/sanzid/playground/curenet/docs/guides/DEPLOYMENT_GUIDE.md)
- [DOCKER_COMMANDS.md](/home/sanzid/playground/curenet/docs/guides/DOCKER_COMMANDS.md)

## 8. Backup And Recovery Plan

The project now includes a documented backup and restore workflow plus helper scripts for:

- MySQL dumps and restore
- uploads volume backup and restore

Supporting reference:

- [BACKUP_AND_RECOVERY_PLAN.md](/home/sanzid/playground/curenet/docs/guides/BACKUP_AND_RECOVERY_PLAN.md)

## 9. Monitoring And Logging Setup

Current operational visibility:

- Docker service status
- backend, worker, and proxy logs
- API health endpoint
- audit logs in the database

Supporting reference:

- [MONITORING_AND_LOGGING_GUIDE.md](/home/sanzid/playground/curenet/docs/guides/MONITORING_AND_LOGGING_GUIDE.md)

## 10. API Documentation Summary

The backend exposes Swagger/OpenAPI documentation through `/docs` and raw OpenAPI JSON through `/openapi.json`.

This provides:

- endpoint discoverability
- request and response documentation
- easier viva demonstration of API surface

## 11. User Documentation

Role-based walkthroughs are documented in:

- [USER_GUIDE.md](/home/sanzid/playground/curenet/docs/guides/USER_GUIDE.md)

System-level learning docs are also available for:

- auth
- reminders
- notifications
- imaging uploads
- deployment

## 12. Testing And Error Handling Evidence

The project includes automated tests across backend features and uses guarded error responses in API controllers.

Examples of operational error-handling coverage:

- auth and access denial
- invalid file types on uploads
- reminder workflow constraints
- clinic and role access restrictions

The viva should present testing honestly as `project-level automated coverage with room for broader end-to-end expansion`.

## 13. Process And Collaboration Evidence

Project process evidence can be shown through:

- Git repository history
- branch-based feature work
- documentation growth over time
- API and system guides
- deployment iteration
- feature-specific hardening and fixes

## 14. Live Demo And Submission References

Before submission, fill these in with the real values:

- Live application URL: `REPLACE_WITH_AZURE_URL`
- Swagger URL: `REPLACE_WITH_AZURE_URL/docs`
- Git repository URL: `REPLACE_WITH_GIT_REPO_URL`
- Video demonstration URL: `REPLACE_WITH_VIDEO_URL`

## 15. Demo Credentials

Use the prepared demo accounts documented in:

- [DEMO_CREDENTIALS.md](/home/sanzid/playground/curenet/docs/guides/DEMO_CREDENTIALS.md)

## 16. Suggested Video / Viva Demo Script

1. Patient
- log in
- browse a doctor
- book an appointment
- open medical history and imaging

2. Receptionist
- log in
- show clinic queue
- show clinic doctors panel

3. Doctor
- log in
- open appointments
- show patient continuity
- show prescription flow
- mention reminders and imaging linkage

4. Admin
- log in
- show clinic management
- show user management
- show doctor verification

## 17. Appendix Index

Supporting documents:

- [SECURITY_GUIDE.md](/home/sanzid/playground/curenet/docs/guides/SECURITY_GUIDE.md)
- [PERFORMANCE_GUIDE.md](/home/sanzid/playground/curenet/docs/guides/PERFORMANCE_GUIDE.md)
- [BACKUP_AND_RECOVERY_PLAN.md](/home/sanzid/playground/curenet/docs/guides/BACKUP_AND_RECOVERY_PLAN.md)
- [MONITORING_AND_LOGGING_GUIDE.md](/home/sanzid/playground/curenet/docs/guides/MONITORING_AND_LOGGING_GUIDE.md)
- [USER_GUIDE.md](/home/sanzid/playground/curenet/docs/guides/USER_GUIDE.md)
- [VIVA_REQUIREMENT_MAPPING.md](/home/sanzid/playground/curenet/docs/viva/VIVA_REQUIREMENT_MAPPING.md)
- [AUTH_SYSTEM_GUIDE.md](/home/sanzid/playground/curenet/docs/guides/AUTH_SYSTEM_GUIDE.md)
- [REMINDER_SYSTEM_GUIDE.md](/home/sanzid/playground/curenet/docs/guides/REMINDER_SYSTEM_GUIDE.md)
- [NOTIFICATION_SYSTEM_GUIDE.md](/home/sanzid/playground/curenet/docs/guides/NOTIFICATION_SYSTEM_GUIDE.md)
- [IMAGE_UPLOADS_GUIDE.md](/home/sanzid/playground/curenet/docs/guides/IMAGE_UPLOADS_GUIDE.md)
- [DEPLOYMENT_GUIDE.md](/home/sanzid/playground/curenet/docs/guides/DEPLOYMENT_GUIDE.md)
- [DOCKER_COMMANDS.md](/home/sanzid/playground/curenet/docs/guides/DOCKER_COMMANDS.md)
- [DEMO_CREDENTIALS.md](/home/sanzid/playground/curenet/docs/guides/DEMO_CREDENTIALS.md)
