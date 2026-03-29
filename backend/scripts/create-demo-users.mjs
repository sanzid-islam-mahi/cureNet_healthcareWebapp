/**
 * Create or refresh multiple demo doctor and patient accounts with full profile data.
 *
 * Run from backend:
 *   npm run create-demo-users
 */

import db from '../src/models/index.js';

const {
  sequelize,
  User,
  Doctor,
  Patient,
  Clinic,
  PatientMedicalHistory,
  Appointment,
  Prescription,
  MedicationReminderPlan,
  MedicationReminderDose,
} = db;

import { buildDoseSchedule, extractMedicineSnapshot } from '../src/lib/reminders.js';

const CLINIC = {
  code: 'CURENET-DEMO-CLINIC',
  name: 'CureNet Central Clinic',
  type: 'clinic',
  phone: '+8801700000000',
  email: 'central.clinic@curenet.local',
  addressLine: 'House 12, Road 7, Dhanmondi',
  city: 'Dhaka',
  area: 'Dhanmondi',
  status: 'active',
  departments: ['Cardiology', 'General Medicine', 'Endocrinology', 'Pulmonology'],
  services: ['Consultation', 'Follow-up Care', 'Medical Imaging Review', 'Chronic Disease Management'],
  operatingHours: 'Sat-Thu: 8:00 AM - 8:00 PM',
  notes: 'Primary demo clinic used for seeded doctor, patient, and receptionist workflows.',
};

