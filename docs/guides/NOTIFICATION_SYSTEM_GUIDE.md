# CureNet Notification System Guide

This document explains the notification system from start to finish.

It is written for learning and maintenance:
- what notifications are in this project
- how they are stored
- how live delivery works
- how reminder notifications fit in
- which files own what
- what the main API responses look like
- how the frontend modal stays current in real time

## 1. Big Picture

The CureNet notification system is a persisted plus live-update model.

That means:

1. the backend creates a notification row in the database
2. the backend immediately emits an in-memory event for that user
3. the browser listens through Server-Sent Events
4. the navbar notification center updates without a page refresh

This is important:
- notifications are not just temporary toasts
- they are real database records
- the user can open the modal later and still see them

## 2. Main Concepts

### `Notification`
One notification is one user-facing event.

Example meanings:
- appointment status changed
- medication reminder became due
- a medication dose was marked missed

Why it exists:
- persistent history
- unread/read tracking
- consistent modal UI
- live event bridge from backend to frontend

### Live event stream
The backend also pushes new notifications over SSE.

Why it exists:
- the user should not need to poll every few seconds
- the navbar badge and modal should feel live

### Read state
Each notification can be:
- unread
- read

Why it exists:
- unread count powers the bell badge
- read history keeps the center usable instead of “toast only”

## 3. File Map

### Backend

- [backend/src/models/Notification.js](/home/sanzid/playground/curenet/backend/src/models/Notification.js)
  - notification table model
- [backend/src/lib/notifications.js](/home/sanzid/playground/curenet/backend/src/lib/notifications.js)
  - shared helper to create and emit notifications
- [backend/src/lib/notificationEvents.js](/home/sanzid/playground/curenet/backend/src/lib/notificationEvents.js)
  - in-memory event emitter
- [backend/src/controllers/notificationsController.js](/home/sanzid/playground/curenet/backend/src/controllers/notificationsController.js)
  - list notifications
  - stream notifications via SSE
  - mark one read
  - mark all read
- [backend/src/routes/notifications.js](/home/sanzid/playground/curenet/backend/src/routes/notifications.js)
  - mounts `/api/notifications`

### Frontend

- [frontend/src/components/Navbar.tsx](/home/sanzid/playground/curenet/frontend/src/components/Navbar.tsx)
  - opens the notification modal
  - subscribes to live SSE stream
  - updates the unread badge
- [frontend/src/components/NotificationCenterModal.tsx](/home/sanzid/playground/curenet/frontend/src/components/NotificationCenterModal.tsx)
  - renders grouped unread/read notifications
  - mark one read
  - mark all read
- [frontend/src/context/AuthContext.tsx](/home/sanzid/playground/curenet/frontend/src/context/AuthContext.tsx)
  - provides the shared axios client used by notification fetches

### Reminder integration

- [backend/src/lib/reminderWorker.js](/home/sanzid/playground/curenet/backend/src/lib/reminderWorker.js)
  - creates reminder-related notifications when doses are due or missed
- [REMINDER_SYSTEM_GUIDE.md](/home/sanzid/playground/curenet/docs/guides/REMINDER_SYSTEM_GUIDE.md)
  - detailed worker-side reminder explanation

## 4. The Data Model

Defined in [backend/src/models/Notification.js](/home/sanzid/playground/curenet/backend/src/models/Notification.js).

Fields:
- `id`
- `userId`
- `type`
- `title`
- `message`
- `link`
- `metadata`
- `readAt`
- `createdAt`
- `updatedAt`

### What each field means

#### `userId`
Which user owns the notification.

Why it matters:
- every notification center is user-specific
- unread counts are per user

#### `type`
Machine-readable notification category.

Examples already used:
- `medication_reminder_due`
- `medication_dose_missed`

Why it matters:
- future UI or analytics can group by type

#### `title`
Short UI heading.

Example:
- `Medication reminder`

#### `message`
Human-readable explanation.

Example:
- `Time to take Napa scheduled for 3/27/2026, 12:34:00 PM.`

#### `link`
Optional app route to open when the user clicks `Open`.

Why it matters:
- notifications can deep-link into a relevant page

#### `metadata`
Flexible JSON for additional details.

Why it exists:
- extra context can be stored without schema churn

#### `readAt`
Timestamp when the user marked the item as read.

Why it matters:
- unread count logic
- unread/read grouping in the modal

## 5. Backend Flow

## 5.1 Creating a notification

The shared entry point is:
- `createNotification()` in [backend/src/lib/notifications.js](/home/sanzid/playground/curenet/backend/src/lib/notifications.js)

What it does:

1. validates the minimum fields
   - `userId`
   - `type`
   - `title`
   - `message`
2. creates the row in the `notifications` table
3. emits an event on:
   - `user:<userId>`
4. returns the created notification

That means one function handles both:
- persistence
- live delivery

## 5.2 Live event transport

The event bus is:
- [backend/src/lib/notificationEvents.js](/home/sanzid/playground/curenet/backend/src/lib/notificationEvents.js)

It is just an `EventEmitter`.

Why that is enough here:
- events only need to live inside the running backend process
- when a notification is created, the active connected browser should hear about it

