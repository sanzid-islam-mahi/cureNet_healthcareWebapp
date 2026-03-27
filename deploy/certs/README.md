# Local TLS Certificates

Place a self-signed certificate pair here before starting the reverse proxy:

- `local.crt`
- `local.key`

Example command for local network testing:

```bash
openssl req -x509 -nodes -days 365 \
  -newkey rsa:2048 \
  -keyout deploy/certs/local.key \
  -out deploy/certs/local.crt \
  -subj "/CN=localhost"
```

For LAN testing, you can replace `localhost` with your PC host name or LAN IP in the certificate subject.

The `nginx-proxy` container mounts this directory read-only at `/etc/nginx/certs`.
