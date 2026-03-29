# CureNet Deployment Guide

This guide is for getting CureNet running with:

- Docker
- MySQL
- Nginx reverse proxy
- HTTPS
- local network access from your PC

It is written for the case where you are new to Docker and Nginx and want a practical path first.

It now also includes the basic operational notes needed for demos, reviews, and an Azure VM deployment path.

## 1. What We Are Deploying

The project runs as 5 services:

1. `mysql`
- stores the database

2. `backend`
- runs the Express API
- serves `/api`, `/docs`, `/uploads`

3. `reminder-worker`
- runs the medication reminder loop
- separate from the API server

4. `frontend`
- serves the built React app

5. `nginx-proxy`
- the public entry point
- receives browser traffic
- terminates HTTPS
- forwards:
  - `/` to frontend
  - `/api` to backend
  - `/docs` to backend
  - `/uploads` to backend

## 2. What Nginx Is Doing Here

You asked about Nginx specifically, so here is the simple version.

Nginx is acting as a `reverse proxy`.

That means:

- your browser talks to Nginx
- Nginx decides where to send the request
- Nginx sends frontend requests to the frontend container
- Nginx sends API requests to the backend container

Why this is useful:

- one public address
- HTTPS handled in one place
- frontend and backend feel like one app
- cookies work better with same-origin routing

In this setup:

- `https://your-ip/` -> frontend
- `https://your-ip/api/...` -> backend
- `https://your-ip/docs` -> Swagger docs

## 3. What Docker Is Doing Here

Docker packages each part of the app into containers.

Why we use it:

- same setup on your PC and later on Azure
- no need to manually run frontend/backend/database in separate terminals
- easier to restart everything together
- cleaner deployment path

`docker-compose.yml` defines all services together.

So instead of manually doing:

- run MySQL
- run backend
- run frontend
- run reminder worker
- configure proxy

we do:

```bash
docker compose --env-file .env.deploy up --build
```

## 4. Files You Should Know

These are the important deployment files:

- [docker-compose.yml](/home/sanzid/playground/curenet/docker-compose.yml)
- [backend/Dockerfile](/home/sanzid/playground/curenet/backend/Dockerfile)
- [frontend/Dockerfile](/home/sanzid/playground/curenet/frontend/Dockerfile)
- [deploy/nginx/default.conf](/home/sanzid/playground/curenet/deploy/nginx/default.conf)
- [.env.deploy.example](/home/sanzid/playground/curenet/.env.deploy.example)
- [deploy/certs/README.md](/home/sanzid/playground/curenet/deploy/certs/README.md)

## 5. Before You Start

You need:

- Docker installed
- Docker Compose available
- OpenSSL installed

To check:

```bash
docker --version
docker compose version
openssl version
```

## 6. First-Time Setup

### Step 1: Go to the project root

Make sure you are here:

```bash
/home/sanzid/playground/curenet
```

### Step 2: Create the deploy env file

```bash
cp .env.deploy.example .env.deploy
```

This creates your real deployment environment file.

### Step 3: Edit `.env.deploy`

Open [\.env.deploy](/home/sanzid/playground/curenet/.env.deploy) after copying and set at least:

```env
APP_BASE_URL=https://YOUR_PC_LAN_IP
CORS_ORIGIN=https://YOUR_PC_LAN_IP

DB_NAME=curenet
DB_USER=curenet
DB_PASSWORD=choose-a-password
DB_ROOT_PASSWORD=choose-a-root-password

JWT_SECRET=make-this-long-random-and-private

MAIL_HOST=127.0.0.1
MAIL_PORT=1025
MAIL_SECURE=false
MAIL_FROM=CureNet <no-reply@curenet.local>
MAIL_USER=
MAIL_PASSWORD=
```

Important notes:

- replace `YOUR_PC_LAN_IP` with your real local network IP
- `JWT_SECRET` should be long and private
- if you do not have real SMTP yet, reminder emails will not truly deliver outside your local mail setup

### Step 4: Find your PC LAN IP

On Linux:

```bash
hostname -I
```

Usually it looks like:

```text
192.168.0.105
```

Then use:

```env
APP_BASE_URL=https://192.168.0.105
CORS_ORIGIN=https://192.168.0.105
```

