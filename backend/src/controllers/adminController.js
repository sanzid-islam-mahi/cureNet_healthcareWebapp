import { Op } from 'sequelize';
import db from '../models/index.js';
import { logAudit } from '../lib/auditLog.js';

const { User, Doctor, Patient, Appointment, AuditLog, Clinic, Receptionist } = db;

const PASSWORD_POLICY = {
  minLength: 8,
  hasUpper: /[A-Z]/,
  hasLower: /[a-z]/,
  hasNumber: /\d/,
};

function validatePasswordStrength(password) {
  if (typeof password !== 'string' || password.length < PASSWORD_POLICY.minLength) return false;
  if (!PASSWORD_POLICY.hasUpper.test(password)) return false;
  if (!PASSWORD_POLICY.hasLower.test(password)) return false;
  if (!PASSWORD_POLICY.hasNumber.test(password)) return false;
  return true;
}

function getClientIp(req) {
  return req.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || null;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeStringArray(value) {
  if (Array.isArray(value)) {
    return [...new Set(value.map((entry) => String(entry).trim()).filter(Boolean))];
  }
  if (typeof value === 'string') {
    return [...new Set(value.split(',').map((entry) => entry.trim()).filter(Boolean))];
  }
  return [];
}

function formatClinicForAdmin(clinic) {
  const value = clinic.toJSON ? clinic.toJSON() : clinic;
  return {
    id: value.id,
    name: value.name,
    type: value.type,
    code: value.code,
    phone: value.phone,
    email: value.email,
    addressLine: value.addressLine,
    city: value.city,
    area: value.area,
    status: value.status,
    departments: Array.isArray(value.departments) ? value.departments : [],
    services: Array.isArray(value.services) ? value.services : [],
    operatingHours: value.operatingHours,
    notes: value.notes,
    doctorCount: value.Doctors?.length ?? value.doctorCount ?? 0,
    doctors: Array.isArray(value.Doctors)
      ? value.Doctors.map((doctor) => ({
          id: doctor.id,
          userId: doctor.userId,
          department: doctor.department,
          verified: doctor.verified,
          user: doctor.User
            ? {
                id: doctor.User.id,
                firstName: doctor.User.firstName,
                lastName: doctor.User.lastName,
                email: doctor.User.email,
              }
            : null,
        }))
      : undefined,
  };
}

export async function getStats(req, res) {
  try {
    const today = todayStr();
    const [
      userCount,
      doctorCount,
      patientCount,
      appointmentCount,
      pendingDoctorCount,
      todayAppointments,
      completedToday,
      pendingToday,
      pendingRequestsCount,
      clinicCount,
    ] = await Promise.all([
      User.count(),
      Doctor.count(),
      Patient.count(),
      Appointment.count(),
      Doctor.count({ where: { verified: false } }),
      Appointment.count({ where: { appointmentDate: today, status: { [Op.notIn]: ['cancelled', 'rejected'] } } }),
      Appointment.count({ where: { appointmentDate: today, status: 'completed' } }),
      Appointment.count({
        where: {
          appointmentDate: today,
          status: { [Op.in]: ['requested', 'approved', 'in_progress'] },
        },
      }),
      Appointment.count({ where: { status: 'requested' } }),
      Clinic.count(),
    ]);
    return res.json({
      success: true,
      data: {
        stats: {
          totalUsers: userCount,
          totalDoctors: doctorCount,
          totalPatients: patientCount,
          totalAppointments: appointmentCount,
          totalClinics: clinicCount,
          pendingDoctorCount,
          todayAppointments,
          completedToday,
          pendingToday,
          reportsGenerated: 0,
          queue: {
            pendingDoctorVerifications: pendingDoctorCount,
            pendingAppointmentApprovals: pendingRequestsCount,
            todaysOperationalLoad: todayAppointments + pendingToday,
          },
        },
      },
    });
  } catch (err) {
    console.error('Get admin stats error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed' });
  }
}

