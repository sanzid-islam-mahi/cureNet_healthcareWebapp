# CureNet Security Guide

This guide explains the security controls currently implemented in CureNet and how they map to the evaluation rubric. It is intentionally conservative: it documents what exists today, what partially exists, and what would still be strengthened for a larger production deployment.

## 1. Security Objectives

CureNet handles sensitive healthcare-related workflows, so the current security design focuses on:

- protecting user authentication and session integrity
- restricting access by role
- validating untrusted input at route boundaries
- reducing exposure to common web attacks
- protecting data in transit
- avoiding unsafe deployment defaults

## 2. Authentication

Authentication is based on JWT-backed sessions with HTTP-only cookies.

Relevant files:

- [backend/src/controllers/authController.js](/home/sanzid/playground/curenet/backend/src/controllers/authController.js)
- [backend/src/middleware/auth.js](/home/sanzid/playground/curenet/backend/src/middleware/auth.js)
- [backend/src/config/security.js](/home/sanzid/playground/curenet/backend/src/config/security.js)
- [AUTH_SYSTEM_GUIDE.md](/home/sanzid/playground/curenet/docs/guides/AUTH_SYSTEM_GUIDE.md)

Current implementation:

- JWT secret is required
- in production, `JWT_SECRET` must be at least 32 characters
- auth cookies are configured for secure deployment behind Nginx
- the backend supports trusted proxy deployment using `TRUST_PROXY`
- login, email verification, forgot password, and reset password flows are implemented

Rubric mapping:

- `JWT tokens for authentication`: implemented

## 3. Password Hashing

Passwords are never stored in plain text.

Relevant file:

- [backend/src/models/User.js](/home/sanzid/playground/curenet/backend/src/models/User.js)

Current implementation:

- passwords are hashed with `bcrypt`
- per-password salt is handled by bcrypt itself
- login compares against the hashed value only

Rubric mapping:

- `Password hashing with salt`: implemented

## 4. Role-Based Access Control

CureNet implements RBAC at the route level and UI level.

Roles in the platform:

- patient
- doctor
- receptionist
- admin

Relevant files:

- [backend/src/middleware/auth.js](/home/sanzid/playground/curenet/backend/src/middleware/auth.js)
- [frontend/src/components/ProtectedRoute.tsx](/home/sanzid/playground/curenet/frontend/src/components/ProtectedRoute.tsx)
- [frontend/src/App.tsx](/home/sanzid/playground/curenet/frontend/src/App.tsx)

Current implementation:

- protected backend routes require a valid authenticated user
- role-restricted routes use explicit role checks
- the frontend hides and protects role-specific routes
- clinic-scoped receptionist access further narrows operational access

Examples:

- only admins can access admin management screens
- only doctors can access doctor consultation flows
- only receptionists can access clinic queue operations
- patients can only access their own medical history, reminders, and imaging

Rubric mapping:

- `Role-based access control (RBAC)`: implemented

## 5. Input Validation And Sanitization

CureNet applies validation in controllers and request parsing, but this area is stronger in some flows than others.

Current evidence:

- required fields are checked before writes
- ID ownership and relationship checks are enforced in sensitive flows
- imaging upload type restrictions exist
- appointment and reminder flows enforce domain constraints
- auth flows validate tokens, passwords, and email-related requests

Representative files:

- [backend/src/controllers/authController.js](/home/sanzid/playground/curenet/backend/src/controllers/authController.js)
- [backend/src/controllers/imagingController.js](/home/sanzid/playground/curenet/backend/src/controllers/imagingController.js)
- [backend/src/controllers/remindersController.js](/home/sanzid/playground/curenet/backend/src/controllers/remindersController.js)
- [backend/src/controllers/patientsController.js](/home/sanzid/playground/curenet/backend/src/controllers/patientsController.js)

Assessment note:

- route-boundary validation exists and is used in the main high-risk flows
- validation is not yet centralized in a single schema system such as Zod or Joi across the whole API
- for viva purposes, this should be presented as `implemented with room for standardization`

Rubric mapping:

- `Proper input validation and sanitization`: partially to strongly implemented, depending on route

## 6. HTTPS And Data In Transit

Relevant files:

- [docker-compose.yml](/home/sanzid/playground/curenet/docker-compose.yml)
- [deploy/nginx/default.conf](/home/sanzid/playground/curenet/deploy/nginx/default.conf)
- [DEPLOYMENT_GUIDE.md](/home/sanzid/playground/curenet/docs/guides/DEPLOYMENT_GUIDE.md)

