# CureNet Azure Domain And HTTPS Setup

This guide explains how to connect `curenet.app` to the Azure VM that runs this repository and how to make HTTPS work with the current Docker and Nginx setup.

It is written for the stack that already exists in this repo.

## 1. What The Current Repo Already Does

The deployment stack already has the pieces needed for HTTPS:

- `nginx-proxy` is the public entry point and exposes ports `80` and `443`
- the backend already trusts the reverse proxy with `TRUST_PROXY=1`
- auth cookies are marked `secure` in production
- the frontend already calls the API through `/api`

Important current files:

- [docker-compose.yml](/home/sanzid/playground/curenet/docker-compose.yml)
- [deploy/nginx/default.conf](/home/sanzid/playground/curenet/deploy/nginx/default.conf)
- [.env.deploy](/home/sanzid/playground/curenet/.env.deploy)

## 2. What Must Change For The Real Domain

Right now the repo is still configured like a LAN deployment:

- [deploy/nginx/default.conf](/home/sanzid/playground/curenet/deploy/nginx/default.conf) uses `server_name _;`
- [deploy/nginx/default.conf](/home/sanzid/playground/curenet/deploy/nginx/default.conf) expects self-signed files:
  - `/etc/nginx/certs/local.crt`
  - `/etc/nginx/certs/local.key`
- [.env.deploy](/home/sanzid/playground/curenet/.env.deploy) still points `APP_BASE_URL` and `CORS_ORIGIN` at a private IP
- [.env.deploy](/home/sanzid/playground/curenet/.env.deploy) maps HTTP to port `8080`, which is not ideal if you want normal public HTTP validation and redirect behavior

For `curenet.app`, make these changes on the VM copy of the repo.

## 3. Update `.env.deploy`

Change [\.env.deploy](/home/sanzid/playground/curenet/.env.deploy) to use the real domain:

```env
APP_BASE_URL=https://curenet.app
CORS_ORIGIN=https://curenet.app,https://www.curenet.app
HTTP_PORT=80
HTTPS_PORT=443
```

Notes:

- `APP_BASE_URL` is used in backend-generated links such as password reset and verification emails
- `CORS_ORIGIN` supports a comma-separated list in this codebase, so including both root and `www` is safe
- if you want only the apex domain, you can omit `https://www.curenet.app`

## 4. Update Nginx For The Real Hostnames

Replace the contents of [deploy/nginx/default.conf](/home/sanzid/playground/curenet/deploy/nginx/default.conf) on the VM with this production version:

```nginx
upstream curenet_frontend {
  server frontend:80;
}

upstream curenet_backend {
  server backend:5000;
}

server {
  listen 80;
  server_name curenet.app www.curenet.app;
  return 301 https://curenet.app$request_uri;
}

server {
  listen 443 ssl;
  http2 on;
  server_name curenet.app www.curenet.app;

  ssl_certificate /etc/nginx/certs/local.crt;
  ssl_certificate_key /etc/nginx/certs/local.key;
  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_session_timeout 1d;
  ssl_session_cache shared:SSL:10m;
  client_max_body_size 20m;
  etag on;

  gzip on;
  gzip_vary on;
  gzip_min_length 1024;
  gzip_proxied any;
  gzip_types
    text/plain
    text/css
    text/javascript
    application/javascript
    application/json
    application/xml
    application/rss+xml
    image/svg+xml
    font/woff
    font/woff2;

  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto https;
  proxy_set_header X-Forwarded-Host $host;

  location /api/ {
    proxy_pass http://curenet_backend;
    proxy_http_version 1.1;
  }

  location /docs/ {
    proxy_pass http://curenet_backend;
    proxy_http_version 1.1;
  }

  location = /docs {
    proxy_pass http://curenet_backend;
    proxy_http_version 1.1;
  }

  location = /openapi.json {
    proxy_pass http://curenet_backend;
    proxy_http_version 1.1;
  }

  location /uploads/ {
    proxy_pass http://curenet_backend;
    proxy_http_version 1.1;
  }

  location /assets/ {
    proxy_pass http://curenet_frontend;
    proxy_http_version 1.1;
    expires 7d;
    add_header Cache-Control "public, max-age=604800, immutable";
  }

  location / {
    proxy_pass http://curenet_frontend;
    proxy_http_version 1.1;
  }
}
```

