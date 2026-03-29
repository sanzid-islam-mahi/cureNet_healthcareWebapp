import db from '../models/index.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { Op } from 'sequelize';
import { serializeMedicalImagingRecord } from '../lib/medicalImaging.js';
import { optimizeProfileImage } from '../lib/profileImages.js';
import { getJson, setJson } from '../lib/cache.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { User, Doctor, Appointment, Rating, Prescription, Patient, PatientMedicalHistory, MedicationReminderPlan, Clinic, MedicalImagingRecord } = db;

const WEEKDAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const PUBLIC_DOCTORS_CACHE_TTL_SECONDS = 300;

function getWeekday(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return WEEKDAY_NAMES[d.getDay()];
}

function normalizeUnavailableDates(value) {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.filter((d) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d))));
}

function serializeClinic(clinic) {
  if (!clinic) return null;
  const value = clinic.toJSON ? clinic.toJSON() : clinic;
  return {
    id: value.id,
    name: value.name,
    type: value.type,
    phone: value.phone,
    email: value.email,
    addressLine: value.addressLine,
    city: value.city,
    area: value.area,
    status: value.status,
    operatingHours: value.operatingHours,
  };
}

function formatDoctorResponse(doctor, user, { includePrivate = false } = {}) {
  const u = user ? (user.toJSON ? user.toJSON() : user) : {};
  const { password: _, ...userSafe } = u;
  const d = doctor ? (doctor.toJSON ? doctor.toJSON() : doctor) : {};
  if (!includePrivate) {
    delete d.personalAddress;
  }
  if (d.Clinic) {
    d.clinic = serializeClinic(d.Clinic);
  }
  return { ...d, user: userSafe };
}

function describeTodayWindows(chamberWindows, dateStr) {
  if (!dateStr) return [];
  const weekday = getWeekday(dateStr);
  const dayWindows = chamberWindows?.[weekday] || {};
  const labels = {
    morning: 'Morning',
    noon: 'Noon',
    evening: 'Evening',
  };

  return Object.entries(dayWindows)
    .filter(([, config]) => config?.enabled)
    .map(([key, config]) => ({
      key,
      label: labels[key] || key,
      maxPatients: config?.maxPatients ?? null,
    }));
}

function ensureDoctorAccess(req, res, doctorId) {
  const user = req.user;
  if (user.role !== 'doctor' || user.doctorId !== doctorId) {
    res.status(403).json({ success: false, message: 'Unauthorized' });
    return false;
  }
  return true;
}

function buildPublicDoctorsCacheKey({ limit, department }) {
  const normalizedLimit = Number.isFinite(limit) && limit > 0 ? limit : 'all';
  const normalizedDepartment = department ? String(department).trim().toLowerCase() : 'all';
  return `public:doctors:list:limit=${normalizedLimit}:department=${normalizedDepartment}`;
}

export async function list(req, res) {
  try {
    const { department, limit } = req.query;
    const parsedLimit = parseInt(limit, 10);
    const cacheKey = buildPublicDoctorsCacheKey({ limit: parsedLimit, department });
    const cached = await getJson(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const where = { verified: true };
    if (department) where.department = department;
    const options = {
      where,
      include: [
        { model: User, as: 'User', attributes: { exclude: ['password'] } },
        { model: Clinic, as: 'Clinic', attributes: ['id', 'name', 'type', 'phone', 'email', 'addressLine', 'city', 'area', 'status', 'operatingHours'], required: false },
      ],
    };
    if (Number.isFinite(parsedLimit) && parsedLimit > 0) options.limit = Math.min(parsedLimit, 100);
    const doctors = await Doctor.findAll(options);
    const list = doctors.map((d) => formatDoctorResponse(d, d.User));
    const payload = { success: true, data: { doctors: list } };
    await setJson(cacheKey, payload, PUBLIC_DOCTORS_CACHE_TTL_SECONDS);
    return res.json(payload);
  } catch (err) {
    console.error('List doctors error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed' });
  }
}

