# Appointments & Slots Design

Use this when implementing appointments and doctor availability.

## Chamber times (doctor availability)

**Format: explicit slot list per day.**

Store on the Doctor model as JSON. Keys = weekday (lowercase). Values = array of time strings (HH:MM, same slot duration for all, e.g. 30 min).

Example:

```json
{
  "monday": ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30"],
  "tuesday": ["14:00", "14:30", "15:00", "15:30", "16:00", "16:30"],
  "wednesday": [],
  "thursday": ["09:00", "09:30", "10:00"],
  "friday": ["10:00", "10:30", "11:00", "11:30"],
  "saturday": [],
  "sunday": []
}
```

- Doctor profile UI: day × time checkboxes (or multi-select per day) that read/write this structure.
- Slot duration: e.g. 30 minutes; all slots in the list follow that duration.
- Empty array or missing day = not available that day.

## Available slots for booking

For a given **doctor** and **date**:

1. Get doctor’s `chamberTimes` and take the array for that date’s weekday (e.g. `chamberTimes["monday"]`).
2. Get existing appointments for that doctor on that date (status not cancelled).
3. Remove from the list any time that already has an appointment.
4. Return remaining times as available slots.

Implement in backend as e.g. `GET /doctors/:id/available-slots?date=YYYY-MM-DD` returning `{ slots: ["09:00", "09:30", ...] }`.

## Appointment creation

Patient sends: `doctorId`, `appointmentDate`, `timeBlock` (one of the slot strings, e.g. `"09:00"`), `type`, `reason`, `symptoms`. Backend validates that the slot is in the doctor’s chamber times for that weekday and not already booked.

---

*Chamber times format decided: explicit slot list per day. Appointments flow implemented in a dedicated phase after dashboards and profiles.*