const DOCTORS = [
  {
    email: 'doctor.asha@curenet.local',
    password: 'Doctor123',
    firstName: 'Asha',
    lastName: 'Rahman',
    phone: '+8801711111111',
    dateOfBirth: '1984-08-17',
    gender: 'female',
    address: 'Dhaka, Bangladesh',
    profile: {
      bmdcRegistrationNumber: 'BMDC-102938',
      department: 'Cardiology',
      experience: 12,
      education: 'MBBS, MD (Cardiology), Dhaka Medical College',
      certifications: 'Advanced Cardiac Life Support, Echocardiography Training',
      hospital: 'CureNet Central Clinic',
      location: 'Dhanmondi, Dhaka',
      personalAddress: 'Flat 5B, House 22, Green Road, Dhaka',
      consultationFee: '1200.00',
      bio: 'Cardiologist focused on preventive heart care, follow-up management, and patient education.',
      verified: true,
      degrees: ['MBBS', 'MD (Cardiology)'],
      awards: ['Best Young Cardiologist 2022'],
      languages: ['Bangla', 'English'],
      services: ['Heart Consultation', 'Hypertension Management', 'Follow-up Review'],
      chamberWindows: {
        saturday: { morning: { enabled: true, maxPatients: 8 }, noon: { enabled: false, maxPatients: 0 }, evening: { enabled: true, maxPatients: 6 } },
        sunday: { morning: { enabled: true, maxPatients: 8 }, noon: { enabled: true, maxPatients: 4 }, evening: { enabled: false, maxPatients: 0 } },
        monday: { morning: { enabled: true, maxPatients: 10 }, noon: { enabled: false, maxPatients: 0 }, evening: { enabled: true, maxPatients: 8 } },
        tuesday: { morning: { enabled: true, maxPatients: 10 }, noon: { enabled: true, maxPatients: 4 }, evening: { enabled: false, maxPatients: 0 } },
        wednesday: { morning: { enabled: false, maxPatients: 0 }, noon: { enabled: true, maxPatients: 5 }, evening: { enabled: true, maxPatients: 7 } },
        thursday: { morning: { enabled: true, maxPatients: 8 }, noon: { enabled: false, maxPatients: 0 }, evening: { enabled: true, maxPatients: 5 } },
        friday: { morning: { enabled: false, maxPatients: 0 }, noon: { enabled: false, maxPatients: 0 }, evening: { enabled: false, maxPatients: 0 } },
      },
      unavailableDates: [],
    },
  },
  {
    email: 'doctor.farhan@curenet.local',
    password: 'Doctor123',
    firstName: 'Farhan',
    lastName: 'Kabir',
    phone: '+8801711111112',
    dateOfBirth: '1980-01-11',
    gender: 'male',
    address: 'Dhaka, Bangladesh',
    profile: {
      bmdcRegistrationNumber: 'BMDC-208811',
      department: 'General Medicine',
      experience: 15,
      education: 'MBBS, FCPS (Medicine), Chittagong Medical College',
      certifications: 'Diabetes Management Certification, Internal Medicine Fellowship',
      hospital: 'CureNet Central Clinic',
      location: 'Dhanmondi, Dhaka',
      personalAddress: 'House 18, Shyamoli, Dhaka',
      consultationFee: '1000.00',
      bio: 'General physician experienced in acute care, chronic disease management, and continuity follow-up.',
      verified: true,
      degrees: ['MBBS', 'FCPS (Medicine)'],
      awards: ['Community Care Excellence Award 2023'],
      languages: ['Bangla', 'English', 'Hindi'],
      services: ['General Consultation', 'Diabetes Follow-up', 'Preventive Care'],
      chamberWindows: {
        saturday: { morning: { enabled: true, maxPatients: 12 }, noon: { enabled: true, maxPatients: 6 }, evening: { enabled: false, maxPatients: 0 } },
        sunday: { morning: { enabled: true, maxPatients: 12 }, noon: { enabled: false, maxPatients: 0 }, evening: { enabled: true, maxPatients: 6 } },
        monday: { morning: { enabled: true, maxPatients: 12 }, noon: { enabled: true, maxPatients: 5 }, evening: { enabled: false, maxPatients: 0 } },
        tuesday: { morning: { enabled: false, maxPatients: 0 }, noon: { enabled: true, maxPatients: 6 }, evening: { enabled: true, maxPatients: 6 } },
        wednesday: { morning: { enabled: true, maxPatients: 10 }, noon: { enabled: false, maxPatients: 0 }, evening: { enabled: true, maxPatients: 5 } },
        thursday: { morning: { enabled: true, maxPatients: 10 }, noon: { enabled: true, maxPatients: 4 }, evening: { enabled: false, maxPatients: 0 } },
        friday: { morning: { enabled: false, maxPatients: 0 }, noon: { enabled: false, maxPatients: 0 }, evening: { enabled: false, maxPatients: 0 } },
      },
      unavailableDates: [],
    },
  },
  {
    email: 'doctor.nadia@curenet.local',
    password: 'Doctor123',
    firstName: 'Nadia',
    lastName: 'Sultana',
    phone: '+8801711111113',
    dateOfBirth: '1987-06-29',
    gender: 'female',
    address: 'Dhaka, Bangladesh',
    profile: {
      bmdcRegistrationNumber: 'BMDC-317744',
      department: 'Endocrinology',
      experience: 9,
      education: 'MBBS, MD (Endocrinology), BSMMU',
      certifications: 'Thyroid Ultrasound Interpretation, Diabetes Educator Training',
      hospital: 'CureNet Central Clinic',
      location: 'Dhanmondi, Dhaka',
      personalAddress: 'Flat 3C, Bashundhara Residential Area, Dhaka',
      consultationFee: '1300.00',
      bio: 'Endocrinologist working on thyroid disorders, diabetes, metabolic health, and long-term patient adherence.',
      verified: true,
      degrees: ['MBBS', 'MD (Endocrinology)'],
      awards: ['Best Specialist Speaker 2024'],
      languages: ['Bangla', 'English'],
      services: ['Endocrine Consultation', 'Thyroid Review', 'Metabolic Follow-up'],
      chamberWindows: {
        saturday: { morning: { enabled: false, maxPatients: 0 }, noon: { enabled: true, maxPatients: 5 }, evening: { enabled: true, maxPatients: 6 } },
        sunday: { morning: { enabled: true, maxPatients: 8 }, noon: { enabled: false, maxPatients: 0 }, evening: { enabled: true, maxPatients: 5 } },
        monday: { morning: { enabled: false, maxPatients: 0 }, noon: { enabled: true, maxPatients: 6 }, evening: { enabled: true, maxPatients: 6 } },
        tuesday: { morning: { enabled: true, maxPatients: 8 }, noon: { enabled: false, maxPatients: 0 }, evening: { enabled: true, maxPatients: 5 } },
        wednesday: { morning: { enabled: false, maxPatients: 0 }, noon: { enabled: true, maxPatients: 5 }, evening: { enabled: true, maxPatients: 5 } },
        thursday: { morning: { enabled: true, maxPatients: 8 }, noon: { enabled: false, maxPatients: 0 }, evening: { enabled: false, maxPatients: 0 } },
        friday: { morning: { enabled: false, maxPatients: 0 }, noon: { enabled: false, maxPatients: 0 }, evening: { enabled: false, maxPatients: 0 } },
      },
      unavailableDates: [],
    },
  },
];

