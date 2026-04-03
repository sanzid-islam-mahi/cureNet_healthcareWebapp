# Phase 1 Plan: Email Verification Auth via SMTP Abstraction

## Summary
Implement email verification first on `feature-email-auth` using an `SMTP abstraction` in the backend, with `email code verification` as the auth gate. New accounts will register as unverified, receive a verification code by email, and be blocked from normal login until verified, except when a dedicated local-development bypass env toggle is enabled.

This is free to start in development by using a local mail catcher such as `Mailpit`/`MailHog`. For real deployed environments, SMTP itself is not inherently free forever, but the abstraction will support free-tier transactional providers initially and paid providers later without changing auth business logic. This approach is container-safe and deployment-safe for Docker, Nginx, and Azure.

## Key Changes

### Auth flow
- Add `emailVerifiedAt` to `users`.
- Add a separate email-verification token/code table:
  - `userId`, hashed code, purpose, expiresAt, consumedAt, resendCount, attemptCount
- Change registration:
  - create user in unverified state
  - create doctor/patient profile as today
  - generate verification code
  - send verification email
  - return success payload indicating verification is pending
  - do not create login cookie/session unless dev bypass is active
- Change login:
  - if user is unverified and bypass is not enabled, reject with a dedicated error code such as `EMAIL_NOT_VERIFIED`
- Add endpoints:
  - `POST /api/auth/verify-email`
  - `POST /api/auth/resend-verification-code`
  - optional `GET /api/auth/verification-status` only if frontend boot flow needs it
- Keep password reset fully separate from verification tokens/codes

### Mail architecture
- Add a backend mail service abstraction with one interface:
  - `sendVerificationCodeEmail({ to, code, firstName })`
- Implement SMTP transport behind that interface
- Add provider-neutral env config:
  - `MAIL_HOST`
  - `MAIL_PORT`
  - `MAIL_SECURE`
  - `MAIL_USER`
  - `MAIL_PASSWORD`
  - `MAIL_FROM`
  - `APP_BASE_URL`
  - `AUTH_ALLOW_UNVERIFIED_LOGIN`
- For local development:
  - default to a mail catcher such as `Mailpit`
  - no real email provider required
- For deployed environments:
  - point the same SMTP config at Brevo/Resend/other SMTP-capable provider later
- Log send failures clearly and fail registration verification-start flow if verification email cannot be queued/sent

### Verification code behavior
- Use short numeric code for UX, not magic link, since that matches the earlier product direction
- Store only hashed code in DB
- Default expiry: `10` minutes
- Resend invalidates prior unused code for that purpose
- Rate-limit resend and verify attempts
- Successful verification:
  - marks `emailVerifiedAt`
  - consumes verification record
  - optionally issues auth cookie immediately after successful verification if we want a smoother UX
  - default choice: issue auth cookie after successful verify to reduce friction

### Frontend flow
- Registration no longer lands the user directly into the app
- Add verification screen:
  - enter code
  - resend code
  - clear messaging for `EMAIL_NOT_VERIFIED`
- Login screen handles unverified response and routes to verification UI with remembered email
- Dev bypass behavior should not change frontend flow expectations; it only relaxes backend gating locally

### Containerization and deployment fit
- SMTP abstraction works fine in Docker because the app only needs outbound network access plus env vars
- Nginx is irrelevant to outbound email; it only fronts HTTP traffic
- Azure container deployment supports this model cleanly:
  - API container gets SMTP env vars
  - no local mail server required in production
- Cloudflare fronting the app is also fine if the backend still runs on real compute
- Important constraint:
  - this plan assumes the backend runs in containers/VM/app service, not Cloudflare Workers-only runtime

## Test Plan
- Registration creates unverified user and verification record
- Registration does not create auth cookie when verification is required
- Verification email send failure returns clear error and does not silently leave broken auth state
- Verify-email with valid code marks user verified and consumes code
- Verify-email with expired/invalid code fails correctly
- Resend issues new code and invalidates old one
- Login rejects unverified account with `EMAIL_NOT_VERIFIED`
- Login succeeds after verification
- Dev bypass allows login without verification when enabled
- Password reset flow still works independently
- Mail service can be tested with mocked transport plus local SMTP catcher integration

## Assumptions and Defaults
- Verification method is numeric email code, not magic link
- SMTP abstraction is the first implementation target
- Local development uses a free mail catcher
- Production provider choice is deferred; SMTP credentials will be swapped in later
- Successful email verification will immediately create login session by default
- `AUTH_ALLOW_UNVERIFIED_LOGIN=true` is local/dev only and defaults to disabled outside development
