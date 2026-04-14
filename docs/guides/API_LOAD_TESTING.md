# API Load Testing

This guide explains how to measure CureNet API response time and generate evidence for the performance requirement discussion.

## Purpose

Use the load test to measure whether a selected API endpoint stays under a target response-time threshold such as `500 ms`.

Important:

- do not claim the API is under `500 ms` unless you actually run the test
- use the measured output in the report or viva

## Script

Load test script:

- [api-load-test.mjs](/home/sanzid/playground/curenet/scripts/api-load-test.mjs)

The script uses Node's built-in `fetch` and prints:

- total requests
- concurrency
- average response time
- min response time
- p95 response time
- p99 response time
- max response time
- throughput
- pass/fail against the configured threshold

The default pass rule is:

- `p95 <= threshold`

## Example Commands

Test the health endpoint locally:

```bash
node scripts/api-load-test.mjs \
  --base-url http://localhost:5000 \
  --path /api/health \
  --requests 100 \
  --concurrency 10 \
  --threshold-ms 500
```

Test the deployed API through HTTPS:

```bash
node scripts/api-load-test.mjs \
  --base-url https://curenet.app \
  --path /api/health \
  --requests 100 \
  --concurrency 10 \
  --threshold-ms 500
```

Test a public endpoint such as doctor listing:

```bash
node scripts/api-load-test.mjs \
  --base-url https://curenet.app \
  --path '/api/doctors?limit=5' \
  --requests 100 \
  --concurrency 10 \
  --threshold-ms 500
```

## Protected Endpoint Testing

For protected endpoints, pass an auth cookie or bearer token as a header.

Example:

```bash
node scripts/api-load-test.mjs \
  --base-url https://curenet.app \
  --path /api/auth/profile \
  --requests 50 \
  --concurrency 5 \
  --threshold-ms 500 \
  --header "Cookie: token=YOUR_COOKIE_VALUE"
```

or

```bash
node scripts/api-load-test.mjs \
  --base-url https://curenet.app \
  --path /api/auth/profile \
  --requests 50 \
  --concurrency 5 \
  --threshold-ms 500 \
  --header "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Recommended Endpoints For Evidence

Use at least one public endpoint and one protected endpoint:

- `/api/health`
- `'/api/doctors?limit=5'`
- `/api/auth/profile`

This gives a more realistic performance story than testing only the simplest endpoint.

## How To Use In The Report

If the result passes:

- mention the endpoint tested
- mention request count and concurrency
- report the `p95` value

Example sentence:

> A load test of `GET /api/doctors?limit=5` with 100 requests at concurrency 10 produced a p95 response time of 312 ms, which remained below the 500 ms target.

If the result fails:

- report it honestly
- explain that the target was not met under that load
- mention possible improvements such as query optimization, additional caching, or infrastructure tuning

## Notes

- Results depend on:
  - VM size
  - network latency
  - whether Redis/cache is warm
  - endpoint complexity
  - database state
- Run the test more than once and use the most representative result
- Prefer testing against the deployed domain if the report is about production-like performance
- If you are using `fish`, quote any `--path` value that contains `?`, `&`, or `*`, because those characters are treated as wildcards by the shell

## Fish Shell Examples

If you use `fish`, prefer quoting URL-style paths by default.

Example:

```fish
node scripts/api-load-test.mjs \
  --base-url https://curenet.app \
  --path '/api/doctors?limit=5' \
  --requests 100 \
  --concurrency 10 \
  --threshold-ms 500
```

Protected endpoint example in `fish`:

```fish
node scripts/api-load-test.mjs \
  --base-url https://curenet.app \
  --path '/api/auth/profile' \
  --requests 50 \
  --concurrency 5 \
  --threshold-ms 500 \
  --header "Authorization: Bearer $PATIENT_TOKEN"
```