const PATIENTS = [
  {
    email: 'patient.nabil@curenet.local',
    password: 'Patient123',
    firstName: 'Nabil',
    lastName: 'Hasan',
    phone: '+8801811111111',
    dateOfBirth: '1993-03-14',
    gender: 'male',
    address: 'Mirpur, Dhaka, Bangladesh',
    profile: {
      bloodType: 'B+',
      allergies: 'Penicillin, shellfish',
      emergencyContact: 'Farzana Hasan',
      emergencyPhone: '+8801911111111',
      insuranceProvider: 'Green Delta',
      insuranceNumber: 'GD-45892011',
    },
    medicalHistory: {
      chronicConditions: ['Hypertension', 'Type 2 diabetes'],
      pastProcedures: ['Appendectomy in 2014'],
      familyHistory: ['Father had coronary artery disease', 'Mother has type 2 diabetes'],
      currentLongTermMedications: ['Amlodipine 5 mg daily', 'Metformin 500 mg twice daily'],
      immunizationNotes: 'Completed standard adult immunization schedule. Annual flu vaccine taken in 2025.',
      lifestyleRiskNotes: 'Sedentary office routine, high work stress, advised to increase walking and reduce sodium intake.',
      generalMedicalNotes: 'Needs periodic blood pressure and HbA1c review. Good follow-up compliance.',
    },
  },
  {
    email: 'patient.sadia@curenet.local',
    password: 'Patient123',
    firstName: 'Sadia',
    lastName: 'Akter',
    phone: '+8801811111112',
    dateOfBirth: '1989-09-05',
    gender: 'female',
    address: 'Mohammadpur, Dhaka, Bangladesh',
    profile: {
      bloodType: 'O+',
      allergies: 'Dust, ibuprofen',
      emergencyContact: 'Rafiq Akter',
      emergencyPhone: '+8801911111112',
      insuranceProvider: 'Pragati Insurance',
      insuranceNumber: 'PI-77420019',
    },
    medicalHistory: {
      chronicConditions: ['Asthma'],
      pastProcedures: ['C-section in 2018'],
      familyHistory: ['Mother has asthma'],
      currentLongTermMedications: ['Budesonide inhaler as prescribed'],
      immunizationNotes: 'COVID booster completed in 2025.',
      lifestyleRiskNotes: 'Triggers include dust exposure and cold weather. Needs inhaler refill tracking.',
      generalMedicalNotes: 'Usually responds well to inhaled therapy and adherence coaching.',
    },
  },
  {
    email: 'patient.rashed@curenet.local',
    password: 'Patient123',
    firstName: 'Rashed',
    lastName: 'Karim',
    phone: '+8801811111113',
    dateOfBirth: '1978-12-21',
    gender: 'male',
    address: 'Uttara, Dhaka, Bangladesh',
    profile: {
      bloodType: 'A-',
      allergies: 'No known drug allergies',
      emergencyContact: 'Moumita Karim',
      emergencyPhone: '+8801911111113',
      insuranceProvider: 'MetLife Bangladesh',
      insuranceNumber: 'ML-00921874',
    },
    medicalHistory: {
      chronicConditions: ['Hypothyroidism', 'High cholesterol'],
      pastProcedures: ['Knee arthroscopy in 2019'],
      familyHistory: ['Brother has hypothyroidism'],
      currentLongTermMedications: ['Levothyroxine 50 mcg daily', 'Rosuvastatin 10 mg nightly'],
      immunizationNotes: 'Flu vaccine taken in late 2025.',
      lifestyleRiskNotes: 'Irregular exercise pattern. Advised to improve sleep and diet consistency.',
      generalMedicalNotes: 'Needs follow-up thyroid function review and lipid trend monitoring.',
    },
  },
];

