# Deployment Run Log

This document records the actual first deployment run on the local machine so the process is easy to repeat later.

Current target host:

- LAN IP: `192.168.0.108`

## 1. What I Set Up

I created a real deployment env file:

- [\.env.deploy](/home/sanzid/playground/curenet/.env.deploy)

I populated it from the existing local env values and changed the public app origin to:

- `APP_BASE_URL=https://192.168.0.108`
- `CORS_ORIGIN=https://192.168.0.108`

I also added:

- `HTTP_PORT=8080`
- `HTTPS_PORT=443`

I generated local TLS certs here:

- [deploy/certs/local.crt](/home/sanzid/playground/curenet/deploy/certs/local.crt)
- [deploy/certs/local.key](/home/sanzid/playground/curenet/deploy/certs/local.key)

The certificate includes:

- `IP:192.168.0.108`
- `IP:127.0.0.1`
- `DNS:localhost`

## 2. Command Used

The stack was started with:

```bash
docker-compose --env-file .env.deploy up --build -d
```

## 3. What Went Wrong

### Problem 1: Docker daemon access was blocked

The first startup attempt failed before the project even started.

Error:

```text
Error while fetching server API version:
PermissionError(1, 'Operation not permitted')
```

What this meant:

- the shell session could run Docker commands
- but the environment needed elevated access to talk to the Docker daemon socket

How it was fixed:

- reran the Docker commands with elevated access

### Problem 2: MySQL kept restarting

After Docker access was fixed, the build completed, but MySQL never became healthy.

Main error from logs:

```text
unknown variable 'default-authentication-plugin=mysql_native_password'
```

What this meant:

- the Compose file was using a MySQL startup flag that is no longer valid for MySQL `8.4`
- the database container aborted on every start

How it was fixed:

- removed this obsolete option from [docker-compose.yml](/home/sanzid/playground/curenet/docker-compose.yml):

```text
--default-authentication-plugin=mysql_native_password
```

Then I reset the broken first-run database volume with:

```bash
docker-compose --env-file .env.deploy down -v
```

That was necessary because the database had already partially initialized in a bad state.

### Problem 3: Port 80 was already in use

Once MySQL was fixed, backend, frontend, and worker started, but the proxy failed.

Error:

```text
failed to bind host port for 0.0.0.0:80
address already in use
```

What this meant:

- something on the host machine was already using port `80`
- Docker could not bind Nginx to that port

Important detail:

- port `443` was still available
- only port `80` was blocked

How it was fixed:

- made the proxy host ports configurable in [docker-compose.yml](/home/sanzid/playground/curenet/docker-compose.yml)
- set:
  - `HTTP_PORT=8080`
  - `HTTPS_PORT=443`

in [\.env.deploy](/home/sanzid/playground/curenet/.env.deploy)

That let Nginx run with:

- HTTP on `8080`
- HTTPS on `443`

So the app still works normally at:

- `https://192.168.0.108/`

and the HTTP fallback is:

- `http://192.168.0.108:8080/`

which redirects to HTTPS.

## 4. Final Working State

Final service status:

- `mysql`: healthy
- `backend`: healthy
- `frontend`: healthy
- `nginx-proxy`: healthy
- `reminder-worker`: running

Verified checks:

- `https://127.0.0.1/` returns `200`
- `https://127.0.0.1/api/health` returns:

```json
{"success":true,"message":"CureNet API"}
```

- `http://127.0.0.1:8080/` returns `301` redirect to HTTPS

## 5. URLs To Use Now

From this PC:

- App: `https://localhost/` or `https://127.0.0.1/`
- API health: `https://127.0.0.1/api/health`
- Swagger: `https://127.0.0.1/docs`

From another device on the same network:

- App: `https://192.168.0.108/`
- Swagger: `https://192.168.0.108/docs`

Optional HTTP entry:

- `http://192.168.0.108:8080/`

This should redirect to HTTPS.

## 6. What I Changed In The Project

Main deployment-related changes:

- removed AdminJS from runtime and backend dependencies
- added proxy-aware backend settings
- added Dockerfiles for backend and frontend
- added root Docker Compose stack
- added Nginx reverse proxy config
- added deploy env example and real deploy env
- added cert generation support
- added beginner-friendly deployment guide

Important deployment files:

- [docker-compose.yml](/home/sanzid/playground/curenet/docker-compose.yml)
- [backend/Dockerfile](/home/sanzid/playground/curenet/backend/Dockerfile)
- [frontend/Dockerfile](/home/sanzid/playground/curenet/frontend/Dockerfile)
- [deploy/nginx/default.conf](/home/sanzid/playground/curenet/deploy/nginx/default.conf)
- [DEPLOYMENT_GUIDE.md](/home/sanzid/playground/curenet/docs/guides/DEPLOYMENT_GUIDE.md)

## 7. What You Should Remember

The three actual deployment issues were:

1. Docker daemon permission access
2. outdated MySQL 8.4 config flag
3. host port `80` conflict

That is a normal first deployment pattern:

- one environment access issue
- one service config issue
- one host networking issue

Nothing was fundamentally wrong with the project architecture. These were deployment-integration fixes.

## 8. Current Next Useful Step

Now that the stack is live, the best next checks are:

1. open `https://192.168.0.108/` from another device on your LAN
2. accept the self-signed certificate warning
3. verify login works through Nginx
4. verify Swagger works at `/docs`
5. test one uploaded file path and one reminder workflow inside the deployed stack