export async function getProfile(req, res) {
  try {
    const user = req.user;
    if (user.role !== 'doctor' || !user.doctorId) {
      return res.status(403).json({ success: false, message: 'Not a doctor' });
    }
    const doctor = await Doctor.findByPk(user.doctorId, {
      include: [
        { model: User, as: 'User', attributes: { exclude: ['password'] } },
        { model: Clinic, as: 'Clinic', attributes: ['id', 'name', 'type', 'phone', 'email', 'addressLine', 'city', 'area', 'status', 'operatingHours'], required: false },
      ],
    });
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor profile not found' });
    }
    return res.json({
      success: true,
      data: { doctor: formatDoctorResponse(doctor, doctor.User, { includePrivate: true }) },
    });
  } catch (err) {
    console.error('Get doctor profile error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed' });
  }
}

export async function updateProfile(req, res) {
  try {
    const user = req.user;
    if (user.role !== 'doctor' || !user.doctorId) {
      return res.status(403).json({ success: false, message: 'Not a doctor' });
    }
    const doctor = await Doctor.findByPk(user.doctorId);
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor profile not found' });
    }
    const allowed = [
      'bmdcRegistrationNumber', 'department', 'experience', 'education', 'certifications',
      'hospital', 'location', 'personalAddress', 'consultationFee', 'bio', 'chamberTimes', 'chamberWindows', 'degrees', 'awards',
      'languages', 'services', 'unavailableDates',
    ];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    if (updates.unavailableDates !== undefined) {
      updates.unavailableDates = normalizeUnavailableDates(updates.unavailableDates);
    }
    await doctor.update(updates);
    const updated = await Doctor.findByPk(doctor.id, {
      include: [
        { model: User, as: 'User', attributes: { exclude: ['password'] } },
        { model: Clinic, as: 'Clinic', attributes: ['id', 'name', 'type', 'phone', 'email', 'addressLine', 'city', 'area', 'status', 'operatingHours'], required: false },
      ],
    });
    return res.json({
      success: true,
      data: { doctor: formatDoctorResponse(updated, updated.User, { includePrivate: true }) },
    });
  } catch (err) {
    console.error('Update doctor profile error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Update failed' });
  }
}

export async function uploadImage(req, res) {
  try {
    const user = req.user;
    if (user.role !== 'doctor' || !user.doctorId) {
      return res.status(403).json({ success: false, message: 'Not a doctor' });
    }
    if (!req.file || !req.file.filename) {
      return res.status(400).json({ success: false, message: 'No image file uploaded' });
    }
    const optimizedImage = await optimizeProfileImage(req.file, { prefix: 'doctor' });
    const imageUrl = optimizedImage.imageUrl;
    const doctor = await Doctor.findByPk(user.doctorId);
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor profile not found' });
    }
    await doctor.update({ profileImage: imageUrl });
    return res.json({ success: true, data: { imageUrl } });
  } catch (err) {
    console.error('Upload doctor image error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Upload failed' });
  }
}