const APPOINTMENT_SEEDS = [
  {
    patientEmail: 'patient.nabil@curenet.local',
    doctorEmail: 'doctor.asha@curenet.local',
    appointmentDate: '2026-03-22',
    window: 'morning',
    serial: 1,
    type: 'in_person',
    status: 'completed',
    reason: 'Chest discomfort and blood pressure review',
    symptoms: 'Occasional chest tightness, fatigue, elevated home blood pressure readings',
    prescription: {
      diagnosis: 'Stage 1 hypertension with non-cardiac chest discomfort',
      medicines: [
        {
          name: 'Amlodipine',
          strength: '5',
          dose: '1',
          unit: 'tablet',
          frequency: 'OD',
          duration: '30 days',
          route: 'Oral',
          instructions: 'Take every morning after breakfast',
        },
        {
          name: 'Napa',
          strength: '500',
          dose: '1',
          unit: 'tablet',
          frequency: 'SOS',
          duration: '5 days',
          route: 'Oral',
          instructions: 'Take only when needed for discomfort or headache',
        },
      ],
      notes: 'Reduce salt intake, record home BP, return with a 2-week BP log.',
    },
    reminders: [
      {
        medicineIndex: 0,
        scheduleTimes: ['08:00'],
        startDate: '2026-03-23',
        endDate: '2026-04-21',
        status: 'active',
      },
    ],
  },
  {
    patientEmail: 'patient.sadia@curenet.local',
    doctorEmail: 'doctor.farhan@curenet.local',
    appointmentDate: '2026-03-24',
    window: 'noon',
    serial: 2,
    type: 'in_person',
    status: 'completed',
    reason: 'Cough, wheeze, and asthma follow-up',
    symptoms: 'Night cough, wheezing, shortness of breath on exertion',
    prescription: {
      diagnosis: 'Mild persistent asthma with seasonal trigger exposure',
      medicines: [
        {
          name: 'Montelukast',
          strength: '10',
          dose: '1',
          unit: 'tablet',
          frequency: 'HS',
          duration: '30 days',
          route: 'Oral',
          instructions: 'Take at bedtime regularly',
        },
        {
          name: 'Levocetirizine',
          strength: '5',
          dose: '1',
          unit: 'tablet',
          frequency: 'OD',
          duration: '10 days',
          route: 'Oral',
          instructions: 'Take in the evening during allergy flare',
        },
      ],
      notes: 'Avoid dust exposure and review inhaler technique at the next visit.',
    },
    reminders: [
      {
        medicineIndex: 0,
        scheduleTimes: ['22:00'],
        startDate: '2026-03-24',
        endDate: '2026-04-22',
        status: 'active',
      },
    ],
  },
  {
    patientEmail: 'patient.rashed@curenet.local',
    doctorEmail: 'doctor.nadia@curenet.local',
    appointmentDate: '2026-03-25',
    window: 'evening',
    serial: 1,
    type: 'in_person',
    status: 'completed',
    reason: 'Thyroid review and lipid follow-up',
    symptoms: 'Fatigue, mild weight gain, irregular diet adherence',
    prescription: {
      diagnosis: 'Hypothyroidism with dyslipidemia follow-up',
      medicines: [
        {
          name: 'Levothyroxine',
          strength: '50',
          dose: '1',
          unit: 'tablet',
          frequency: 'OD',
          duration: '60 days',
          route: 'Oral',
          instructions: 'Take early morning on an empty stomach',
        },
        {
          name: 'Rosuvastatin',
          strength: '10',
          dose: '1',
          unit: 'tablet',
          frequency: 'HS',
          duration: '60 days',
          route: 'Oral',
          instructions: 'Take at bedtime daily',
        },
      ],
      notes: 'Repeat TSH and lipid profile after 6 weeks if symptoms persist.',
    },
    reminders: [
      {
        medicineIndex: 0,
        scheduleTimes: ['06:30'],
        startDate: '2026-03-26',
        endDate: '2026-05-24',
        status: 'active',
      },
      {
        medicineIndex: 1,
        scheduleTimes: ['22:00'],
        startDate: '2026-03-26',
        endDate: '2026-05-24',
        status: 'active',
      },
    ],
  },
  {
    patientEmail: 'patient.nabil@curenet.local',
    doctorEmail: 'doctor.farhan@curenet.local',
    appointmentDate: '2026-03-30',
    window: 'morning',
    serial: 3,
    type: 'in_person',
    status: 'approved',
    reason: 'General follow-up for blood pressure and fatigue',
    symptoms: 'Improved BP but persistent afternoon tiredness',
  },
  {
    patientEmail: 'patient.sadia@curenet.local',
    doctorEmail: 'doctor.nadia@curenet.local',
    appointmentDate: '2026-03-31',
    window: 'evening',
    serial: 2,
    type: 'in_person',
    status: 'requested',
    reason: 'Hormonal review after recent weight change',
    symptoms: 'Recent weight gain, low energy, irregular sleep',
  },
  {
    patientEmail: 'patient.rashed@curenet.local',
    doctorEmail: 'doctor.asha@curenet.local',
    appointmentDate: '2026-03-29',
    window: 'noon',
    serial: 1,
    type: 'in_person',
    status: 'in_progress',
    reason: 'Cardiac risk assessment consultation',
    symptoms: 'Occasional palpitations, family history concerns',
  },
];

