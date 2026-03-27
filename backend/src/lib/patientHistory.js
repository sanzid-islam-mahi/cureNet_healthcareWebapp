export function normalizeTextArrayInput(value) {
  if (value == null || value === '') return [];
  if (Array.isArray(value)) {
    return value
      .map((entry) => String(entry ?? '').trim())
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(/\r?\n|,/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return [];
}

export function buildEmergencyReadiness(patient, user) {
  return Boolean(
    patient?.bloodType
      && patient?.emergencyContact
      && patient?.emergencyPhone
      && user?.phone
      && user?.dateOfBirth
  );
}

export function buildMedicalHistorySummary({ patient, user, activeReminderCount, activeMedicationNames }) {
  const emergencyReady = buildEmergencyReadiness(patient, user);
  return {
    bloodType: patient?.bloodType ?? null,
    allergies: patient?.allergies ?? null,
    emergencyContact: patient?.emergencyContact ?? null,
    emergencyPhone: patient?.emergencyPhone ?? null,
    emergencyReady,
    activeReminderCount,
    activeMedicationNames,
  };
}

export function buildTimelineEntries(completedAppointments) {
  return completedAppointments
    .map((appointment) => {
      const plain = appointment.get ? appointment.get({ plain: true }) : appointment;
      const doctor = plain.Doctor?.User;
      const prescription = plain.Prescription;
      return {
        appointmentId: plain.id,
        appointmentDate: plain.appointmentDate,
        appointmentType: plain.type,
        status: plain.status,
        doctor: doctor
          ? {
              firstName: doctor.firstName,
              lastName: doctor.lastName,
            }
          : null,
        diagnosis: prescription?.diagnosis ?? null,
        medicineCount: Array.isArray(prescription?.medicines) ? prescription.medicines.length : 0,
        prescriptionId: prescription?.id ?? null,
      };
    })
    .sort((a, b) => {
      const timeA = new Date(a.appointmentDate ?? 0).getTime();
      const timeB = new Date(b.appointmentDate ?? 0).getTime();
      return timeB - timeA;
    });
}

export function buildPrescriptionHistoryEntries(prescriptions, activePlansByPrescriptionMedicine) {
  return prescriptions
    .map((prescription) => {
      const plain = prescription.get ? prescription.get({ plain: true }) : prescription;
      const doctor = plain.Appointment?.Doctor?.User;
      const medicines = Array.isArray(plain.medicines) ? plain.medicines : [];

      return {
        id: plain.id,
        appointmentId: plain.appointmentId,
        diagnosis: plain.diagnosis ?? null,
        notes: plain.notes ?? null,
        createdAt: plain.createdAt ?? null,
        appointment: plain.Appointment
          ? {
              appointmentDate: plain.Appointment.appointmentDate,
              type: plain.Appointment.type,
              doctor: doctor
                ? {
                    firstName: doctor.firstName,
                    lastName: doctor.lastName,
                  }
                : null,
            }
          : null,
        medicines: medicines.map((medicine, index) => {
          const activePlan = activePlansByPrescriptionMedicine.get(`${plain.id}:${index}`);
          return {
            ...medicine,
            activeReminder: activePlan
              ? {
                  id: activePlan.id,
                  status: activePlan.status,
                  scheduleTimes: activePlan.scheduleTimes ?? [],
                }
              : null,
          };
        }),
      };
    })
    .sort((a, b) => new Date(b.appointment?.appointmentDate ?? 0).getTime() - new Date(a.appointment?.appointmentDate ?? 0).getTime());
}