export async function getDashboardStats(req, res) {
  try {
    const doctorId = parseInt(req.params.id, 10);
    const user = req.user;
    if (user.role !== 'doctor' || user.doctorId !== doctorId) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    const today = new Date().toISOString().slice(0, 10);
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    const dateFrom = fourteenDaysAgo.toISOString().slice(0, 10);
    const [totalAppointments, todayAppointments, completedAppointments, pendingAppointments, requestedAppointments, inProgressAppointments, totalPatients, completedRecent] = await Promise.all([
      Appointment.count({ where: { doctorId } }),
      Appointment.count({ where: { doctorId, appointmentDate: today, status: { [Op.notIn]: ['cancelled', 'rejected'] } } }),
      Appointment.count({ where: { doctorId, status: 'completed' } }),
      Appointment.count({ where: { doctorId, status: 'approved' } }),
      Appointment.count({ where: { doctorId, status: 'requested' } }),
      Appointment.count({ where: { doctorId, status: 'in_progress' } }),
      Appointment.count({ where: { doctorId }, distinct: true, col: 'patientId' }),
      Appointment.findAll({
        where: {
          doctorId,
          status: 'completed',
          appointmentDate: { [Op.gte]: dateFrom },
        },
        attributes: ['id'],
        raw: true,
      }),
    ]);
    const completedIds = completedRecent.map((a) => a.id);
    let outstandingFollowUps = 0;
    if (completedIds.length > 0) {
      const prescribedCount = await Prescription.count({
        where: { appointmentId: { [Op.in]: completedIds } },
      });
      outstandingFollowUps = Math.max(0, completedIds.length - prescribedCount);
    }
    return res.json({
      success: true,
      data: {
        stats: {
          totalAppointments,
          todayAppointments,
          completedAppointments,
          pendingAppointments,
          requestedAppointments,
          inProgressAppointments,
          totalPatients,
          queue: {
            pendingApprovals: requestedAppointments,
            todaysCareTasks: requestedAppointments + pendingAppointments + inProgressAppointments,
            outstandingFollowUps,
          },
        },
      },
    });
  } catch (err) {
    console.error('Get doctor dashboard stats error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed' });
  }
}

export async function getClinicRosterForReceptionist(req, res) {
  try {
    const user = req.user;
    if (user.role !== 'receptionist' || !user.clinicId) {
      return res.status(403).json({ success: false, message: 'Not a receptionist' });
    }

    const today = new Date().toISOString().slice(0, 10);
    const clinic = await Clinic.findByPk(user.clinicId, {
      attributes: ['id', 'name', 'type', 'phone', 'email', 'addressLine', 'city', 'area', 'status', 'operatingHours'],
    });

    const doctors = await Doctor.findAll({
      where: { clinicId: user.clinicId },
      attributes: [
        'id',
        'userId',
        'department',
        'experience',
        'verified',
        'consultationFee',
        'clinicId',
        'chamberWindows',
        'unavailableDates',
      ],
      include: [
        { model: User, as: 'User', attributes: ['id', 'firstName', 'lastName', 'email', 'phone'] },
      ],
      order: [['id', 'ASC']],
    });

    const doctorIds = doctors.map((doctor) => doctor.id);
    const todaysAppointments = doctorIds.length
      ? await Appointment.findAll({
          where: {
            doctorId: { [Op.in]: doctorIds },
            clinicId: user.clinicId,
            appointmentDate: today,
            status: { [Op.notIn]: ['cancelled', 'rejected'] },
          },
          attributes: ['doctorId', 'status', 'window'],
          raw: true,
        })
      : [];

    const queueByDoctor = new Map();
    for (const appointment of todaysAppointments) {
      const current = queueByDoctor.get(appointment.doctorId) || {
        totalToday: 0,
        requested: 0,
        approved: 0,
        inProgress: 0,
        completed: 0,
      };
      current.totalToday += 1;
      if (appointment.status === 'requested') current.requested += 1;
      if (appointment.status === 'approved') current.approved += 1;
      if (appointment.status === 'in_progress') current.inProgress += 1;
      if (appointment.status === 'completed') current.completed += 1;
      queueByDoctor.set(appointment.doctorId, current);
    }

    const roster = doctors.map((doctor) => {
      const plain = doctor.get({ plain: true });
      const counts = queueByDoctor.get(doctor.id) || {
        totalToday: 0,
        requested: 0,
        approved: 0,
        inProgress: 0,
        completed: 0,
      };
      const unavailableDates = Array.isArray(plain.unavailableDates) ? plain.unavailableDates : [];

      return {
        id: plain.id,
        userId: plain.userId,
        department: plain.department,
        experience: plain.experience,
        verified: plain.verified,
        consultationFee: plain.consultationFee,
        isAvailableToday: !unavailableDates.includes(today),
        todayWindows: describeTodayWindows(plain.chamberWindows, today),
        queue: counts,
        user: plain.User
          ? {
              id: plain.User.id,
              firstName: plain.User.firstName,
              lastName: plain.User.lastName,
              email: plain.User.email,
              phone: plain.User.phone,
            }
          : null,
      };
    });

    return res.json({
      success: true,
      data: {
        clinic: serializeClinic(clinic),
        date: today,
        doctors: roster,
      },
    });
  } catch (err) {
    console.error('Get receptionist clinic roster error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed' });
  }
}