Current implementation:

- the deployed stack uses Nginx as a reverse proxy
- HTTPS is terminated at Nginx
- the app is served behind TLS
- the backend is proxy-aware and can enforce secure cookie behavior in production
- HSTS is added in production via the security headers middleware

Assessment note:

- local LAN deployment currently uses self-signed certificates
- Azure/public deployment should use a real CA-issued certificate

Rubric mapping:

- `HTTPS encryption for all communications`: implemented for deployed HTTPS environments

## 7. Patient Data At Rest

This item needs careful wording.

What exists:

- data is stored in MySQL inside the application deployment environment
- uploads are stored in mounted Docker volumes
- access to the data is constrained by application logic and deployment boundaries

What does not currently exist as an explicit application feature:

- field-level encryption for patient records in the database
- transparent application-managed encryption for uploaded medical files

How to present this honestly:

- `in transit`: covered through HTTPS
- `at rest`: partially addressed through infrastructure boundaries, but not through explicit database field encryption in the current application codebase

Rubric mapping:

- `Patient information must be encrypted at rest and in transit`
- status: `in transit implemented`, `at rest only partially addressed at infrastructure level`

## 8. Protection Against Common Vulnerabilities

The project currently demonstrates protection against multiple common vulnerabilities.

### 8.1 Brute Force / Abuse Mitigation

Relevant file:

- [backend/src/middleware/rateLimit.js](/home/sanzid/playground/curenet/backend/src/middleware/rateLimit.js)

Current implementation:

- in-memory request rate limiting
- returns `429 Too Many Requests`
- includes `Retry-After`

This helps mitigate:

- repeated login abuse
- automated request flooding on sensitive endpoints

### 8.2 Clickjacking And Unsafe Embedding

Relevant file:

- [backend/src/middleware/securityHeaders.js](/home/sanzid/playground/curenet/backend/src/middleware/securityHeaders.js)

Current implementation:

- `X-Frame-Options: DENY`

This helps mitigate:

- clickjacking

### 8.3 MIME Sniffing And Cross-Domain Policy Misuse

Current implementation:

- `X-Content-Type-Options: nosniff`
- `X-Permitted-Cross-Domain-Policies: none`

This helps mitigate:

- browser content-type confusion
- unsafe legacy cross-domain policy behavior

### 8.4 Transport Downgrade Reduction

Current implementation:

- HSTS in production

This helps mitigate:

- insecure downgrade attempts after first trusted HTTPS access

### 8.5 Unauthorized Data Access

Current implementation:

- per-role API authorization
- patient self-access rules
- doctor/patient relationship checks in sensitive medical flows
- receptionist clinic-scope enforcement

This helps mitigate:

- insecure direct object access
- privilege escalation by role confusion

Rubric mapping:

- `Protection against common vulnerabilities (at least 2 known vulnerabilities)`: implemented

## 9. Security Headers

Relevant file:

- [backend/src/middleware/securityHeaders.js](/home/sanzid/playground/curenet/backend/src/middleware/securityHeaders.js)

Current headers include:

- `X-Content-Type-Options`
- `X-Frame-Options`
- `Referrer-Policy`
- `Permissions-Policy`
- `Cross-Origin-Resource-Policy`
- `Cross-Origin-Opener-Policy`
- `X-Permitted-Cross-Domain-Policies`
- `Strict-Transport-Security` in production

## 10. Deployment Security Notes

Current good practices:

- containerized deployment
- internal Docker networking between services
- MySQL not exposed publicly by default
- reverse proxy entrypoint for app and API
- env-based secret configuration

Remaining production improvements:

- move secrets to a proper secret manager
- adopt CA-signed TLS for public deployment
- consider encrypted volume or managed database encryption controls
- consider centralized validation schemas
- add stronger operational monitoring and alerting

## 11. Viva Talking Points

If asked in the viva:

- JWT authentication is implemented and enforced by middleware
- passwords use bcrypt hashing with salt
- RBAC exists for patient, doctor, receptionist, and admin
- HTTPS is handled through Nginx in deployment
- security headers and rate limiting mitigate multiple common web vulnerabilities
- input validation exists on the major sensitive routes, though not yet standardized across every controller
- encryption in transit is implemented; encryption at rest is only partially covered at infrastructure level and should be described honestly