export async function getAppointmentAnalytics(req, res) {
  try {
    const period = Math.min(90, Math.max(1, parseInt(req.query.period, 10) || 7));
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - period);
    const startStr = startDate.toISOString().slice(0, 10);

    const appointments = await Appointment.findAll({
      where: { appointmentDate: { [Op.gte]: startStr } },
      attributes: ['id', 'appointmentDate', 'status', 'type'],
      raw: true,
    });

    const statusCounts = {};
    const typeCounts = {};
    const dailyCounts = {};
    for (const a of appointments) {
      statusCounts[a.status] = (statusCounts[a.status] || 0) + 1;
      typeCounts[a.type] = (typeCounts[a.type] || 0) + 1;
      dailyCounts[a.appointmentDate] = (dailyCounts[a.appointmentDate] || 0) + 1;
    }
    const dailyCountsArr = Object.entries(dailyCounts)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return res.json({
      success: true,
      data: {
        analytics: {
          statusCounts,
          typeCounts,
          dailyCounts: dailyCountsArr,
          period,
        },
      },
    });
  } catch (err) {
    console.error('Get appointment analytics error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed' });
  }
}

export async function listAppointments(req, res) {
  try {
    const date = req.query.date || todayStr();
    const appointments = await Appointment.findAll({
      where: { appointmentDate: date },
      include: [
        { model: Patient, as: 'Patient', include: [{ model: User, as: 'User', attributes: ['id', 'firstName', 'lastName', 'email'] }] },
        { model: Doctor, as: 'Doctor', include: [{ model: User, as: 'User', attributes: ['id', 'firstName', 'lastName', 'email'] }] },
      ],
      order: [['timeBlock', 'ASC']],
    });
    const list = appointments.map((a) => ({
      id: a.id,
      appointmentDate: a.appointmentDate,
      timeBlock: a.timeBlock,
      type: a.type,
      status: a.status,
      patient: a.Patient?.User ? { id: a.Patient.id, name: `${a.Patient.User.firstName} ${a.Patient.User.lastName}`, email: a.Patient.User.email } : null,
      doctor: a.Doctor?.User ? { id: a.Doctor.id, name: `${a.Doctor.User.firstName} ${a.Doctor.User.lastName}` } : null,
    }));
    return res.json({ success: true, data: { appointments: list, date } });
  } catch (err) {
    console.error('List appointments error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed' });
  }
}

export async function listPatients(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;
    const { search } = req.query;

    const where = { role: 'patient' };
    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      where[Op.or] = [
        { email: { [Op.like]: term } },
        { firstName: { [Op.like]: term } },
        { lastName: { [Op.like]: term } },
      ];
    }

    const { count, rows } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password'] },
      include: [{ model: Patient, as: 'Patient', required: true, attributes: ['id'] }],
      order: [['id', 'ASC']],
      limit,
      offset,
    });

    const patients = rows.map((u) => {
      const j = u.toJSON();
      const { Patient: p, ...user } = j;
      return { ...user, patientId: p?.id ?? null };
    });

    return res.json({
      success: true,
      data: { patients, total: count, page, limit },
    });
  } catch (err) {
    console.error('List patients error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed' });
  }
}

export async function getDoctorVerifications(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const offset = (page - 1) * limit;
    const { search, department, verified } = req.query;

    const where = {};
    if (department && department.trim()) where.department = department.trim();
    if (verified !== undefined && verified !== '') {
      where.verified = verified === 'true' || verified === true;
    }

    const include = [{ model: User, as: 'User', attributes: { exclude: ['password'] }, where: {} }];
    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      include[0].where[Op.or] = [
        { email: { [Op.like]: term } },
        { firstName: { [Op.like]: term } },
        { lastName: { [Op.like]: term } },
      ];
    }
    if (Object.keys(include[0].where).length === 0) delete include[0].where;

    const { count, rows: doctors } = await Doctor.findAndCountAll({
      where,
      include: [
        ...include,
        {
          model: Clinic,
          as: 'Clinic',
          attributes: ['id', 'name', 'type', 'city', 'status'],
          required: false,
        },
      ],
      order: [['id', 'ASC']],
      limit,
      offset,
    });

    const list = doctors.map((d) => ({
      id: d.id,
      userId: d.userId,
      bmdcRegistrationNumber: d.bmdcRegistrationNumber,
      department: d.department,
      experience: d.experience,
      verified: d.verified,
      clinicId: d.clinicId,
      clinic: serializeClinicSummary(d.Clinic || d.clinic || d.dataValues?.Clinic),
      user: d.User ? d.User.toJSON() : null,
    }));
    return res.json({
      success: true,
      data: { doctors: list, total: count, page, limit },
    });
  } catch (err) {
    console.error('Get doctor verifications error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed' });
  }
}

