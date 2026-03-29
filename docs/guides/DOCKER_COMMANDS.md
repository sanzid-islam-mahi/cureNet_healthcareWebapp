# CureNet Docker Commands

This file is the practical command reference for running CureNet with Docker on your machine.

Repo root:

```bash
/home/sanzid/playground/curenet
```

Most commands below should be run from the repo root.

## 1. Start The Full Stack

Build and start everything:

```bash
docker compose --env-file .env.deploy up --build
```

Build and start in the background:

```bash
docker compose --env-file .env.deploy up -d --build
```

Services started:

- `mysql`
- `backend`
- `reminder-worker`
- `frontend`
- `nginx-proxy`

## 2. Stop The Stack

Stop containers but keep data volumes:

```bash
docker compose --env-file .env.deploy down
```

Stop containers and remove volumes too:

```bash
docker compose --env-file .env.deploy down -v
```

Use `down -v` only when you intentionally want to reset:

- MySQL data
- uploaded files

## 3. Start Or Rebuild Specific Services

Start only the proxy:

```bash
docker compose --env-file .env.deploy up -d nginx-proxy
```

Start only the frontend:

```bash
docker compose --env-file .env.deploy up -d frontend
```

Start only the backend:

```bash
docker compose --env-file .env.deploy up -d backend
```

Rebuild frontend and restart it:

```bash
docker compose --env-file .env.deploy up -d --build frontend
```

Or use the helper script:

```bash
./scripts/docker-rebuild-service.sh frontend
```

Rebuild frontend and proxy together:

```bash
docker compose --env-file .env.deploy up -d --build frontend nginx-proxy
```

Rebuild backend and worker:

```bash
docker compose --env-file .env.deploy up -d --build backend reminder-worker
```

## 4. Check Status

See service status:

```bash
docker compose --env-file .env.deploy ps
```

See all Docker containers on the machine:

```bash
docker ps -a
```

See only running containers:

```bash
docker ps
```

## 5. View Logs

All stack logs:

```bash
docker compose --env-file .env.deploy logs
```

Follow all logs live:

```bash
docker compose --env-file .env.deploy logs -f
```

Backend logs:

```bash
docker compose --env-file .env.deploy logs -f backend
```

Frontend logs:

```bash
docker compose --env-file .env.deploy logs -f frontend
```

Nginx proxy logs:

```bash
docker compose --env-file .env.deploy logs -f nginx-proxy
```

Reminder worker logs:

```bash
docker compose --env-file .env.deploy logs -f reminder-worker
```

MySQL logs:

```bash
docker compose --env-file .env.deploy logs -f mysql
```

Last 200 backend log lines:

```bash
docker compose --env-file .env.deploy logs --tail=200 backend
```

## 6. Restart Services

Restart everything:

```bash
docker compose --env-file .env.deploy restart
```

Restart only backend:

```bash
docker compose --env-file .env.deploy restart backend
```

Restart only worker:

```bash
docker compose --env-file .env.deploy restart reminder-worker
```

Restart only proxy:

```bash
docker compose --env-file .env.deploy restart nginx-proxy
```

## 7. Enter Containers

Open a shell in backend:

```bash
docker compose --env-file .env.deploy exec backend sh
```

Open a shell in MySQL container:

```bash
docker compose --env-file .env.deploy exec mysql sh
```

Open MySQL client as root inside the container:

```bash
docker compose --env-file .env.deploy exec mysql mysql -uroot -p
```

Open MySQL client as app user:

```bash
docker compose --env-file .env.deploy exec mysql mysql -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME"
```

## 8. Run Backend Commands Inside Docker

Run migrations inside backend container:

```bash
docker compose --env-file .env.deploy exec backend npm run migrate
```

Run backend tests inside backend container:

```bash
docker compose --env-file .env.deploy exec backend npm test
```

Create admin inside backend container:

```bash
docker compose --env-file .env.deploy exec backend npm run create-admin
```

Run the reminder worker once manually:

```bash
docker compose --env-file .env.deploy exec reminder-worker sh
```

If needed inside that shell:

```bash
WORKER_RUN_ONCE=true npm run reminder-worker
```

## 9. Useful Curl Checks

Check HTTPS app:

```bash
curl -k -I https://127.0.0.1/
```

Check API health through proxy:

```bash
curl -k https://127.0.0.1/api/health
```

Check local LAN IP health:

```bash
curl -k https://192.168.0.108/api/health
```

Check HTTP redirect:

```bash
curl -I http://127.0.0.1:8080/
```

## 10. Image And Volume Cleanup

Remove one stale container:

```bash
docker rm -f CONTAINER_NAME
```

Example:

```bash
docker rm -f curenet_frontend_1
```

Remove unused Docker images:

```bash
docker image prune
```

Remove unused Docker volumes:

```bash
docker volume prune
```

Remove everything unused:

```bash
docker system prune
```

Be careful with:

```bash
docker system prune -a
```

because it can remove a lot more than this project.

## 11. Full Reset For This Project

If the stack gets into a bad state and you want a clean restart:

```bash
docker compose --env-file .env.deploy down -v
docker compose --env-file .env.deploy up -d --build
```

This resets:

- MySQL data
- uploads volume

Only use this if you are okay losing containerized DB data and uploaded files.

## 12. Helper Scripts

Rebuild one service:

```bash
./scripts/docker-rebuild-service.sh frontend
./scripts/docker-rebuild-service.sh backend
./scripts/docker-rebuild-service.sh reminder-worker
./scripts/docker-rebuild-service.sh nginx-proxy
```

Refresh the full stack:

```bash
./scripts/docker-refresh-stack.sh
```

## 13. Current Ports In This Project

Current host mapping from [docker-compose.yml](/home/sanzid/playground/curenet/docker-compose.yml):

- HTTPS: `443`
- HTTP fallback: `8080`

So use:

- `https://192.168.0.108/`
- `http://192.168.0.108:8080/`

## 14. Current Important Files

- [docker-compose.yml](/home/sanzid/playground/curenet/docker-compose.yml)
- [\.env.deploy](/home/sanzid/playground/curenet/.env.deploy)
- [backend/Dockerfile](/home/sanzid/playground/curenet/backend/Dockerfile)
- [frontend/Dockerfile](/home/sanzid/playground/curenet/frontend/Dockerfile)
- [deploy/nginx/default.conf](/home/sanzid/playground/curenet/deploy/nginx/default.conf)
- [DEPLOYMENT_GUIDE.md](/home/sanzid/playground/curenet/docs/guides/DEPLOYMENT_GUIDE.md)
- [DEPLOYMENT_RUN_LOG.md](/home/sanzid/playground/curenet/docs/guides/DEPLOYMENT_RUN_LOG.md)

## 15. Recommended Daily Commands

For normal use, these are the ones you will use the most:

Start:

```bash
docker compose --env-file .env.deploy up -d --build
```

Check status:

```bash
docker compose --env-file .env.deploy ps
```

Watch backend logs:

```bash
docker compose --env-file .env.deploy logs -f backend
```

Watch worker logs:

```bash
docker compose --env-file .env.deploy logs -f reminder-worker
```

Stop:

```bash
docker compose --env-file .env.deploy down
```
