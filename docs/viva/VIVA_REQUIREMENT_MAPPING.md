# CureNet Viva Requirement Mapping

This document maps the rubric requirements to concrete CureNet features, code areas, and supporting documentation.

## 1. Security Requirements

### HTTPS encryption for all communications

Status:

- implemented in deployment through Nginx reverse proxy and HTTPS

Evidence:

- [docker-compose.yml](/home/sanzid/playground/curenet/docker-compose.yml)
- [deploy/nginx/default.conf](/home/sanzid/playground/curenet/deploy/nginx/default.conf)
- [DEPLOYMENT_GUIDE.md](/home/sanzid/playground/curenet/docs/guides/DEPLOYMENT_GUIDE.md)
- [SECURITY_GUIDE.md](/home/sanzid/playground/curenet/docs/guides/SECURITY_GUIDE.md)

### Proper input validation and sanitization

Status:

- implemented on core sensitive flows, not yet fully standardized across all controllers

Evidence:

- [backend/src/controllers/authController.js](/home/sanzid/playground/curenet/backend/src/controllers/authController.js)
- [backend/src/controllers/imagingController.js](/home/sanzid/playground/curenet/backend/src/controllers/imagingController.js)
- [backend/src/controllers/remindersController.js](/home/sanzid/playground/curenet/backend/src/controllers/remindersController.js)
- [SECURITY_GUIDE.md](/home/sanzid/playground/curenet/docs/guides/SECURITY_GUIDE.md)

### JWT tokens for authentication

Status:

- implemented

Evidence:

- [backend/src/controllers/authController.js](/home/sanzid/playground/curenet/backend/src/controllers/authController.js)
- [backend/src/middleware/auth.js](/home/sanzid/playground/curenet/backend/src/middleware/auth.js)
- [AUTH_SYSTEM_GUIDE.md](/home/sanzid/playground/curenet/docs/guides/AUTH_SYSTEM_GUIDE.md)

### Role-based access control (RBAC)

Status:

- implemented

Evidence:

- [backend/src/middleware/auth.js](/home/sanzid/playground/curenet/backend/src/middleware/auth.js)
- [frontend/src/App.tsx](/home/sanzid/playground/curenet/frontend/src/App.tsx)
- [SECURITY_GUIDE.md](/home/sanzid/playground/curenet/docs/guides/SECURITY_GUIDE.md)

### Password hashing with salt

Status:

- implemented

Evidence:

- [backend/src/models/User.js](/home/sanzid/playground/curenet/backend/src/models/User.js)
- [SECURITY_GUIDE.md](/home/sanzid/playground/curenet/docs/guides/SECURITY_GUIDE.md)

### Patient information encrypted at rest and in transit

Status:

- in transit implemented
- at rest partially addressed through infrastructure boundaries, not field-level encryption

Evidence:

- [SECURITY_GUIDE.md](/home/sanzid/playground/curenet/docs/guides/SECURITY_GUIDE.md)
- [DEPLOYMENT_GUIDE.md](/home/sanzid/playground/curenet/docs/guides/DEPLOYMENT_GUIDE.md)

### Protection against common vulnerabilities

Status:

- implemented

Examples:

- rate limiting
- clickjacking protection
- HSTS in production
- secure headers

Evidence:

- [backend/src/middleware/rateLimit.js](/home/sanzid/playground/curenet/backend/src/middleware/rateLimit.js)
- [backend/src/middleware/securityHeaders.js](/home/sanzid/playground/curenet/backend/src/middleware/securityHeaders.js)
- [SECURITY_GUIDE.md](/home/sanzid/playground/curenet/docs/guides/SECURITY_GUIDE.md)

## 2. Performance Requirements

### Implement caching strategies

Status:

- implemented on frontend through React Query

Evidence:

- [frontend/src/App.tsx](/home/sanzid/playground/curenet/frontend/src/App.tsx)
- [PERFORMANCE_GUIDE.md](/home/sanzid/playground/curenet/docs/guides/PERFORMANCE_GUIDE.md)

### Optional page load under 3 seconds

Status:

- not formally benchmarked
- supported by route-level lazy loading

Evidence:

- [frontend/src/App.tsx](/home/sanzid/playground/curenet/frontend/src/App.tsx)
- [PERFORMANCE_GUIDE.md](/home/sanzid/playground/curenet/docs/guides/PERFORMANCE_GUIDE.md)

### Optional API response under 500ms

Status:

- not formally benchmarked

### Optional database query optimization

Status:

- partially addressed through controller query shaping