Why this change matters:

- `server_name` is no longer a wildcard placeholder
- HTTP requests are redirected to the canonical HTTPS domain
- the same certificate file paths are preserved, so the rest of the Docker setup does not need to change

## 5. Make Sure Azure Allows The Traffic

In Azure, confirm all of these:

- the VM has a static public IP
- the Network Security Group allows inbound `80/tcp`
- the Network Security Group allows inbound `443/tcp`
- the VM OS firewall also allows `80/tcp` and `443/tcp` if `ufw` or another firewall is active

## 6. Issue A Real Certificate On The VM

Because `.app` is HTTPS-only in practice, you should use a real certificate, not the repo’s local self-signed one.

One simple way on Ubuntu is Certbot in standalone mode.

Install Certbot:

```bash
sudo apt update
sudo apt install certbot
```

Stop the container that is using ports `80` and `443`:

```bash
docker compose --env-file .env.deploy stop nginx-proxy
```

Request the certificate:

```bash
sudo certbot certonly --standalone -d curenet.app -d www.curenet.app
```

After Certbot succeeds, sync the generated certificate into the file names that this repo’s Nginx container expects:

```bash
./scripts/sync-letsencrypt-cert.sh curenet.app
```

Then start the proxy again:

```bash
docker compose --env-file .env.deploy up -d nginx-proxy
```

## 7. Helper Script Included In This Repo

This repo now includes:

- [scripts/sync-letsencrypt-cert.sh](/home/sanzid/playground/curenet/scripts/sync-letsencrypt-cert.sh)

It copies:

- `/etc/letsencrypt/live/<domain>/fullchain.pem` -> `deploy/certs/local.crt`
- `/etc/letsencrypt/live/<domain>/privkey.pem` -> `deploy/certs/local.key`

That lets you keep the existing Docker volume mount and existing certificate path inside the container.

## 8. Start Or Refresh The Stack

After the env file, Nginx config, and cert files are ready:

```bash
docker compose --env-file .env.deploy up -d --build
```

If the stack is already running and you only changed Nginx or the cert files:

```bash
docker compose --env-file .env.deploy up -d nginx-proxy
```

## 9. How To Verify It

From the VM:

```bash
docker compose --env-file .env.deploy ps
docker compose --env-file .env.deploy logs --tail=100 nginx-proxy
curl -I http://curenet.app
curl -I https://curenet.app
curl https://curenet.app/api/health
```

Expected results:

- `http://curenet.app` returns a redirect to `https://curenet.app/...`
- `https://curenet.app` loads without a browser certificate warning
- `https://curenet.app/api/health` returns the API health response

## 10. Renewal Workflow

Let’s Encrypt certificates expire, so renewal matters.

A practical manual workflow is:

```bash
sudo certbot renew
./scripts/sync-letsencrypt-cert.sh curenet.app
docker compose --env-file .env.deploy up -d nginx-proxy
```

If you later want full automation, add a root cron job or systemd timer that runs renewal, syncs the files, and restarts only `nginx-proxy`.

## 11. Security Notes From The Current Repo State

While reviewing the current deployment files, a few production notes stood out:

- [\.env.deploy](/home/sanzid/playground/curenet/.env.deploy) contains real-looking secrets and passwords
- the current `JWT_SECRET` is still a placeholder
- if this file has ever been committed or shared, rotate:
  - `JWT_SECRET`
  - database passwords
  - SMTP credentials

For production, use a long random JWT secret and avoid keeping sensitive deployment secrets in tracked files.