Important limitation:
- this is process-local
- if you later scale backend into multiple replicas, you would want Redis/pub-sub or another shared event layer

For one deployed app server, this is fine.

## 5.3 Streaming to the browser

Handled by:
- `stream()` in [backend/src/controllers/notificationsController.js](/home/sanzid/playground/curenet/backend/src/controllers/notificationsController.js)

Route:
- `GET /api/notifications/stream`

What it does:

1. requires authenticated user
2. sets SSE headers:
   - `Content-Type: text/event-stream`
   - `Cache-Control: no-cache, no-transform`
   - `Connection: keep-alive`
3. sends initial `connected` event
4. subscribes to:
   - `user:<userId>`
5. forwards each backend notification event to the response stream
6. sends heartbeat comments every 25 seconds
7. removes the listener when the request closes

This keeps the connection alive and user-specific.

## 5.4 Listing notifications

Handled by:
- `list()` in [backend/src/controllers/notificationsController.js](/home/sanzid/playground/curenet/backend/src/controllers/notificationsController.js)

Route:
- `GET /api/notifications`

Supported query params:
- `limit`
- `unreadOnly=true`

What it returns:
- notification list
- unread count

Example response:

```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": 7,
        "type": "medication_dose_missed",
        "title": "Medication dose missed",
        "message": "A reminder dose for Napa was marked as missed.",
        "link": "/app/patient-reminders",
        "metadata": null,
        "readAt": null,
        "createdAt": "2026-03-27T06:17:08.000Z",
        "updatedAt": "2026-03-27T06:17:08.000Z"
      }
    ],
    "unreadCount": 1
  }
}
```

## 5.5 Marking one notification read

Handled by:
- `markRead()`

Route:
- `PUT /api/notifications/:id/read`

What it does:
- checks ownership
- sets `readAt` if not already set
- returns the updated record

## 5.6 Marking all notifications read

Handled by:
- `markAllRead()`

Route:
- `PUT /api/notifications/read-all`

What it does:
- updates all unread rows for the current user

Response:

```json
{
  "success": true
}
```

## 6. Frontend Flow

## 6.1 Navbar behavior

The main live client logic is in [frontend/src/components/Navbar.tsx](/home/sanzid/playground/curenet/frontend/src/components/Navbar.tsx).

What it does:

1. if a user exists, load notification summary with React Query
2. open an `EventSource` to:
   - `/notifications/stream`
3. when a `notification` event arrives:
   - invalidate `['notifications']`
   - invalidate `['notifications', 'summary']`
   - show a toast
4. close the EventSource when the user logs out or navbar unmounts

Why invalidation is used:
- the event only tells the app “something changed”
- React Query then reloads the full authoritative list from the API

That keeps the modal and badge consistent.

## 6.2 Notification modal behavior

The modal lives in [frontend/src/components/NotificationCenterModal.tsx](/home/sanzid/playground/curenet/frontend/src/components/NotificationCenterModal.tsx).

What it does:

1. fetches up to 40 notifications
2. separates them into:
   - unread
   - earlier
3. lets user:
   - open notification
   - mark one read
   - mark all read

Important UX rule:
- clicking `Open` marks unread notifications as read first

If a notification has a `link`:
- the app navigates there

If a notification has no `link`:
- the action acts more like dismiss/read acknowledgement

## 6.3 Unread badge

The navbar bell badge uses:
- `GET /notifications?limit=10`

It only really needs:
- `unreadCount`

That is why the summary query is cheap and separate from the full modal list.

## 7. How Reminder Notifications Fit In

The reminder worker creates two important notification types:

### `medication_reminder_due`
Created when a scheduled reminder dose becomes due.

Meaning:
- the worker found a `scheduled` dose that should now be sent

### `medication_dose_missed`
Created when a previously sent dose remains untaken past the grace window.

Meaning:
- the user did not mark that dose taken in time

These are created through the same shared `createNotification()` helper, so they automatically:
- persist in DB
- show in the modal
- update the bell badge
- arrive live if the user is connected

## 8. Why This Design Works

The design is intentionally simple:

### Persist first
- notifications survive refreshes and later review

### Emit after create
- browser gets live updates fast

### Use SSE, not WebSocket
- simpler for one-way server-to-client updates
- enough for this use case

### User-scoped event names
- clean separation between users

## 9. Common Debugging Paths

### Problem: no notification appears in the modal
Check:
- did the backend actually create a `Notification` row
- does the logged-in user match `userId`
- does `/api/notifications` return the row

### Problem: notification is in DB but no live popup appears
Check:
- is the browser currently connected to `/notifications/stream`
- did the navbar mount for that user
- did the EventSource close because of logout or auth expiry

### Problem: unread count is wrong
Check:
- whether `readAt` is set correctly
- whether the frontend invalidated both:
  - `['notifications']`
  - `['notifications', 'summary']`

### Problem: reminder notification exists but user says “nothing happened”
Check:
- was the notification already marked read
- was the user logged in at the time
- was the user logged in as the same account that owns the notification

## 10. Practical Mental Model

If you want one simple mental model:

- `Notification` is the persistent record
- `createNotification()` writes it and broadcasts it
- SSE carries the live event
- React Query reloads the list
- the modal is just a view over those stored rows

That is the core of CureNet notifications.
