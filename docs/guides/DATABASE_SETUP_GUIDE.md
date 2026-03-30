# Database Setup Guide

This guide explains how to set up the CureNet database for both local development and Docker-based deployment.

It focuses on:

- MySQL setup
- environment variables
- migrations
- demo data
- common reset and verification steps

## 1. Database Role In CureNet

CureNet uses MySQL as its main relational database.

It stores:

- users and roles
- doctors, patients, and receptionists
- clinics
- appointments
- prescriptions
- reminders
- notifications
- ratings
- patient medical history
- medical imaging metadata

The backend accesses MySQL through Sequelize ORM and migrations are managed through Umzug.

## 2. Two Supported Setup Modes

You can work with the database in two main ways:

### A. Local MySQL

Use a MySQL server installed on your machine.

Good for:

- backend-only development
- debugging DB issues directly
- simple local setup without Docker

### B. Docker MySQL

Use the MySQL container from `docker compose`.

Good for:

- production-like setup
- team consistency
- deployment testing

## 3. Environment Variables

Important backend database variables:

- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`

You set these in:

- [backend/.env.example](/home/sanzid/playground/curenet/backend/.env.example) for local development
- [\.env.deploy.example](/home/sanzid/playground/curenet/.env.deploy.example) for Docker deployment

Typical local example:

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=curenet
DB_USER=root
DB_PASSWORD=your_mysql_password
```

Typical Docker example:

```env
DB_HOST=mysql
DB_PORT=3306
DB_NAME=curenet
DB_USER=curenet
DB_PASSWORD=strong-password
DB_ROOT_PASSWORD=another-strong-password
```

Important:

- `DB_HOST=mysql` works only inside the Docker Compose network
- for local installed MySQL, use `127.0.0.1` or `localhost`

## 4. Local MySQL Setup

### Step 1. Install MySQL

Install MySQL 8 or newer on your machine.

### Step 2. Create the database

Example:

```sql
CREATE DATABASE curenet;
```

You can also create a dedicated user if you do not want to use `root`.

Example:

```sql
CREATE USER 'curenet'@'localhost' IDENTIFIED BY 'strong-password';
GRANT ALL PRIVILEGES ON curenet.* TO 'curenet'@'localhost';
FLUSH PRIVILEGES;
```

### Step 3. Configure backend env

Create your local backend env:

```bash
cd backend
cp .env.example .env
```

Then update:

- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `DB_HOST`
- `DB_PORT`

### Step 4. Run migrations

From the backend folder:

```bash
npm install
npm run migrate
```

This creates the CureNet schema in your local MySQL database.

### Step 5. Start backend

```bash
npm run dev
```

## 5. Docker MySQL Setup

This is the recommended production-style path.

### Step 1. Create deploy env

From repo root:

```bash
cp .env.deploy.example .env.deploy
```

Set these carefully:

- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `DB_ROOT_PASSWORD`

In Docker deployment:

- MySQL service name is `mysql`
- backend connects using `DB_HOST=mysql`

### Step 2. Start the stack

```bash
docker compose --env-file .env.deploy up -d
```

This starts:

- mysql
- backend
- reminder-worker
- frontend
- nginx-proxy

### Step 3. Verify MySQL container health

```bash
docker compose --env-file .env.deploy ps
```

Look for the `mysql` service becoming healthy.

### Step 4. Run migrations if needed

If your backend startup does not already handle migrations in the environment you are testing, run:

```bash
docker compose --env-file .env.deploy exec backend npm run migrate
```

## 6. How Migrations Work In CureNet

Migration files live in:

- [backend/src/migrations](/home/sanzid/playground/curenet/backend/src/migrations)

They define schema changes such as:

- users
- doctors
- patients
- appointments
- prescriptions
- reminders
- clinics
- imaging

To apply all pending migrations locally:

```bash
cd backend
npm run migrate
```

To apply them in Docker:

```bash
docker compose --env-file .env.deploy exec backend npm run migrate
```

## 7. Demo Data Setup

CureNet includes demo user generation.

Run locally:

```bash
cd backend
npm run create-demo-users
```

Run inside Docker:

```bash
docker compose --env-file .env.deploy exec backend npm run create-demo-users
```

This creates:

- demo doctors
- demo patients
- receptionist/admin demo accounts if configured in the script
- appointments
- prescriptions
- reminders

Credentials are documented in:

- [DEMO_CREDENTIALS.md](/home/sanzid/playground/curenet/docs/guides/DEMO_CREDENTIALS.md)

## 8. Database Verification Commands

### Check backend DB connection indirectly

```bash
curl -s http://localhost:5000/api/health
```

### Open a shell inside Docker MySQL

```bash
docker compose --env-file .env.deploy exec mysql sh
```

### Open MySQL client in container

```bash
docker compose --env-file .env.deploy exec mysql mysql -u root -p
```

### Inspect tables

Inside MySQL:

```sql
USE curenet;
SHOW TABLES;
```

## 9. Reset Options

Use these carefully.

### Reset only local schema contents

You can drop and recreate the database manually in MySQL.

### Reset Docker containers but keep data

```bash
docker compose --env-file .env.deploy down
docker compose --env-file .env.deploy up -d --build
```

### Reset Docker database completely

```bash
docker compose --env-file .env.deploy down -v
docker compose --env-file .env.deploy up -d --build
```

Important:

- `down -v` removes volumes
- this deletes MySQL data and other persisted Docker volume data

## 10. Backup And Restore

Database backup and restore are documented separately in:

- [BACKUP_AND_RECOVERY_PLAN.md](/home/sanzid/playground/curenet/docs/guides/BACKUP_AND_RECOVERY_PLAN.md)

Related helper scripts:

- [backup-mysql.sh](/home/sanzid/playground/curenet/scripts/backup-mysql.sh)
- [restore-mysql.sh](/home/sanzid/playground/curenet/scripts/restore-mysql.sh)

## 11. Common Problems

### Wrong host

Problem:

- backend cannot connect to MySQL

Cause:

- using `localhost` inside Docker instead of `mysql`

Fix:

- use `DB_HOST=mysql` for Docker
- use `DB_HOST=127.0.0.1` or `localhost` for local installed MySQL

### Changed DB credentials but old Docker volume still exists

Problem:

- MySQL auth fails after env changes

Cause:

- MySQL initializes credentials only when the data volume is first created

Fix:

```bash
docker compose --env-file .env.deploy down -v
docker compose --env-file .env.deploy up -d --build
```

### Migrations not applied

Problem:

- backend starts but some tables are missing

Fix:

```bash
docker compose --env-file .env.deploy exec backend npm run migrate
```

or locally:

```bash
cd backend
npm run migrate
```

### Demo users missing

Fix:

```bash
docker compose --env-file .env.deploy exec backend npm run create-demo-users
```

## 12. Best Short Explanation For Viva

You can say:

> CureNet uses MySQL as its relational database and accesses it through Sequelize ORM. The schema is managed with migrations, and the app supports both local MySQL development and Dockerized MySQL deployment. For demo and testing, seeded users and linked healthcare workflow data can be generated through a reusable setup script.
