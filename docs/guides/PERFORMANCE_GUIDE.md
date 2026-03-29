# CureNet Performance Guide

This guide documents the performance-related design choices currently present in CureNet. It is written for viva readiness, so it focuses on evidence that can be shown directly from the codebase and deployment setup.

## 1. Performance Positioning

CureNet is optimized for a student-scale healthcare platform with multiple role-based dashboards. The project includes practical performance measures, but it does not currently claim formally benchmarked SLA targets.

That means:

- we can show real performance-aware implementation choices
- we should not claim measured `under 3 second` or `under 500ms` guarantees unless separately benchmarked

## 2. Frontend Route-Level Lazy Loading

Relevant file:

- [frontend/src/App.tsx](/home/sanzid/playground/curenet/frontend/src/App.tsx)

Current implementation:

- most route pages are loaded using `React.lazy(...)`
- routes are wrapped in `Suspense`
- users do not download every page bundle on the first load

Examples of lazy-loaded pages:

- login and register
- patient dashboard and records pages
- doctor dashboard and appointment pages
- receptionist pages
- admin pages

Why this helps:

- reduces initial JavaScript payload
- improves perceived first load for role-specific flows
- keeps rarely used admin or specialized pages out of the initial bundle

Rubric mapping:

- `Page load time under 3 seconds`: not formally measured, but route-splitting supports better load performance

## 3. React Query Caching Strategy

Relevant packages and usage:

- [frontend/src/App.tsx](/home/sanzid/playground/curenet/frontend/src/App.tsx)
- multiple pages and components using `@tanstack/react-query`

Current implementation:

- React Query caches server data on the client
- data refetching is selective rather than brute-force
- mutation flows invalidate only the relevant queries
- live notification flows refresh targeted caches instead of full page reloads

Why this helps:

- reduces redundant API requests
- improves responsiveness after navigation
- keeps frequently viewed data available while avoiding excessive refetching

Rubric mapping:

- `Implement caching strategies`: implemented via React Query on the frontend

## 4. Same-Origin Production Routing

Relevant files:

- [docker-compose.yml](/home/sanzid/playground/curenet/docker-compose.yml)
- [deploy/nginx/default.conf](/home/sanzid/playground/curenet/deploy/nginx/default.conf)

Current implementation:

- in deployment, the frontend and backend are served behind the same Nginx entrypoint
- the frontend uses `/api` in deployed mode
- the browser avoids extra cross-origin complexity in the main deployed path

Why this helps:

- simpler cookie handling
- fewer CORS-related retries or misconfigurations
- cleaner browser request path

## 5. API Health And Service Separation

Current implementation:

- backend API is isolated in its own container
- reminder processing is isolated in a separate worker container
- frontend is served independently
- MySQL is its own service

Why this helps:

- background reminder processing does not block request handling in the API process
- frontend static serving stays separate from application logic
- operational behavior is easier to reason about when troubleshooting

## 6. Query And Data-Shaping Practices

Evidence in the codebase:

- Sequelize includes are used to fetch related data together where appropriate
- specialized patient and doctor aggregate endpoints are used for continuity views
- clinic-scoped receptionist views limit returned records to operationally relevant data

Assessment note:

- there is evidence of query-shaping for practical workflows
- there is not yet a formal documented query optimization pass with indexes or benchmark numbers in this repo

Rubric mapping:

- `Database query optimization`: partially addressed through practical controller/query design, not formally benchmarked

## 7. Image Handling And Upload Delivery

Current implementation:

- uploads are served through the backend and proxied through Nginx
- the frontend uses shared runtime URL helpers to avoid broken asset paths across deployment modes

Assessment note:

- the app supports image delivery and file access
- there is no advanced image transformation pipeline, CDN, or responsive image generation yet
- image lazy loading may exist in some browser-default contexts, but it is not a formally documented project-wide strategy

Rubric mapping:

- `Image optimization and lazy loading`: partially addressed, not a major optimized subsystem yet

## 8. Optional Performance Claims: Honest Position

The current project can responsibly claim:

- route-level code splitting is implemented
- React Query caching is implemented
- same-origin deployment routing reduces overhead and complexity
- background reminder work is separated from the main API process

The current project should avoid claiming without measurement:

- guaranteed page load time under 3 seconds
- guaranteed API response time under 500ms
- benchmarked database tuning

## 9. What To Say In The Viva

Suggested answer:

- CureNet uses route-level lazy loading on the frontend so users only download the code for the pages they actually visit
- the frontend uses React Query as its client-side caching strategy
- the deployment uses Nginx as a single entrypoint with same-origin routing, which simplifies browser behavior and cookie handling
- the reminder worker runs separately from the API so background tasks do not compete with interactive requests
- we did not overclaim benchmark targets because formal load testing is not yet part of the repo, but the architecture already includes practical performance-aware choices
