import { Op } from 'sequelize';

const WEEKDAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export function getWeekday(dateStr) {
  const date = new Date(`${dateStr}T12:00:00`);
  return WEEKDAY_NAMES[date.getDay()];
}

export function isValidDateString(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function resolveAppointmentSlot({
  Appointment,
  doctor,
  doctorId,
  appointmentDate,
  window,
  timeBlock,
  excludeAppointmentId = null,
  transaction,
}) {
  if (!doctor) {
    return { error: { status: 404, message: 'Doctor not found' } };
  }
  if (!doctor.clinicId) {
    return { error: { status: 409, message: 'This doctor is not assigned to an active clinic yet' } };
  }
  if (!isValidDateString(appointmentDate)) {
    return { error: { status: 400, message: 'Valid appointmentDate (YYYY-MM-DD) required' } };
  }

  const doctorUnavailableDates = Array.isArray(doctor.unavailableDates) ? doctor.unavailableDates : [];
  if (doctorUnavailableDates.includes(appointmentDate)) {
    return { error: { status: 409, message: 'Doctor is unavailable on this date' } };
  }

  if (window) {
    const weekday = getWeekday(appointmentDate);
    const chamberWindows = doctor.chamberWindows || {};
    const dayWindows = chamberWindows[weekday] || {};
    const winConfig = dayWindows[window];
    if (!winConfig || !winConfig.enabled) {
      return { error: { status: 400, message: `Window "${window}" is not available for this doctor on this day` } };
    }

    const where = {
      doctorId,
      appointmentDate,
      window,
      status: { [Op.notIn]: ['cancelled', 'rejected'] },
    };
    if (excludeAppointmentId) {
      where.id = { [Op.ne]: excludeAppointmentId };
    }

    const bookedCount = await Appointment.count({ where, transaction });
    const maxPatients = winConfig.maxPatients || 0;
    if (maxPatients > 0 && bookedCount >= maxPatients) {
      return { error: { status: 409, message: 'Window is full' } };
    }

    return {
      clinicId: doctor.clinicId,
      windowName: window,
      serialNum: bookedCount + 1,
      legacyTimeBlock: null,
    };
  }

  if (timeBlock) {
    const chamberTimes = doctor.chamberTimes || {};
    const weekday = getWeekday(appointmentDate);
    const daySlots = Array.isArray(chamberTimes[weekday]) ? chamberTimes[weekday] : [];
    if (!daySlots.includes(timeBlock)) {
      return { error: { status: 400, message: 'Time slot not available for this doctor on this day' } };
    }

    const where = {
      doctorId,
      appointmentDate,
      timeBlock,
      status: { [Op.notIn]: ['cancelled', 'rejected'] },
    };
    if (excludeAppointmentId) {
      where.id = { [Op.ne]: excludeAppointmentId };
    }

    const existing = await Appointment.findOne({ where, transaction });
    if (existing) {
      return { error: { status: 409, message: 'Slot already booked' } };
    }

    return {
      clinicId: doctor.clinicId,
      windowName: null,
      serialNum: null,
      legacyTimeBlock: timeBlock,
    };
  }

  return { error: { status: 400, message: 'Either window or timeBlock required' } };
}

export function getAppointmentScheduleConflictReason(appointment, doctor) {
  const doctorUnavailableDates = Array.isArray(doctor?.unavailableDates) ? doctor.unavailableDates : [];
  if (doctorUnavailableDates.includes(appointment.appointmentDate)) {
    return 'doctor_unavailable_on_date';
  }

  if (appointment.window) {
    const weekday = getWeekday(appointment.appointmentDate);
    const dayWindows = doctor?.chamberWindows?.[weekday] || {};
    const winConfig = dayWindows[appointment.window];
    if (!winConfig || !winConfig.enabled) {
      return 'window_removed';
    }
    const maxPatients = winConfig.maxPatients || 0;
    if (maxPatients > 0 && appointment.serial && appointment.serial > maxPatients) {
      return 'window_capacity_reduced';
    }
  }

  return null;
}