export async function verifyDoctor(req, res) {
  try {
    const { id } = req.params;
    const doctor = await Doctor.findByPk(id);
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }
    const requestedClinicId = req.body?.clinicId != null ? parseInt(req.body.clinicId, 10) : null;
    const resolvedClinicId = requestedClinicId || doctor.clinicId;
    if (!resolvedClinicId) {
      return res.status(400).json({ success: false, message: 'Doctor must be assigned to a clinic before approval' });
    }
    const clinic = await Clinic.findByPk(resolvedClinicId);
    if (!clinic || clinic.status !== 'active') {
      return res.status(400).json({ success: false, message: 'Doctor must be assigned to an active clinic before approval' });
    }
    await doctor.update({ verified: true, clinicId: resolvedClinicId });
    await logAudit({
      action: 'doctor_verified',
      userId: req.user?.id,
      entityType: 'doctor',
      entityId: doctor.id,
      details: { doctorId: doctor.id, clinicId: resolvedClinicId },
      ip: getClientIp(req),
    });
    return res.json({ success: true, data: { doctor: { id: doctor.id, verified: true, clinicId: resolvedClinicId } } });
  } catch (err) {
    console.error('Verify doctor error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed' });
  }
}

export async function unverifyDoctor(req, res) {
  try {
    const { id } = req.params;
    const doctor = await Doctor.findByPk(id);
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }
    await doctor.update({ verified: false });
    await logAudit({
      action: 'doctor_unverified',
      userId: req.user?.id,
      entityType: 'doctor',
      entityId: doctor.id,
      details: { doctorId: doctor.id },
      ip: getClientIp(req),
    });
    return res.json({ success: true, data: { doctor: { id: doctor.id, verified: false } } });
  } catch (err) {
    console.error('Unverify doctor error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed' });
  }
}

export async function listClinics(req, res) {
  try {
    const status = typeof req.query.status === 'string' && req.query.status ? req.query.status : null;
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const includeDoctors = req.query.includeDoctors === 'true';
    const where = {};

    if (status) where.status = status;
    if (search) {
      const term = `%${search}%`;
      where[Op.or] = [
        { name: { [Op.like]: term } },
        { city: { [Op.like]: term } },
        { area: { [Op.like]: term } },
        { code: { [Op.like]: term } },
      ];
    }

    const clinics = await Clinic.findAll({
      where,
      include: includeDoctors
        ? [
            {
              model: Doctor,
              as: 'Doctors',
              include: [{ model: User, as: 'User', attributes: ['id', 'firstName', 'lastName', 'email'] }],
            },
          ]
        : [{ model: Doctor, as: 'Doctors', attributes: ['id'] }],
      order: [['name', 'ASC']],
    });

    return res.json({
      success: true,
      data: {
        clinics: clinics.map(formatClinicForAdmin),
      },
    });
  } catch (err) {
    console.error('List clinics error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to load clinics' });
  }
}