### Optional image optimization and lazy loading

Status:

- partially addressed, not a full optimization subsystem

## 3. Deployment Requirements

### Docker containerization

Status:

- implemented

Evidence:

- [docker-compose.yml](/home/sanzid/playground/curenet/docker-compose.yml)
- [backend/Dockerfile](/home/sanzid/playground/curenet/backend/Dockerfile)
- [frontend/Dockerfile](/home/sanzid/playground/curenet/frontend/Dockerfile)
- [DEPLOYMENT_GUIDE.md](/home/sanzid/playground/curenet/docs/guides/DEPLOYMENT_GUIDE.md)

### Cloud deployment using student/free cloud services

Status:

- deployment-ready and intended for Azure VM deployment
- final live URL should be inserted into the viva report and README before submission

Evidence:

- [DEPLOYMENT_GUIDE.md](/home/sanzid/playground/curenet/docs/guides/DEPLOYMENT_GUIDE.md)
- [VIVA_REPORT.md](/home/sanzid/playground/curenet/docs/viva/VIVA_REPORT.md)

### Environment configuration management

Status:

- implemented

Evidence:

- [.env.deploy.example](/home/sanzid/playground/curenet/.env.deploy.example)
- [backend/.env.example](/home/sanzid/playground/curenet/backend/.env.example)
- [frontend/.env.example](/home/sanzid/playground/curenet/frontend/.env.example)
- [DEPLOYMENT_GUIDE.md](/home/sanzid/playground/curenet/docs/guides/DEPLOYMENT_GUIDE.md)

### Database backup and recovery plan

Status:

- implemented as documented operational plan with helper scripts

Evidence:

- [BACKUP_AND_RECOVERY_PLAN.md](/home/sanzid/playground/curenet/docs/guides/BACKUP_AND_RECOVERY_PLAN.md)
- [scripts/backup-mysql.sh](/home/sanzid/playground/curenet/scripts/backup-mysql.sh)
- [scripts/restore-mysql.sh](/home/sanzid/playground/curenet/scripts/restore-mysql.sh)
- [scripts/backup-uploads.sh](/home/sanzid/playground/curenet/scripts/backup-uploads.sh)
- [scripts/restore-uploads.sh](/home/sanzid/playground/curenet/scripts/restore-uploads.sh)

### Monitoring and logging setup

Status:

- implemented at a practical operational baseline

Evidence:

- [MONITORING_AND_LOGGING_GUIDE.md](/home/sanzid/playground/curenet/docs/guides/MONITORING_AND_LOGGING_GUIDE.md)
- [backend/src/lib/auditLog.js](/home/sanzid/playground/curenet/backend/src/lib/auditLog.js)
- [scripts/ops-check.sh](/home/sanzid/playground/curenet/scripts/ops-check.sh)

## 4. Documentation Requirements

Status:

- strong

Evidence:

- [README.md](/home/sanzid/playground/curenet/README.md)
- [AUTH_SYSTEM_GUIDE.md](/home/sanzid/playground/curenet/docs/guides/AUTH_SYSTEM_GUIDE.md)
- [REMINDER_SYSTEM_GUIDE.md](/home/sanzid/playground/curenet/docs/guides/REMINDER_SYSTEM_GUIDE.md)
- [NOTIFICATION_SYSTEM_GUIDE.md](/home/sanzid/playground/curenet/docs/guides/NOTIFICATION_SYSTEM_GUIDE.md)
- [IMAGE_UPLOADS_GUIDE.md](/home/sanzid/playground/curenet/docs/guides/IMAGE_UPLOADS_GUIDE.md)
- [DEPLOYMENT_GUIDE.md](/home/sanzid/playground/curenet/docs/guides/DEPLOYMENT_GUIDE.md)
- [USER_GUIDE.md](/home/sanzid/playground/curenet/docs/guides/USER_GUIDE.md)
- [VIVA_REPORT.md](/home/sanzid/playground/curenet/docs/viva/VIVA_REPORT.md)

## 5. Feature Completeness Highlights

Core healthcare workflows already implemented:

- authentication and role-based access
- clinic-based appointment booking
- receptionist clinic queue
- doctor appointment and prescription handling
- patient medical history
- reminder and notification workflows
- imaging upload and viewing
- clinic and user administration

## 6. Honest Gaps To State If Asked

- encryption at rest is not implemented as field-level application encryption
- performance targets are not formally benchmarked
- monitoring is practical and functional, but not a full metrics-and-alerting platform
- validation is strong in main sensitive flows, but not yet standardized into one validation framework across the whole API
