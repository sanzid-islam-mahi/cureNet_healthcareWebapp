# CureNet Backup And Recovery Plan

This document explains how CureNet data should be backed up and restored in the Docker deployment used for local network testing and Azure VM deployment.

## 1. What Must Be Backed Up

The current deployed stack has two important persistent data areas:

1. MySQL data
- contains users, appointments, prescriptions, reminders, clinics, audit logs, and other core records

2. Uploads data
- contains profile images and uploaded medical files such as imaging records

In Docker Compose, these are represented by persistent volumes:

- `mysql-data`
- `uploads-data`

Relevant file:

- [docker-compose.yml](/home/sanzid/playground/curenet/docker-compose.yml)

## 2. Backup Strategy

Recommended operational approach:

- run scheduled MySQL dumps
- archive uploads separately
- keep backups outside the running containers
- retain multiple dated backups

For viva/demo scope, CureNet now includes helper scripts:

- [scripts/backup-mysql.sh](/home/sanzid/playground/curenet/scripts/backup-mysql.sh)
- [scripts/restore-mysql.sh](/home/sanzid/playground/curenet/scripts/restore-mysql.sh)
- [scripts/backup-uploads.sh](/home/sanzid/playground/curenet/scripts/backup-uploads.sh)
- [scripts/restore-uploads.sh](/home/sanzid/playground/curenet/scripts/restore-uploads.sh)

## 3. MySQL Backup Procedure

From the repo root:

```bash
./scripts/backup-mysql.sh
```

What it does:

- reads configuration from `.env.deploy`
- creates a timestamped SQL dump under `backups/mysql/`
- uses the running `mysql` container

Typical output file:

```text
backups/mysql/curenet_20260329_220000.sql
```

## 4. MySQL Restore Procedure

Restore from a specific SQL dump:

```bash
./scripts/restore-mysql.sh backups/mysql/curenet_20260329_220000.sql
```

What it does:

- streams the SQL dump into the running MySQL container
- restores database contents into the configured database

Recovery caution:

- restoring over an existing database can overwrite current state
- for a safer recovery drill, snapshot the current database first

## 5. Uploads Backup Procedure

From the repo root:

```bash
./scripts/backup-uploads.sh
```

What it does:

- creates a timestamped tar archive under `backups/uploads/`
- archives the `uploads-data` Docker volume contents

Typical output file:

```text
backups/uploads/uploads_20260329_220000.tar.gz
```

## 6. Uploads Restore Procedure

Restore a specific uploads archive:

```bash
./scripts/restore-uploads.sh backups/uploads/uploads_20260329_220000.tar.gz
```

What it does:

- extracts the archive back into the `uploads-data` Docker volume

Recovery caution:

- restoring uploads can overwrite newer uploaded files
- keep dated archives and use clear retention rules

## 7. Local Docker Recovery Scenario

If the app stack is still healthy but data was lost or corrupted:

1. stop writes to the system if possible
2. back up the current state if needed
3. restore the database dump
4. restore uploads if the issue involves media/files
5. restart the application stack
6. verify:
- login works
- key patient/doctor records exist
- profile images and imaging files open correctly

## 8. Azure VM Recovery Scenario

Recommended VM workflow:

1. copy backups onto the VM or mount the backup location
2. confirm the Docker stack is running
3. restore MySQL from the selected SQL dump
4. restore uploads archive if required
5. restart services if needed
6. verify HTTPS app access and health endpoint

Suggested production improvement:

- store backups off-VM in a second location
- for example Azure Storage, a secure backup disk, or a private offsite backup target

## 9. Minimum Backup Policy For Viva

For the evaluation, the project can credibly describe this policy:

- MySQL dump before major deployment changes
- uploads archive before major deployment changes
- keep multiple timestamped backups
- verify one test restore path

## 10. Recovery Checklist

Before saying recovery is complete, verify:

- `https://<host>/api/health` returns success
- Swagger loads at `/docs`
- a patient can log in
- a doctor can log in
- recent appointments appear
- prescriptions load
- reminders still exist
- uploaded files such as profile images or imaging records open correctly

## 11. Honest Scope Note

This is a practical backup and restore plan for a student deployment stack. It is not a full enterprise disaster-recovery program with automated replicas, encrypted immutable backups, or cross-region failover.