## 7. Create Local HTTPS Certificates

Nginx expects these files:

- `deploy/certs/local.crt`
- `deploy/certs/local.key`

Generate them with:

```bash
openssl req -x509 -nodes -days 365 \
  -newkey rsa:2048 \
  -keyout deploy/certs/local.key \
  -out deploy/certs/local.crt \
  -subj "/CN=localhost"
```

If you want, you can replace `localhost` with your LAN IP or host name, but for local testing this is enough to get started.

Browser note:

- this certificate is self-signed
- browsers will warn about it
- that is expected for local testing

## 8. Start the Full Stack

Use one of these.

```bash
docker compose --env-file .env.deploy up --build
```

What this does:

- builds the backend image
- builds the frontend image
- starts MySQL
- starts backend
- starts reminder worker
- starts frontend
- starts Nginx

The first run may take a bit.

## 9. What You Should See

When it is working:

- app:
  - `https://localhost/`
- API health:
  - `https://localhost/api/health`
- Swagger:
  - `https://localhost/docs`

From another device on the same Wi-Fi/LAN:

- `https://YOUR_PC_LAN_IP/`

Example:

- `https://192.168.0.105/`

## 10. How To Stop It

Press `Ctrl + C` if running in the foreground.

Or if you started it detached later:

```bash
docker compose --env-file .env.deploy down
```

## 11. Azure VM Deployment Notes

The same deployment model can be used on an Azure VM with minimal changes.

Recommended Azure shape:

- Ubuntu VM
- Docker Engine
- Docker Compose v2
- DNS pointed to the VM public IP
- Nginx reverse proxy in the same Compose stack

Recommended process:

1. copy the repo onto the VM
2. create `.env.deploy`
3. provide TLS certificate files
4. run:

```bash
docker compose --env-file .env.deploy up -d --build
```

5. verify:

- `https://<domain-or-ip>/`
- `https://<domain-or-ip>/api/health`
- `https://<domain-or-ip>/docs`

### Azure-specific notes

- use a real CA-issued certificate instead of a self-signed cert when the app is public
- keep only `80` and `443` exposed publicly
- keep MySQL private to the Docker network
- store backups outside the running containers

## 12. Uploads And Persistence

The deployed stack persists key data through Docker volumes:

- `mysql-data`
- `uploads-data`

This means:

- database contents survive container restarts
- uploaded profile images and medical files survive container restarts

Recovery references:

- [BACKUP_AND_RECOVERY_PLAN.md](/home/sanzid/playground/curenet/docs/guides/BACKUP_AND_RECOVERY_PLAN.md)
- [DOCKER_COMMANDS.md](/home/sanzid/playground/curenet/docs/guides/DOCKER_COMMANDS.md)

## 13. Environment Management Notes

Deployment configuration is externalized from the codebase.

Important env-driven deployment values include:

- `APP_BASE_URL`
- `CORS_ORIGIN`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `DB_ROOT_PASSWORD`
- `JWT_SECRET`
- `MAIL_*`
- `HTTP_PORT`
- `HTTPS_PORT`

This keeps the same codebase portable across:

- local development
- local network Docker deployment
- Azure VM deployment

## 14. HTTPS And Reverse Proxy Notes

Nginx is the public entrypoint for the deployed app.

It handles:

- TLS termination
- forwarding `/` to the frontend
- forwarding `/api`, `/docs`, and `/uploads` to the backend

Why this matters:

- the browser sees one origin
- auth cookies behave more cleanly
- frontend and backend feel like one application

## 15. Recovery Notes

For demos and operational readiness, the deployment story now includes:

- MySQL dump and restore script
- uploads backup and restore script
- a documented recovery checklist

References:

- [BACKUP_AND_RECOVERY_PLAN.md](/home/sanzid/playground/curenet/docs/guides/BACKUP_AND_RECOVERY_PLAN.md)
- [scripts/backup-mysql.sh](/home/sanzid/playground/curenet/scripts/backup-mysql.sh)
- [scripts/restore-mysql.sh](/home/sanzid/playground/curenet/scripts/restore-mysql.sh)
- [scripts/backup-uploads.sh](/home/sanzid/playground/curenet/scripts/backup-uploads.sh)
- [scripts/restore-uploads.sh](/home/sanzid/playground/curenet/scripts/restore-uploads.sh)