export async function createClinic(req, res) {
  try {
    const payload = {
      name: String(req.body.name || '').trim(),
      type: req.body.type || 'clinic',
      code: req.body.code ? String(req.body.code).trim() : null,
      phone: req.body.phone ? String(req.body.phone).trim() : null,
      email: req.body.email ? String(req.body.email).trim() : null,
      addressLine: req.body.addressLine ? String(req.body.addressLine).trim() : null,
      city: req.body.city ? String(req.body.city).trim() : null,
      area: req.body.area ? String(req.body.area).trim() : null,
      status: req.body.status || 'active',
      departments: normalizeStringArray(req.body.departments),
      services: normalizeStringArray(req.body.services),
      operatingHours: req.body.operatingHours ? String(req.body.operatingHours).trim() : null,
      notes: req.body.notes ? String(req.body.notes).trim() : null,
    };
    const doctorIds = Array.isArray(req.body.doctorIds)
      ? req.body.doctorIds.map((id) => parseInt(id, 10)).filter(Boolean)
      : [];

    if (!payload.name) {
      return res.status(400).json({ success: false, message: 'Clinic name is required' });
    }

    const clinic = await Clinic.create(payload);

    if (doctorIds.length > 0) {
      await Doctor.update({ clinicId: clinic.id }, { where: { id: { [Op.in]: doctorIds } } });
    }

    const fullClinic = await Clinic.findByPk(clinic.id, {
      include: [
        {
          model: Doctor,
          as: 'Doctors',
          include: [{ model: User, as: 'User', attributes: ['id', 'firstName', 'lastName', 'email'] }],
        },
      ],
    });

    await logAudit({
      action: 'clinic_created',
      userId: req.user?.id,
      entityType: 'clinic',
      entityId: clinic.id,
      details: { clinicId: clinic.id, name: clinic.name },
      ip: getClientIp(req),
    });

    return res.status(201).json({
      success: true,
      data: {
        clinic: formatClinicForAdmin(fullClinic),
      },
    });
  } catch (err) {
    console.error('Create clinic error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to create clinic' });
  }
}

export async function updateClinic(req, res) {
  try {
    const clinic = await Clinic.findByPk(req.params.id);
    if (!clinic) {
      return res.status(404).json({ success: false, message: 'Clinic not found' });
    }

    const payload = {
      name: req.body.name !== undefined ? String(req.body.name || '').trim() : clinic.name,
      type: req.body.type !== undefined ? req.body.type : clinic.type,
      code: req.body.code !== undefined ? (req.body.code ? String(req.body.code).trim() : null) : clinic.code,
      phone: req.body.phone !== undefined ? (req.body.phone ? String(req.body.phone).trim() : null) : clinic.phone,
      email: req.body.email !== undefined ? (req.body.email ? String(req.body.email).trim() : null) : clinic.email,
      addressLine: req.body.addressLine !== undefined ? (req.body.addressLine ? String(req.body.addressLine).trim() : null) : clinic.addressLine,
      city: req.body.city !== undefined ? (req.body.city ? String(req.body.city).trim() : null) : clinic.city,
      area: req.body.area !== undefined ? (req.body.area ? String(req.body.area).trim() : null) : clinic.area,
      status: req.body.status !== undefined ? req.body.status : clinic.status,
      departments: req.body.departments !== undefined ? normalizeStringArray(req.body.departments) : clinic.departments,
      services: req.body.services !== undefined ? normalizeStringArray(req.body.services) : clinic.services,
      operatingHours: req.body.operatingHours !== undefined ? (req.body.operatingHours ? String(req.body.operatingHours).trim() : null) : clinic.operatingHours,
      notes: req.body.notes !== undefined ? (req.body.notes ? String(req.body.notes).trim() : null) : clinic.notes,
    };

    if (!payload.name) {
      return res.status(400).json({ success: false, message: 'Clinic name is required' });
    }

    await clinic.update(payload);

    if (req.body.doctorIds !== undefined) {
      const doctorIds = Array.isArray(req.body.doctorIds)
        ? req.body.doctorIds.map((id) => parseInt(id, 10)).filter(Boolean)
        : [];
      await Doctor.update({ clinicId: null }, { where: { clinicId: clinic.id } });
      if (doctorIds.length > 0) {
        await Doctor.update({ clinicId: clinic.id }, { where: { id: { [Op.in]: doctorIds } } });
      }
    }

    const fullClinic = await Clinic.findByPk(clinic.id, {
      include: [
        {
          model: Doctor,
          as: 'Doctors',
          include: [{ model: User, as: 'User', attributes: ['id', 'firstName', 'lastName', 'email'] }],
        },
      ],
    });

    await logAudit({
      action: 'clinic_updated',
      userId: req.user?.id,
      entityType: 'clinic',
      entityId: clinic.id,
      details: { clinicId: clinic.id, name: clinic.name },
      ip: getClientIp(req),
    });

    return res.json({
      success: true,
      data: {
        clinic: formatClinicForAdmin(fullClinic),
      },
    });
  } catch (err) {
    console.error('Update clinic error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to update clinic' });
  }
}