export async function getAppointments(req, res) {
  try {
    const doctorId = parseInt(req.params.id, 10);
    if (!ensureDoctorAccess(req, res, doctorId)) return;
    const { date, status, limit = 20, page = 1 } = req.query;
    const where = { doctorId };
    if (date) where.appointmentDate = date;
    if (status) where.status = status;
    const limitNum = Math.min(parseInt(limit, 10) || 20, 100);
    const offset = (Math.max(1, parseInt(page, 10)) - 1) * limitNum;
    const { Patient } = db;
    const { rows, count } = await Appointment.findAndCountAll({
      where,
      limit: limitNum,
      offset,
      order: [['appointment_date', 'ASC'], ['time_block', 'ASC']],
      include: [
        { model: Patient, as: 'Patient', include: [{ model: User, as: 'User', attributes: { exclude: ['password'] } }] },
      ],
    });
    const list = rows.map((a) => {
      const d = a.get({ plain: true });
      return {
        id: d.id,
        patientId: d.patientId,
        doctorId: d.doctorId,
        appointmentDate: d.appointmentDate,
        timeBlock: d.timeBlock,
        type: d.type,
        reason: d.reason,
        symptoms: d.symptoms,
        window: d.window,
        serial: d.serial,
        status: d.status,
        createdAt: d.createdAt,
        patient: d.Patient ? { id: d.Patient.id, user: d.Patient.User } : null,
      };
    });
    return res.json({
      success: true,
      data: { appointments: list },
      pagination: { page: parseInt(page, 10), limit: limitNum, total: count },
    });
  } catch (err) {
    console.error('Get doctor appointments error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed' });
  }
}

export async function getPatients(req, res) {
  try {
    const doctorId = parseInt(req.params.id, 10);
    if (!ensureDoctorAccess(req, res, doctorId)) return;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const offset = (page - 1) * limit;
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

    const where = { doctorId };
    const include = [{
      model: Patient,
      as: 'Patient',
      include: [{
        model: User,
        as: 'User',
        attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'dateOfBirth', 'gender'],
        ...(search ? {
          where: {
            [Op.or]: [
              { firstName: { [Op.like]: `%${search}%` } },
              { lastName: { [Op.like]: `%${search}%` } },
              { email: { [Op.like]: `%${search}%` } },
            ],
          },
        } : {}),
      }],
    }];

    const { rows, count } = await Appointment.findAndCountAll({
      where,
      include,
      order: [['appointment_date', 'DESC'], ['created_at', 'DESC']],
      limit: limit * 5,
      offset: 0,
    });

    const grouped = new Map();
    for (const row of rows) {
      const plain = row.get({ plain: true });
      const pid = plain.patientId;
      if (!pid || !plain.Patient?.User) continue;
      if (!grouped.has(pid)) {
        grouped.set(pid, {
          patientId: pid,
          user: plain.Patient.User,
          profile: {
            bloodType: plain.Patient.bloodType,
            allergies: plain.Patient.allergies,
            emergencyContact: plain.Patient.emergencyContact,
            emergencyPhone: plain.Patient.emergencyPhone,
          },
          totalVisits: 0,
          lastVisitDate: null,
          nextVisitDate: null,
        });
      }
      const g = grouped.get(pid);
      g.totalVisits += 1;
      const date = plain.appointmentDate;
      if (!g.lastVisitDate || date > g.lastVisitDate) g.lastVisitDate = date;
      if (
        ['requested', 'approved', 'in_progress'].includes(plain.status)
        && (!g.nextVisitDate || date < g.nextVisitDate)
      ) {
        g.nextVisitDate = date;
      }
    }

    const all = Array.from(grouped.values())
      .sort((a, b) => (b.lastVisitDate || '').localeCompare(a.lastVisitDate || ''));
    const paged = all.slice(offset, offset + limit);
    return res.json({
      success: true,
      data: {
        patients: paged,
        total: search ? all.length : Math.max(all.length, count),
        page,
        limit,
      },
    });
  } catch (err) {
    console.error('Get doctor patients error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed' });
  }
}