async function upsertUser({
  email,
  password,
  firstName,
  lastName,
  phone,
  dateOfBirth,
  gender,
  address,
  role,
}, transaction) {
  const existing = await User.findOne({ where: { email }, transaction });
  if (existing && existing.role !== role) {
    throw new Error(`User ${email} already exists with role ${existing.role}, expected ${role}`);
  }

  if (existing) {
    await existing.update({
      password,
      firstName,
      lastName,
      phone,
      dateOfBirth,
      gender,
      address,
      isActive: true,
      emailVerifiedAt: existing.emailVerifiedAt || new Date(),
    }, { transaction });
    return existing;
  }

  return User.create({
    email,
    password,
    firstName,
    lastName,
    phone,
    dateOfBirth,
    gender,
    address,
    role,
    isActive: true,
    emailVerifiedAt: new Date(),
  }, { transaction });
}

async function upsertDoctor(seed, clinic, transaction) {
  const user = await upsertUser({ ...seed, role: 'doctor' }, transaction);
  const [doctor] = await Doctor.findOrCreate({
    where: { userId: user.id },
    defaults: {
      userId: user.id,
      clinicId: clinic.id,
      ...seed.profile,
    },
    transaction,
  });
  await doctor.update({
    clinicId: clinic.id,
    ...seed.profile,
  }, { transaction });
  return user;
}

async function upsertPatient(seed, transaction) {
  const user = await upsertUser({ ...seed, role: 'patient' }, transaction);
  const [patient] = await Patient.findOrCreate({
    where: { userId: user.id },
    defaults: {
      userId: user.id,
      ...seed.profile,
    },
    transaction,
  });
  await patient.update(seed.profile, { transaction });

  const [history] = await PatientMedicalHistory.findOrCreate({
    where: { patientId: patient.id },
    defaults: {
      patientId: patient.id,
      ...seed.medicalHistory,
    },
    transaction,
  });
  await history.update(seed.medicalHistory, { transaction });
  return user;
}

async function upsertAppointment(seed, doctorByEmail, patientByEmail, clinic, transaction) {
  const doctor = doctorByEmail.get(seed.doctorEmail);
  const patient = patientByEmail.get(seed.patientEmail);
  if (!doctor || !patient) {
    throw new Error(`Missing doctor or patient for appointment seed ${seed.patientEmail} -> ${seed.doctorEmail}`);
  }

  const where = {
    patientId: patient.id,
    doctorId: doctor.id,
    appointmentDate: seed.appointmentDate,
    window: seed.window,
    serial: seed.serial,
  };

  const [appointment] = await Appointment.findOrCreate({
    where,
    defaults: {
      ...where,
      clinicId: clinic.id,
      type: seed.type,
      status: seed.status,
      reason: seed.reason,
      symptoms: seed.symptoms,
    },
    transaction,
  });

  await appointment.update({
    clinicId: clinic.id,
    type: seed.type,
    status: seed.status,
    reason: seed.reason,
    symptoms: seed.symptoms,
  }, { transaction });

  return appointment;
}

async function upsertPrescription(appointment, seed, transaction) {
  if (!seed.prescription) return null;

  const [prescription] = await Prescription.findOrCreate({
    where: { appointmentId: appointment.id },
    defaults: {
      appointmentId: appointment.id,
      diagnosis: seed.prescription.diagnosis,
      medicines: seed.prescription.medicines,
      notes: seed.prescription.notes,
    },
    transaction,
  });

  await prescription.update({
    diagnosis: seed.prescription.diagnosis,
    medicines: seed.prescription.medicines,
    notes: seed.prescription.notes,
  }, { transaction });

  return prescription;
}