// ----- Users (admin CRUD) -----

function formatUserForAdmin(user, doctorId = null, patientId = null, doctorDetails = null, receptionistDetails = null) {
  const u = user.toJSON ? user.toJSON() : user;
  return {
    ...u,
    doctorId: doctorId ?? u.doctorId ?? null,
    patientId: patientId ?? u.patientId ?? null,
    doctorProfile: doctorDetails ?? u.doctorProfile ?? null,
    receptionistProfile: receptionistDetails ?? u.receptionistProfile ?? null,
  };
}

function serializeClinicSummary(clinic) {
  const value = clinic?.toJSON ? clinic.toJSON() : clinic;
  if (!value) return null;
  return {
    id: value.id,
    name: value.name,
    type: value.type,
    city: value.city,
    status: value.status,
  };
}

function buildDoctorAdminProfile(doctor) {
  if (!doctor) return null;
  return {
    department: doctor.department,
    verified: doctor.verified,
    bmdcRegistrationNumber: doctor.bmdcRegistrationNumber,
    experience: doctor.experience,
    clinicId: doctor.clinicId,
    clinic: serializeClinicSummary(doctor.Clinic || doctor.clinic || doctor.dataValues?.Clinic),
  };
}

function buildReceptionistAdminProfile(receptionist) {
  if (!receptionist) return null;
  return {
    clinicId: receptionist.clinicId,
    employeeCode: receptionist.employeeCode,
    isActive: receptionist.isActive,
    clinic: serializeClinicSummary(receptionist.Clinic || receptionist.clinic || receptionist.dataValues?.Clinic),
  };
}

export async function listUsers(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;
    const { role, search, isActive, verified } = req.query;

    const where = {};
    if (role && ['admin', 'patient', 'doctor', 'receptionist'].includes(role)) where.role = role;
    if (typeof isActive !== 'undefined' && isActive !== '') {
      where.isActive = isActive === 'true' || isActive === true;
    }
    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      where[Op.or] = [
        { email: { [Op.like]: term } },
        { firstName: { [Op.like]: term } },
        { lastName: { [Op.like]: term } },
      ];
    }

    const doctorInclude = {
      model: Doctor,
      as: 'Doctor',
      required: false,
      attributes: ['id', 'department', 'verified', 'bmdcRegistrationNumber', 'experience', 'clinicId'],
      include: [{ model: Clinic, as: 'Clinic', attributes: ['id', 'name', 'type', 'city', 'status'], required: false }],
    };
    if (typeof verified !== 'undefined' && verified !== '') {
      doctorInclude.required = true;
      doctorInclude.where = { verified: verified === 'true' || verified === true };
    }

    const { count, rows } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password'] },
      include: [
        doctorInclude,
        { model: Receptionist, as: 'Receptionist', required: false, attributes: ['id', 'clinicId', 'employeeCode', 'isActive'], include: [{ model: Clinic, as: 'Clinic', attributes: ['id', 'name', 'type', 'city', 'status'], required: false }] },
        { model: Patient, as: 'Patient', required: false, attributes: ['id'] },
      ],
      order: [['id', 'ASC']],
      limit,
      offset,
    });

    const users = rows.map((u) => {
      const doctorId = u.Doctor ? u.Doctor.id : null;
      const patientId = u.Patient ? u.Patient.id : null;
      const { Doctor: _d, Patient: _p, Receptionist: _r, ...rest } = u.toJSON();
      return formatUserForAdmin(
        { ...rest },
        doctorId,
        patientId,
        buildDoctorAdminProfile(u.Doctor),
        buildReceptionistAdminProfile(u.Receptionist)
      );
    });

    return res.json({
      success: true,
      data: { users, total: count, page, limit },
    });
  } catch (err) {
    console.error('List users error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed' });
  }
}