## 11. How To Run In The Background

Use:

```bash
docker compose --env-file .env.deploy up -d --build
```

Then check logs:

```bash
docker compose logs -f
```

## 12. Useful Docker Commands

See running containers:

```bash
docker ps
```

See compose services:

```bash
docker compose ps
```

See backend logs:

```bash
docker compose logs -f backend
```

See worker logs:

```bash
docker compose logs -f reminder-worker
```

See proxy logs:

```bash
docker compose logs -f nginx-proxy
```

Rebuild after code changes:

```bash
docker compose --env-file .env.deploy up --build
```

Restart only one service:

```bash
docker compose restart backend
```

## 13. Persistent Data

This stack uses Docker volumes:

- MySQL data persists in `mysql-data`
- uploaded files persist in `uploads-data`

That means:

- restarting containers should not erase the database
- uploaded profile images and medical imaging files should remain

## 14. Local Network Access

To access from another phone/laptop on your Wi-Fi:

1. make sure both devices are on the same network
2. find your PC LAN IP
3. open:
   - `https://YOUR_PC_LAN_IP/`
4. allow port `80` and `443` in your firewall if needed
5. accept the self-signed certificate warning

If it works on your PC but not on another device, most common reasons are:

- firewall blocking the ports
- wrong LAN IP
- Nginx container not running
- browser rejecting the self-signed cert until manually accepted

## 15. Common Problems

### Problem: `docker compose` does not exist

Install the Docker Compose v2 plugin and verify:

```bash
docker compose version
```

### Problem: Nginx fails because certs are missing

Make sure these exist:

- `deploy/certs/local.crt`
- `deploy/certs/local.key`

### Problem: backend says `JWT_SECRET is required`

Your [\.env.deploy](/home/sanzid/playground/curenet/.env.deploy) is missing `JWT_SECRET`.

### Problem: frontend loads but login fails

Check:

- `APP_BASE_URL`
- `CORS_ORIGIN`
- `TRUST_PROXY=1`
- Nginx is serving HTTPS

### Problem: database container starts but app cannot connect

Check:

- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- MySQL health in logs

### Problem: app works locally but another device cannot open it

Check:

- PC LAN IP
- firewall
- `ports: 80 and 443`
- same Wi-Fi/network

## 16. How This Will Move To Azure Later

The good part is: the same deployment shape can be reused on Azure VM.

Later flow:

1. create an Azure VM
2. install Docker
3. copy this project to the VM
4. copy `.env.deploy`
5. provide certs
6. run:

```bash
docker compose --env-file .env.deploy up -d --build
```

Later improvements for Azure:

- use a real domain
- replace self-signed cert with real TLS
- open only `80` and `443`
- possibly move MySQL to managed DB later

## 17. Recommended First Practical Run

If you want the simplest real first run, do exactly this:

1. copy `.env.deploy.example` to `.env.deploy`
2. fill:
   - `APP_BASE_URL`
   - `CORS_ORIGIN`
   - `DB_PASSWORD`
   - `DB_ROOT_PASSWORD`
   - `JWT_SECRET`
3. generate certs
4. run:

```bash
docker compose --env-file .env.deploy up --build
```

5. open:

```text
https://localhost
```

6. then test from another device using your LAN IP

## 18. Final Mental Model

If all this feels like a lot, keep this mental model:

- Docker runs all app pieces
- MySQL stores data
- backend serves API
- worker handles reminders
- frontend serves the web app
- Nginx sits in front and makes everything look like one HTTPS website

That is the whole deployment story.

## 19. Related Docs

For day-to-day commands and rebuild helpers, also use:

- [DOCKER_COMMANDS.md](/home/sanzid/playground/curenet/docs/guides/DOCKER_COMMANDS.md)

For the helper scripts:

- [scripts/docker-rebuild-service.sh](/home/sanzid/playground/curenet/scripts/docker-rebuild-service.sh)
- [scripts/docker-refresh-stack.sh](/home/sanzid/playground/curenet/scripts/docker-refresh-stack.sh)