export async function getPatientContext(req, res) {
  try {
    const doctorId = parseInt(req.params.id, 10);
    const patientId = parseInt(req.params.patientId, 10);
    if (!ensureDoctorAccess(req, res, doctorId)) return;

    const relationCount = await Appointment.count({ where: { doctorId, patientId } });
    if (!relationCount) {
      return res.status(404).json({ success: false, message: 'Patient not found for this doctor' });
    }

    const patient = await Patient.findByPk(patientId, {
      include: [{ model: User, as: 'User', attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'dateOfBirth', 'gender', 'address'] }],
    });
    if (!patient || !patient.User) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    const [historyRecord, recentAppointments, recentPrescriptions, activeReminderPlans, imagingRecords] = await Promise.all([
      PatientMedicalHistory.findOne({ where: { patientId } }),
      Appointment.findAll({
        where: { doctorId, patientId },
        include: [{ model: Prescription, as: 'Prescription', required: false }],
        order: [['appointment_date', 'DESC'], ['created_at', 'DESC']],
        limit: 8,
      }),
      Prescription.findAll({
        include: [
          {
            model: Appointment,
            as: 'Appointment',
            where: { doctorId, patientId },
            attributes: ['id', 'appointmentDate', 'status', 'type', 'reason', 'symptoms', 'window', 'serial'],
            required: true,
          },
        ],
        order: [['createdAt', 'DESC']],
        limit: 8,
      }),
      MedicationReminderPlan.findAll({
        where: { patientId, status: { [Op.in]: ['active', 'paused'] } },
        attributes: ['id', 'prescriptionId', 'medicineIndex', 'medicineName', 'status', 'scheduleTimes'],
      }),
      MedicalImagingRecord.findAll({
        where: { patientId },
        include: [
          { model: User, as: 'Uploader', attributes: ['id', 'firstName', 'lastName', 'email'] },
          {
            model: Appointment,
            as: 'Appointment',
            where: { doctorId, patientId },
            attributes: ['id', 'appointmentDate', 'type', 'status', 'clinicId'],
            required: true,
            include: [{ model: Clinic, as: 'Clinic', attributes: ['id', 'name', 'type', 'addressLine', 'area', 'city', 'phone', 'status'], required: false }],
          },
        ],
        order: [['studyDate', 'DESC'], ['createdAt', 'DESC']],
        limit: 8,
      }),
    ]);

    const appointments = recentAppointments.map((a) => {
      const p = a.get({ plain: true });
      return {
        id: p.id,
        appointmentDate: p.appointmentDate,
        status: p.status,
        type: p.type,
        window: p.window,
        serial: p.serial,
        reason: p.reason,
        symptoms: p.symptoms,
        hasPrescription: Boolean(p.Prescription),
        diagnosis: p.Prescription?.diagnosis || null,
      };
    });

    const reminderPlansByPrescriptionMedicine = new Map(
      activeReminderPlans.map((plan) => {
        const plain = plan.get({ plain: true });
        return [`${plain.prescriptionId}:${plain.medicineIndex}`, plain];
      })
    );

    const prescriptions = recentPrescriptions.map((prescription) => {
      const plain = prescription.get({ plain: true });
      const medicines = Array.isArray(plain.medicines) ? plain.medicines : [];
      return {
        id: plain.id,
        appointmentId: plain.appointmentId,
        diagnosis: plain.diagnosis,
        notes: plain.notes,
        createdAt: plain.createdAt,
        appointment: plain.Appointment
          ? {
              id: plain.Appointment.id,
              appointmentDate: plain.Appointment.appointmentDate,
              status: plain.Appointment.status,
              type: plain.Appointment.type,
              reason: plain.Appointment.reason,
              symptoms: plain.Appointment.symptoms,
              window: plain.Appointment.window,
              serial: plain.Appointment.serial,
            }
          : null,
        medicines: medicines.map((medicine, index) => ({
          ...medicine,
          activeReminder: reminderPlansByPrescriptionMedicine.get(`${plain.id}:${index}`) || null,
        })),
      };
    });

    const pj = patient.get({ plain: true });
    return res.json({
      success: true,
      data: {
        patient: {
          id: pj.id,
          user: pj.User,
          medical: {
            bloodType: pj.bloodType,
            allergies: pj.allergies,
            emergencyContact: pj.emergencyContact,
            emergencyPhone: pj.emergencyPhone,
            insuranceProvider: pj.insuranceProvider,
            insuranceNumber: pj.insuranceNumber,
            profileImage: pj.profileImage,
          },
          history: {
            chronicConditions: historyRecord?.chronicConditions ?? [],
            pastProcedures: historyRecord?.pastProcedures ?? [],
            familyHistory: historyRecord?.familyHistory ?? [],
            currentLongTermMedications: historyRecord?.currentLongTermMedications ?? [],
            immunizationNotes: historyRecord?.immunizationNotes ?? '',
            lifestyleRiskNotes: historyRecord?.lifestyleRiskNotes ?? '',
            generalMedicalNotes: historyRecord?.generalMedicalNotes ?? '',
          },
          summary: {
            totalVisitsWithDoctor: relationCount,
            prescriptionCount: prescriptions.length,
            activeReminderCount: activeReminderPlans.length,
            imagingCount: imagingRecords.length,
            recentAppointments: appointments,
          },
          prescriptions,
          imaging: imagingRecords.map(serializeMedicalImagingRecord),
        },
      },
    });
  } catch (err) {
    console.error('Get patient context error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed' });
  }
}