export async function createUser(req, res) {
  try {
    const {
      email,
      password,
      firstName,
      lastName,
      role = 'patient',
      phone,
      dateOfBirth,
      gender,
      address,
      bmdcRegistrationNumber,
      department,
      experience,
      clinicId,
      employeeCode,
    } = req.body;

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, first name and last name are required',
      });
    }
    if (!validatePasswordStrength(password)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be 8+ chars and include uppercase, lowercase, and a number',
      });
    }
    const allowedRoles = ['admin', 'patient', 'doctor', 'receptionist'];
    const resolvedRole = allowedRoles.includes(role) ? role : 'patient';
    if (resolvedRole === 'receptionist' && !clinicId) {
      return res.status(400).json({ success: false, message: 'Receptionist must be assigned to a clinic' });
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const user = await User.create({
      email,
      password,
      firstName,
      lastName,
      phone: phone || null,
      dateOfBirth: dateOfBirth || null,
      gender: gender || null,
      address: address || null,
      role: resolvedRole,
    });

    if (user.role === 'doctor') {
      await Doctor.create({
        userId: user.id,
        bmdcRegistrationNumber: bmdcRegistrationNumber || null,
        department: department || null,
        experience: experience != null ? parseInt(experience, 10) : null,
        clinicId: clinicId ? parseInt(clinicId, 10) : null,
        verified: false,
      });
    }
    if (user.role === 'patient') {
      await Patient.create({ userId: user.id });
    }
    if (user.role === 'receptionist') {
      if (!clinicId) {
        return res.status(400).json({ success: false, message: 'Receptionist must be assigned to a clinic' });
      }
      await Receptionist.create({
        userId: user.id,
        clinicId: parseInt(clinicId, 10),
        employeeCode: employeeCode ? String(employeeCode).trim() : null,
        isActive: true,
      });
    }

    const full = await User.findByPk(user.id, {
      attributes: { exclude: ['password'] },
      include: [
        { model: Doctor, as: 'Doctor', required: false, attributes: ['id', 'department', 'verified', 'bmdcRegistrationNumber', 'experience', 'clinicId'], include: [{ model: Clinic, as: 'Clinic', attributes: ['id', 'name', 'type', 'city', 'status'], required: false }] },
        { model: Receptionist, as: 'Receptionist', required: false, attributes: ['id', 'clinicId', 'employeeCode', 'isActive'], include: [{ model: Clinic, as: 'Clinic', attributes: ['id', 'name', 'type', 'city', 'status'], required: false }] },
        { model: Patient, as: 'Patient', required: false, attributes: ['id'] },
      ],
    });
    const doctorId = full.Doctor ? full.Doctor.id : null;
    const patientId = full.Patient ? full.Patient.id : null;
    const { Doctor: _d, Patient: _p, Receptionist: _r, ...rest } = full.toJSON();
    await logAudit({
      action: 'user_created',
      userId: req.user?.id,
      entityType: 'user',
      entityId: user.id,
      details: { email: user.email, role: user.role },
      ip: getClientIp(req),
    });
    return res.status(201).json({
      success: true,
      data: {
        user: formatUserForAdmin(
          { ...rest },
          doctorId,
          patientId,
          buildDoctorAdminProfile(full.Doctor),
          buildReceptionistAdminProfile(full.Receptionist)
        ),
      },
    });
  } catch (err) {
    console.error('Create user error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed' });
  }
}