async function upsertReminderPlans(patient, appointment, prescription, reminderSeeds, transaction) {
  if (!prescription || !Array.isArray(reminderSeeds) || reminderSeeds.length === 0) {
    return;
  }

  for (const reminderSeed of reminderSeeds) {
    const snapshot = extractMedicineSnapshot(prescription, reminderSeed.medicineIndex);
    const schedule = buildDoseSchedule({
      scheduleTimes: reminderSeed.scheduleTimes,
      frequencyLabel: snapshot.frequencyLabel,
      startDate: reminderSeed.startDate,
      endDate: reminderSeed.endDate,
    });

    const [plan] = await MedicationReminderPlan.findOrCreate({
      where: {
        patientId: patient.id,
        prescriptionId: prescription.id,
        medicineIndex: reminderSeed.medicineIndex,
      },
      defaults: {
        patientId: patient.id,
        prescriptionId: prescription.id,
        appointmentId: appointment?.id || null,
        medicineIndex: reminderSeed.medicineIndex,
        medicineName: snapshot.medicineName,
        dosage: snapshot.dosage,
        frequencyLabel: snapshot.frequencyLabel,
        instructions: snapshot.instructions,
        status: reminderSeed.status || 'active',
        timezone: 'Asia/Dhaka',
        startDate: reminderSeed.startDate,
        endDate: reminderSeed.endDate,
        scheduleTimes: schedule.scheduleTimes,
        lastGeneratedAt: null,
      },
      transaction,
    });

    await plan.update({
      appointmentId: appointment?.id || null,
      medicineName: snapshot.medicineName,
      dosage: snapshot.dosage,
      frequencyLabel: snapshot.frequencyLabel,
      instructions: snapshot.instructions,
      status: reminderSeed.status || 'active',
      timezone: 'Asia/Dhaka',
      startDate: reminderSeed.startDate,
      endDate: reminderSeed.endDate,
      scheduleTimes: schedule.scheduleTimes,
      lastGeneratedAt: null,
    }, { transaction });

    await MedicationReminderDose.destroy({
      where: { reminderPlanId: plan.id },
      transaction,
    });

    const doseRows = schedule.doses.map((dose) => ({
      reminderPlanId: plan.id,
      scheduledAt: dose.scheduledAt,
      status: 'scheduled',
      metadata: dose.metadata,
    }));

    if (doseRows.length > 0) {
      await MedicationReminderDose.bulkCreate(doseRows, { transaction });
    }
  }
}

async function main() {
  try {
    await sequelize.authenticate();

    const transaction = await sequelize.transaction();
    try {
      const [clinic] = await Clinic.findOrCreate({
        where: { code: CLINIC.code },
        defaults: CLINIC,
        transaction,
      });
      await clinic.update(CLINIC, { transaction });

      const doctorUsers = [];
      const doctorByEmail = new Map();
      for (const doctorSeed of DOCTORS) {
        const user = await upsertDoctor(doctorSeed, clinic, transaction);
        doctorUsers.push(user);
        const doctorProfile = await Doctor.findOne({ where: { userId: user.id }, transaction });
        doctorByEmail.set(doctorSeed.email, doctorProfile);
      }

      const patientUsers = [];
      const patientByEmail = new Map();
      for (const patientSeed of PATIENTS) {
        const user = await upsertPatient(patientSeed, transaction);
        patientUsers.push(user);
        const patientProfile = await Patient.findOne({ where: { userId: user.id }, transaction });
        patientByEmail.set(patientSeed.email, patientProfile);
      }

      let appointmentsCreated = 0;
      let prescriptionsCreated = 0;
      let reminderPlansCreated = 0;

      for (const appointmentSeed of APPOINTMENT_SEEDS) {
        const appointment = await upsertAppointment(appointmentSeed, doctorByEmail, patientByEmail, clinic, transaction);
        appointmentsCreated += 1;

        const prescription = await upsertPrescription(appointment, appointmentSeed, transaction);
        if (prescription) {
          prescriptionsCreated += 1;
          const patient = patientByEmail.get(appointmentSeed.patientEmail);
          await upsertReminderPlans(patient, appointment, prescription, appointmentSeed.reminders, transaction);
          reminderPlansCreated += Array.isArray(appointmentSeed.reminders) ? appointmentSeed.reminders.length : 0;
        }
      }

      await transaction.commit();

      console.log('Demo users ready.');
      console.log('');
      console.log(`Clinic: ${CLINIC.name}`);
      console.log('');
      console.log('Doctor credentials:');
      for (const doctorSeed of DOCTORS) {
        console.log(`  - ${doctorSeed.email} / ${doctorSeed.password}`);
      }
      console.log('');
      console.log('Patient credentials:');
      for (const patientSeed of PATIENTS) {
        console.log(`  - ${patientSeed.email} / ${patientSeed.password}`);
      }
      console.log('');
      console.log(`Created or refreshed ${doctorUsers.length} doctors and ${patientUsers.length} patients.`);
      console.log(`Created or refreshed ${appointmentsCreated} appointments, ${prescriptionsCreated} prescriptions, and ${reminderPlansCreated} reminder plans.`);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Failed to create demo users:', error.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

main();
