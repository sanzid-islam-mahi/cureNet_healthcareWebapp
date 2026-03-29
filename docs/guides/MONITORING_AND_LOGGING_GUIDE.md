# CureNet Monitoring And Logging Guide

This guide documents the operational visibility currently available in CureNet and how it should be presented during the viva.

## 1. Monitoring Scope

For the current project, monitoring and logging are built around:

- Docker container status
- backend and worker logs
- reverse-proxy health
- application health endpoint
- audit logs stored in the database

This is enough to demonstrate operational awareness for a student deployment, even though it is not yet a full observability stack with metrics dashboards and alerting.

## 2. Health Endpoint

Relevant endpoint:

- `GET /api/health`

The deployed app exposes:

- app health through Nginx: `https://<host>/api/health`

Operational use:

- confirms backend API process is responding
- useful for manual checks, proxy checks, and Docker healthchecks

Relevant files:

- [docker-compose.yml](/home/sanzid/playground/curenet/docker-compose.yml)
- [backend/src/index.js](/home/sanzid/playground/curenet/backend/src/index.js)

## 3. Docker Service Monitoring

The main operational command is:

```bash
docker compose --env-file .env.deploy ps
```

This shows:

- whether containers are running
- whether healthchecks are passing
- published ports

Useful services to watch:

- `mysql`
- `backend`
- `reminder-worker`
- `frontend`
- `nginx-proxy`

## 4. Log Inspection

Useful commands:

```bash
docker compose --env-file .env.deploy logs -f backend
docker compose --env-file .env.deploy logs -f reminder-worker
docker compose --env-file .env.deploy logs -f nginx-proxy
```

What each is useful for:

- `backend`
  - auth issues
  - route errors
  - upload problems
  - application exceptions

- `reminder-worker`
  - due reminder processing
  - missed-dose marking
  - reminder mail send logs

- `nginx-proxy`
  - request routing
  - reverse-proxy health
  - TLS and proxy-level issues

Reference:

- [DOCKER_COMMANDS.md](/home/sanzid/playground/curenet/docs/guides/DOCKER_COMMANDS.md)

## 5. Audit Logging

Relevant file:

- [backend/src/lib/auditLog.js](/home/sanzid/playground/curenet/backend/src/lib/auditLog.js)

Current implementation:

- audit entries are written to the database
- entries record actions, user IDs, entity references, details, and IP when available

Why this matters:

- supports accountability for sensitive operations
- gives admin visibility into operational and security-relevant actions

Assessment note:

- this is stronger than having only console logging
- it is still an application-level audit trail, not a full SIEM integration

## 6. Lightweight Operational Script

For quick stack checks, CureNet now includes:

- [scripts/ops-check.sh](/home/sanzid/playground/curenet/scripts/ops-check.sh)

This script prints:

- Docker service status
- API health result
- the most recent backend logs
- the most recent reminder-worker logs

This makes the operational story easier to demo in the viva.

## 7. What Exists Today vs Next Production Step

What exists today:

- container healthchecks
- API health endpoint
- Docker logs
- audit logging in the database
- manual operational commands

What would be next in a stronger production setup:

- centralized log aggregation
- metrics dashboards
- alerting for failed healthchecks
- uptime monitoring
- anomaly and security event alerting

## 8. Viva Talking Points

Suggested answer:

- CureNet includes service-level healthchecks in Docker Compose and exposes an API health endpoint
- logs are available per container, especially for backend and reminder-worker behavior
- the system also writes audit logs to the database for sensitive actions, which supports operational review
- while this is not yet a full Prometheus/Grafana or cloud monitoring stack, it is a real monitoring and logging baseline appropriate to the current scope