export async function getAvailableSlots(req, res) {
  try {
    const doctorId = parseInt(req.params.id, 10);
    const { date } = req.query;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ success: false, message: 'Valid date (YYYY-MM-DD) required' });
    }
    const doctor = await Doctor.findByPk(doctorId);
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }
    const weekday = getWeekday(date);
    const chamberWindows = doctor.chamberWindows || {};
    const dayWindows = chamberWindows[weekday] || {};
    const unavailableDates = normalizeUnavailableDates(doctor.unavailableDates);
    if (unavailableDates.includes(date)) {
      return res.json({
        success: true,
        data: {
          windows: [],
          blackout: true,
          message: 'Doctor is unavailable on this date',
        },
      });
    }
    
    const windows = [
      { key: 'morning', label: 'Morning (09:00–13:00)', timeRange: '09:00–13:00' },
      { key: 'noon', label: 'Noon (13:00–17:00)', timeRange: '13:00–17:00' },
      { key: 'evening', label: 'Evening (17:00–18:00)', timeRange: '17:00–18:00' },
    ];
    
    const booked = await Appointment.findAll({
      where: {
        doctorId,
        appointmentDate: date,
        status: { [Op.notIn]: ['cancelled', 'rejected'] },
      },
      attributes: ['window', 'serial'],
    });
    
    const bookedByWindow = {};
    for (const apt of booked) {
      const win = apt.window;
      if (win) {
        if (!bookedByWindow[win]) bookedByWindow[win] = [];
        bookedByWindow[win].push(apt.serial || 0);
      }
    }
    
    const available = windows.map((w) => {
      const config = dayWindows[w.key] || {};
      const enabled = config.enabled === true;
      const maxPatients = config.maxPatients || 0;
      const bookedCount = (bookedByWindow[w.key] || []).length;
      const spotsLeft = enabled && maxPatients > 0 ? Math.max(0, maxPatients - bookedCount) : (enabled ? 999 : 0);
      
      return {
        window: w.key,
        label: w.label,
        timeRange: w.timeRange,
        enabled,
        maxPatients: maxPatients || null,
        booked: bookedCount,
        spotsLeft,
        available: enabled && (maxPatients === 0 || spotsLeft > 0),
      };
    });
    
    return res.json({ success: true, data: { windows: available } });
  } catch (err) {
    console.error('Get available slots error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed' });
  }
}