export async function updateUser(req, res) {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id, {
      include: [
        { model: Doctor, as: 'Doctor', required: false },
        { model: Receptionist, as: 'Receptionist', required: false },
        { model: Patient, as: 'Patient', required: false },
      ],
    });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const allowed = [
      'firstName',
      'lastName',
      'email',
      'phone',
      'dateOfBirth',
      'gender',
      'address',
      'role',
      'isActive',
      'password',
      'bmdcRegistrationNumber',
      'department',
      'experience',
      'clinicId',
      'employeeCode',
      'verified',
    ];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        if (key === 'password' && (req.body[key] === '' || req.body[key] == null)) continue;
        updates[key] = req.body[key];
      }
    }

    if (updates.role && !['admin', 'patient', 'doctor', 'receptionist'].includes(updates.role)) {
      delete updates.role;
    }
    const currentRole = user.role;
    const newRole = updates.role ?? currentRole;
    if (newRole === 'receptionist' && (updates.clinicId === undefined ? !user.Receptionist?.clinicId : !updates.clinicId)) {
      return res.status(400).json({ success: false, message: 'Receptionist must be assigned to a clinic' });
    }
    if (updates.email) {
      const existing = await User.findOne({
        where: {
          email: updates.email,
          id: { [Op.ne]: user.id },
        },
      });
      if (existing) {
        return res.status(400).json({ success: false, message: 'Email already registered' });
      }
    }
    if (updates.password && !validatePasswordStrength(updates.password)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be 8+ chars and include uppercase, lowercase, and a number',
      });
    }
    if (updates.isActive !== undefined) {
      updates.isActive = !!updates.isActive;
    }
    if (updates.verified !== undefined) {
      updates.verified = !!updates.verified;
    }

    if (req.user?.id === user.id) {
      if (updates.isActive === false) {
        return res.status(400).json({ success: false, message: 'You cannot deactivate your own account' });
      }
      if (updates.role && updates.role !== 'admin') {
        return res.status(400).json({ success: false, message: 'You cannot change your own admin role' });
      }
    }

    // Role change: create/remove role-linked profiles
    if (newRole !== currentRole) {
      if (currentRole === 'doctor' && user.Doctor) {
        await user.Doctor.destroy();
      }
      if (currentRole === 'receptionist' && user.Receptionist) {
        await user.Receptionist.destroy();
      }
      if (currentRole === 'patient' && user.Patient) {
        await user.Patient.destroy();
      }
      if (newRole === 'doctor') {
        await Doctor.create({
          userId: user.id,
          verified: updates.verified ?? false,
          bmdcRegistrationNumber: updates.bmdcRegistrationNumber || null,
          department: updates.department || null,
          experience: updates.experience != null ? parseInt(updates.experience, 10) : null,
          clinicId: updates.clinicId ? parseInt(updates.clinicId, 10) : null,
        });
      }
      if (newRole === 'patient') {
        await Patient.create({ userId: user.id });
      }
      if (newRole === 'receptionist') {
        await Receptionist.create({
          userId: user.id,
          clinicId: parseInt(updates.clinicId, 10),
          employeeCode: updates.employeeCode ? String(updates.employeeCode).trim() : null,
          isActive: true,
        });
      }
    }

    const doctorFieldUpdates = {};
    const receptionistFieldUpdates = {};
    if (newRole === 'doctor') {
      if (updates.bmdcRegistrationNumber !== undefined) doctorFieldUpdates.bmdcRegistrationNumber = updates.bmdcRegistrationNumber || null;
      if (updates.department !== undefined) doctorFieldUpdates.department = updates.department || null;
      if (updates.experience !== undefined) {
        doctorFieldUpdates.experience = updates.experience === '' || updates.experience == null
          ? null
          : parseInt(updates.experience, 10);
      }
      if (updates.clinicId !== undefined) {
        doctorFieldUpdates.clinicId = updates.clinicId === '' || updates.clinicId == null
          ? null
          : parseInt(updates.clinicId, 10);
      }
      if (updates.verified !== undefined) doctorFieldUpdates.verified = updates.verified;
    }
    if (newRole === 'receptionist') {
      if (updates.clinicId !== undefined) {
        receptionistFieldUpdates.clinicId = updates.clinicId === '' || updates.clinicId == null
          ? null
          : parseInt(updates.clinicId, 10);
      }
      if (updates.employeeCode !== undefined) {
        receptionistFieldUpdates.employeeCode = updates.employeeCode ? String(updates.employeeCode).trim() : null;
      }
      if (updates.isActive !== undefined) {
        receptionistFieldUpdates.isActive = !!updates.isActive;
      }
    }

    delete updates.bmdcRegistrationNumber;
    delete updates.department;
    delete updates.experience;
    delete updates.clinicId;
    delete updates.employeeCode;
    delete updates.verified;

    await user.update(updates);
    if (newRole === 'doctor' && user.Doctor && Object.keys(doctorFieldUpdates).length > 0) {
      await user.Doctor.update(doctorFieldUpdates);
    }
    if (newRole === 'doctor' && !user.Doctor) {
      const doctorProfile = await Doctor.findOne({ where: { userId: user.id } });
      if (doctorProfile && Object.keys(doctorFieldUpdates).length > 0) {
        await doctorProfile.update(doctorFieldUpdates);
      }
    }
    if (newRole === 'receptionist' && user.Receptionist && Object.keys(receptionistFieldUpdates).length > 0) {
      await user.Receptionist.update(receptionistFieldUpdates);
    }
    if (newRole === 'receptionist' && !user.Receptionist) {
      const receptionistProfile = await Receptionist.findOne({ where: { userId: user.id } });
      if (receptionistProfile && Object.keys(receptionistFieldUpdates).length > 0) {
        await receptionistProfile.update(receptionistFieldUpdates);
      }
    }

    const full = await User.findByPk(user.id, {
      attributes: { exclude: ['password'] },
      include: [
        { model: Doctor, as: 'Doctor', required: false, attributes: ['id', 'department', 'verified', 'bmdcRegistrationNumber', 'experience', 'clinicId'], include: [{ model: Clinic, as: 'Clinic', attributes: ['id', 'name', 'type', 'city', 'status'], required: false }] },
        { model: Receptionist, as: 'Receptionist', required: false, attributes: ['id', 'clinicId', 'employeeCode', 'isActive'], include: [{ model: Clinic, as: 'Clinic', attributes: ['id', 'name', 'type', 'city', 'status'], required: false }] },
        { model: Patient, as: 'Patient', required: false, attributes: ['id'] },
      ],
    });
    const doctorId = full.Doctor ? full.Doctor.id : null;
    const patientId = full.Patient ? full.Patient.id : null;
    const { Doctor: _d, Patient: _p, Receptionist: _r, ...rest } = full.toJSON();
    await logAudit({
      action: 'user_updated',
      userId: req.user?.id,
      entityType: 'user',
      entityId: user.id,
      details: { email: user.email, role: user.role, isActive: user.isActive },
      ip: getClientIp(req),
    });
    return res.json({
      success: true,
      data: {
        user: formatUserForAdmin(
          { ...rest },
          doctorId,
          patientId,
          buildDoctorAdminProfile(full.Doctor),
          buildReceptionistAdminProfile(full.Receptionist)
        ),
      },
    });
  } catch (err) {
    console.error('Update user error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed' });
  }
}

export async function getLogs(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const offset = (page - 1) * limit;
    const { type: actionFilter, from, to } = req.query;

    const where = {};
    if (actionFilter && actionFilter.trim()) {
      where.action = { [Op.like]: `%${actionFilter.trim()}%` };
    }
    if (from?.trim() || to?.trim()) {
      where.createdAt = {};
      if (from?.trim()) where.createdAt[Op.gte] = from.trim();
      if (to?.trim()) where.createdAt[Op.lte] = to.trim();
    }

    const { count, rows } = await AuditLog.findAndCountAll({
      where,
      include: [{ model: User, as: 'User', required: false, attributes: ['id', 'email', 'firstName', 'lastName'] }],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    const logs = rows.map((r) => {
      const j = r.toJSON();
      const user = j.User ? { id: j.User.id, email: j.User.email, name: `${j.User.firstName || ''} ${j.User.lastName || ''}`.trim() } : null;
      return { id: j.id, action: j.action, userId: j.userId, entityType: j.entityType, entityId: j.entityId, details: j.details, ip: j.ip, createdAt: j.createdAt, user };
    });

    return res.json({
      success: true,
      data: { logs, total: count, page, limit },
    });
  } catch (err) {
    console.error('Get logs error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed' });
  }
}
