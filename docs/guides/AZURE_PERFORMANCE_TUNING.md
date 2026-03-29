# Azure VM Performance Tuning Guide

This guide explains the first production-performance pass applied to CureNet for Azure VM deployment and how to extend it if pages still feel slow in the browser.

## 1. What We Observed

When the app is deployed on an Azure VM, the browser can feel noticeably slower than local development because:

- the network round-trip is real, not local
- the browser must download production JS, CSS, and image assets over HTTPS
- some pages trigger multiple API calls on load

In CureNet, the first analysis showed three practical causes:

1. large frontend assets
2. missing compression and static cache headers in Nginx
3. React Query using overly eager default refetch behavior

## 2. Changes Applied

### 2.1 React Query Defaults

Relevant file:

- [frontend/src/App.tsx](/home/sanzid/playground/curenet/frontend/src/App.tsx)

Applied defaults:

- `staleTime: 60_000`
- `gcTime: 10 * 60_000`
- `refetchOnWindowFocus: false`
- `refetchOnReconnect: false`
- `retry: 1`

Why this helps:

- reduces unnecessary refetches when switching tabs or revisiting a page
- keeps recently loaded data warm for short periods
- cuts down visible “loading again” behavior in dashboards and list pages

### 2.2 Frontend Static Asset Caching

Relevant file:

- [frontend/nginx.conf](/home/sanzid/playground/curenet/frontend/nginx.conf)

Applied changes:

- enabled gzip
- enabled `etag`
- added long-lived cache headers for `/assets/`
- kept HTML routed with `no-cache` so fresh app shells still load correctly

Why this helps:

- hashed JS/CSS/image assets can be cached safely by the browser
- repeat visits become faster

### 2.3 Reverse Proxy Compression And Asset Headers

Relevant file:

- [deploy/nginx/default.conf](/home/sanzid/playground/curenet/deploy/nginx/default.conf)

Applied changes:

- enabled gzip at the public Nginx layer
- enabled `etag`
- added cache headers for `/assets/`

Why this helps:

- the browser talks to the reverse proxy, so compression needs to exist there
- this reduces transferred size for JS and CSS on real networks

### 2.4 Browser Image Loading Strategy

Relevant files:

- [frontend/src/pages/LandingPage.tsx](/home/sanzid/playground/curenet/frontend/src/pages/LandingPage.tsx)
- [frontend/src/components/Navbar.tsx](/home/sanzid/playground/curenet/frontend/src/components/Navbar.tsx)
- [frontend/src/components/DoctorCard.tsx](/home/sanzid/playground/curenet/frontend/src/components/DoctorCard.tsx)

Applied changes:

- above-the-fold brand and hero images use explicit eager loading
- only clearly non-critical landing section illustrations use `loading=\"lazy\"`
- profile, card, and modal images were moved back to normal browser priority after testing because aggressive lazy loading made visible images feel slower
- image decoding is set to async where appropriate

Why this helps:

- the browser prioritizes the images the user sees first
- only genuinely secondary landing illustrations are deferred
- visible avatars, cards, and context images are no longer delayed by over-aggressive lazy loading
- image decoding work is spread more efficiently

## 3. Build Evidence

The production build currently shows:

- main app bundle around `341 KB`
- admin analytics chunk around `374 KB`
- several large image assets between roughly `140 KB` and `462 KB`

That means the current improvements help materially, but image and bundle optimization still matter.

## 4. Image Compression Pass

The heaviest marketing/auth images were converted from PNG to WebP for deployment use.

Examples:

- `image_390` from about `452 KB` to `28 KB`
- `image_395` from about `205 KB` to `13 KB`
- `curenet_logo` from about `185 KB` to `45 KB`
- `login_page_image` from about `141 KB` to `16 KB`
- `register_page_image` from about `136 KB` to `21 KB`

Why this helps:

- these files are used in the landing, auth, navbar, footer, and contact flows
- shrinking them reduces first-load transfer size much more than browser-loading hints alone
- the browser can render visible imagery faster on real networks

## 5. What To Do On The Azure VM

After these config changes, rebuild and restart the affected services:

```bash
docker compose --env-file .env.deploy build frontend nginx-proxy
docker compose --env-file .env.deploy up -d frontend nginx-proxy
```

If you want a full refresh:

```bash
./scripts/docker-refresh-stack.sh
```

Then verify:

- hard refresh the browser
- load the landing page
- log in and open one patient dashboard page
- open a doctor or receptionist page and compare repeat navigation speed

## 6. Next Improvements If It Is Still Slow

If browser performance still feels weak, do these next in order:

1. compress or replace the largest landing and auth images
2. split the admin analytics bundle further if it is still too heavy
3. review pages with many parallel API queries and collapse some of them into aggregate endpoints where appropriate
4. place the VM behind a real domain and trusted TLS certificate if you are still using a self-signed certificate in testing

Current note:

- the worst PNG-heavy assets were replaced in deployed usage with lighter WebP versions
- if performance still feels weak after redeploy, the next likely bottleneck is JavaScript bundle weight rather than those specific images

## 7. Honest Viva Position

What you can say now:

- the frontend uses route-level lazy loading
- React Query caching and refetch defaults were tuned for deployment
- Nginx compression and static asset caching were added for Azure-hosted delivery
- further bundle and image optimization is a valid next production step

What you should not overclaim:

- guaranteed response-time benchmarks
- full CDN-grade optimization
- formally measured front-end performance budgets unless separately tested