export async function getPublicProfile(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ success: false, message: 'Invalid doctor id' });
    }
    const doctor = await Doctor.findByPk(id, {
      include: [
        { model: User, as: 'User', attributes: { exclude: ['password'] } },
        { model: Clinic, as: 'Clinic', attributes: ['id', 'name', 'type', 'phone', 'email', 'addressLine', 'city', 'area', 'status', 'operatingHours'], required: false },
      ],
    });
    if (!doctor || !doctor.verified) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }
    const patientCount = await Appointment.count({
      where: { doctorId: id },
      distinct: true,
      col: 'patientId',
    });
    const doctorJson = formatDoctorResponse(doctor, doctor.User);
    return res.json({
      success: true,
      data: {
        doctor: { ...doctorJson, patientCount },
      },
    });
  } catch (err) {
    console.error('Get public doctor profile error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed' });
  }
}

export async function getUpcomingSlots(req, res) {
  try {
    const doctorId = parseInt(req.params.id, 10);
    const days = Math.min(30, Math.max(1, parseInt(req.query.days, 10) || 14));
    const doctor = await Doctor.findByPk(doctorId);
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }
    if (!doctor.verified) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }
    const unavailableDates = new Set(normalizeUnavailableDates(doctor.unavailableDates));
    const chamberWindows = doctor.chamberWindows || {};
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const windows = [
      { key: 'morning', label: 'Morning', timeRange: '09:00–13:00' },
      { key: 'noon', label: 'Noon', timeRange: '13:00–17:00' },
      { key: 'evening', label: 'Evening', timeRange: '17:00–18:00' },
    ];
    const slots = [];
    const today = new Date();
    for (let i = 0; i < days; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      if (unavailableDates.has(dateStr)) continue;
      const weekday = dayNames[d.getDay()];
      const dayWindows = chamberWindows[weekday] || {};
      const booked = await Appointment.findAll({
        where: {
          doctorId,
          appointmentDate: dateStr,
          status: { [Op.notIn]: ['cancelled', 'rejected'] },
        },
        attributes: ['window', 'serial'],
      });

      const upcomingWindows = windows
        .map((window) => {
          const config = dayWindows[window.key] || {};
          const enabled = config.enabled === true;
          const maxPatients = config.maxPatients || 0;
          const bookedCount = booked.filter((appointment) => appointment.window === window.key).length;
          const spotsLeft = enabled && maxPatients > 0
            ? Math.max(0, maxPatients - bookedCount)
            : (enabled ? null : 0);

          return {
            window: window.key,
            label: window.label,
            timeRange: window.timeRange,
            enabled,
            maxPatients: maxPatients || null,
            booked: bookedCount,
            spotsLeft,
            available: enabled && (maxPatients === 0 || bookedCount < maxPatients),
          };
        })
        .filter((window) => window.available);

      if (upcomingWindows.length === 0) continue;

      slots.push({
        date: dateStr,
        dayName: weekday.charAt(0).toUpperCase() + weekday.slice(1),
        windows: upcomingWindows,
      });
    }
    return res.json({ success: true, data: { slots } });
  } catch (err) {
    console.error('Get upcoming slots error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed' });
  }
}

export async function getRatings(req, res) {
  try {
    const doctorId = req.params.id;
    const ratings = await Rating.findAll({
      where: { doctorId },
      attributes: ['id', 'rating', 'review', 'createdAt'],
    });
    const total = ratings.length;
    const sum = ratings.reduce((s, r) => s + r.rating, 0);
    const averageRating = total ? Math.round((sum / total) * 10) / 10 : 0;
    return res.json({
      success: true,
      data: {
        summary: { averageRating, totalRatings: total },
        ratings: ratings.map((r) => r.get({ plain: true })),
      },
    });
  } catch (err) {
    console.error('Get doctor ratings error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed' });
  }
}
