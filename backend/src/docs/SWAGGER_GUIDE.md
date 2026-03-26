# Swagger Guide

This project uses `Swagger UI` to display an `OpenAPI` specification for the backend.

If you are new to it, the easiest way to think about it is:

- `OpenAPI` is the machine-readable description of your API
- `Swagger UI` is the web page that renders that description into readable docs

In this project:

- the API description lives in [swagger.js](/home/sanzid/playground/curenet/backend/src/docs/swagger.js)
- the server registers the docs in [index.js](/home/sanzid/playground/curenet/backend/src/index.js)
- the docs are available at `http://localhost:5000/docs`
- the raw JSON spec is available at `http://localhost:5000/openapi.json`

## What Swagger Is

Swagger is commonly used as a general name for API documentation tooling.

In practical terms, when people say "Swagger docs", they usually mean:

1. an OpenAPI spec that describes endpoints, request bodies, params, auth, and responses
2. Swagger UI that renders that spec in the browser

So the important distinction is:

- `OpenAPI` = the spec format
- `Swagger UI` = the viewer

## Why We Use It

Without API docs, backend knowledge stays trapped in route files and controller code.

Swagger/OpenAPI helps with:

- understanding what endpoints exist
- seeing which routes need auth
- knowing what request body shape is expected
- testing endpoints from the browser UI
- keeping frontend and backend developers aligned

## How This Project Uses It

The main file is [swagger.js](/home/sanzid/playground/curenet/backend/src/docs/swagger.js).

That file exports:

- `swaggerSpec`
- `registerSwagger(app)`

`swaggerSpec` contains the actual documentation object.

`registerSwagger(app)` does two things:

1. exposes the raw spec at `/openapi.json`
2. mounts Swagger UI at `/docs`

The server calls it from [index.js](/home/sanzid/playground/curenet/backend/src/index.js).

## Swagger Spec Structure

The top-level structure looks like this:

```js
export const swaggerSpec = {
  openapi: '3.0.3',
  info: { ... },
  servers: [ ... ],
  tags: [ ... ],
  components: { ... },
  paths: { ... },
};
```

### `openapi`

This is the OpenAPI version.

Example:

```js
openapi: '3.0.3'
```

### `info`

Basic metadata about the API.

Example:

```js
info: {
  title: 'CureNET API',
  version: '1.0.0',
  description: 'OpenAPI documentation for the CureNET backend.',
}
```

### `servers`

Defines where the API is hosted.

In this project:

```js
servers: [
  {
    url: 'http://localhost:5000/api',
    description: 'Local development server',
  },
]
```

That means paths like `/auth/login` are shown under the base server URL above.

### `tags`

Tags group endpoints in Swagger UI.

Example groups in this project:

- `Auth`
- `Doctors`
- `Appointments`
- `Admin`

These are purely organizational.

### `components`

Reusable definitions live here.

In this project, the main ones are:

- `securitySchemes`
- `schemas`

#### `securitySchemes`

This tells Swagger how authentication works.

Current project setup:

- `bearerAuth` for JWT in `Authorization` header
- `cookieAuth` for cookie-based session token

That matches the backend auth middleware in [auth.js](/home/sanzid/playground/curenet/backend/src/middleware/auth.js).

#### `schemas`

These are reusable object definitions.

Examples:

- `User`
- `Appointment`
- `Prescription`
- `Notification`

Instead of rewriting the same response shape for every endpoint, you can reference a schema:

```js
$ref: '#/components/schemas/User'
```

### `paths`

This is the core part. Each API route is described here.

Example:

```js
'/auth/login': {
  post: {
    tags: ['Auth'],
    summary: 'Log in with email or phone',
    requestBody: { ... },
    responses: { ... },
  },
}
```

That means:

- path = `/auth/login`
- method = `POST`
- request body = expected JSON input
- responses = expected success/error outputs

## How to Read a Swagger Endpoint

A typical endpoint definition has:

- `tags`
- `summary`
- `parameters`
- `requestBody`
- `security`
- `responses`

Example meaning:

- `tags`: where it appears in the UI
- `summary`: short explanation
- `parameters`: path/query/header inputs
- `requestBody`: JSON or form-data payload
- `security`: whether auth is required
- `responses`: what comes back

## How Authentication Is Documented

This project uses:

```js
const authSecurity = [{ bearerAuth: [] }, { cookieAuth: [] }];
```

When an endpoint needs auth, it includes:

```js
security: authSecurity
```

That tells Swagger the endpoint can be accessed with either:

- a bearer token
- the auth cookie

Important practical point:

- Swagger UI is better at testing bearer token auth directly
- cookie auth usually depends on being logged in through the browser/session

For development and testing inside Swagger UI, bearer token support is usually simpler to reason about.

## How to Add a New Endpoint

When you add a backend route, update `swagger.js` too.

Example process:

1. create the route and controller
2. find the correct group in `paths`
3. add the new path entry
4. add request body or params
5. add response schema
6. add or reuse component schemas if needed

Example:

```js
'/notifications/read-all': {
  put: {
    tags: ['Notifications'],
    summary: 'Mark all notifications as read',
    security: authSecurity,
    responses: {
      200: { description: 'Notifications updated' },
    },
  },
}
```

## How to Add a Reusable Schema

If a response object appears in multiple places, add it under `components.schemas`.

Example:

```js
Notification: {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    title: { type: 'string' },
    message: { type: 'string' },
  },
}
```

Then reuse it:

```js
items: { $ref: '#/components/schemas/Notification' }
```

## How to Run and View the Docs

Start the backend:

```bash
cd backend
npm run dev
```

Open:

- Swagger UI: `http://localhost:5000/docs`
- Raw spec: `http://localhost:5000/openapi.json`

If you change `swagger.js`, restart the backend if the watcher does not reload correctly.

## How to Keep the Docs Accurate

This matters more than writing a large spec.

Good rule:

- every route change should include a docs change

Specifically update docs when:

- path changes
- request body changes
- response shape changes
- auth requirements change
- query/path params change

If you skip that, Swagger becomes misleading very quickly.

## Common Mistakes

### 1. Wrong base URL

If `servers.url` is wrong, the docs render but requests go to the wrong place.

### 2. Documenting outdated fields

If the controller returns different keys than the schema, the docs become untrustworthy.

### 3. Missing auth on secured routes

If a protected route has no `security` entry, the docs imply it is public.

### 4. Using too much duplication

If you rewrite object shapes in many places instead of using reusable schemas, maintenance becomes painful.

### 5. Treating docs as optional

If docs are not updated alongside route/controller work, they stop helping.

## Recommended Workflow For This Project

When you build or change an endpoint:

1. update the route/controller
2. update [swagger.js](/home/sanzid/playground/curenet/backend/src/docs/swagger.js)
3. restart backend if needed
4. open `/docs`
5. confirm the endpoint appears in the right section
6. confirm request body and auth are correct

## What “Good” Looks Like

Professional API docs are:

- accurate
- concise
- grouped well
- explicit about auth
- explicit about inputs
- explicit about outputs

Not every response needs a giant perfect schema on day one, but the docs must not lie.

That is the real standard.

## Next Improvement Options

If you want to improve the docs further, the next practical steps are:

- add fuller response schemas for every endpoint
- document standard error responses consistently
- add examples for important request bodies
- split the large `paths` object into smaller modules by domain
- generate parts of the spec from route-level annotations later if the project grows

If you want, I can do the next step and refactor [swagger.js](/home/sanzid/playground/curenet/backend/src/docs/swagger.js) into smaller files like `auth.docs.js`, `appointments.docs.js`, and `admin.docs.js`. 
