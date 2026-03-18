import { Op } from 'sequelize';
import db from '../models/index.js';
import { logAudit } from '../lib/auditLog.js';

const { User, Doctor, Patient, Appointment, AuditLog } = db;

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
    ]);
    return res.json({
      success: true,
      data: {
        stats: {
          totalUsers: userCount,
          totalDoctors: doctorCount,
          totalPatients: patientCount,
          totalAppointments: appointmentCount,
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
      include,
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
    await doctor.update({ verified: true });
    await logAudit({
      action: 'doctor_verified',
      userId: req.user?.id,
      entityType: 'doctor',
      entityId: doctor.id,
      details: { doctorId: doctor.id },
      ip: getClientIp(req),
    });
    return res.json({ success: true, data: { doctor: { id: doctor.id, verified: true } } });
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

// ----- Users (admin CRUD) -----

function formatUserForAdmin(user, doctorId = null, patientId = null, doctorDetails = null) {
  const u = user.toJSON ? user.toJSON() : user;
  return {
    ...u,
    doctorId: doctorId ?? u.doctorId ?? null,
    patientId: patientId ?? u.patientId ?? null,
    doctorProfile: doctorDetails ?? u.doctorProfile ?? null,
  };
}

export async function listUsers(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;
    const { role, search, isActive, verified } = req.query;

    const where = {};
    if (role && ['admin', 'patient', 'doctor'].includes(role)) where.role = role;
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
      attributes: ['id', 'department', 'verified', 'bmdcRegistrationNumber', 'experience'],
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
        { model: Patient, as: 'Patient', required: false, attributes: ['id'] },
      ],
      order: [['id', 'ASC']],
      limit,
      offset,
    });

    const users = rows.map((u) => {
      const doctorId = u.Doctor ? u.Doctor.id : null;
      const patientId = u.Patient ? u.Patient.id : null;
      const { Doctor: _d, Patient: _p, ...rest } = u.toJSON();
      return formatUserForAdmin(
        { ...rest },
        doctorId,
        patientId,
        u.Doctor
          ? {
            department: u.Doctor.department,
            verified: u.Doctor.verified,
            bmdcRegistrationNumber: u.Doctor.bmdcRegistrationNumber,
            experience: u.Doctor.experience,
          }
          : null
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
    const allowedRoles = ['admin', 'patient', 'doctor'];
    const resolvedRole = allowedRoles.includes(role) ? role : 'patient';

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
        verified: false,
      });
    }
    if (user.role === 'patient') {
      await Patient.create({ userId: user.id });
    }

    const full = await User.findByPk(user.id, {
      attributes: { exclude: ['password'] },
      include: [
        { model: Doctor, as: 'Doctor', required: false, attributes: ['id', 'department', 'verified', 'bmdcRegistrationNumber', 'experience'] },
        { model: Patient, as: 'Patient', required: false, attributes: ['id'] },
      ],
    });
    const doctorId = full.Doctor ? full.Doctor.id : null;
    const patientId = full.Patient ? full.Patient.id : null;
    const { Doctor: _d, Patient: _p, ...rest } = full.toJSON();
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
          full.Doctor
            ? {
              department: full.Doctor.department,
              verified: full.Doctor.verified,
              bmdcRegistrationNumber: full.Doctor.bmdcRegistrationNumber,
              experience: full.Doctor.experience,
            }
            : null
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
      'verified',
    ];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        if (key === 'password' && (req.body[key] === '' || req.body[key] == null)) continue;
        updates[key] = req.body[key];
      }
    }

    if (updates.role && !['admin', 'patient', 'doctor'].includes(updates.role)) {
      delete updates.role;
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

    // Role change: create/remove Doctor or Patient
    const currentRole = user.role;
    const newRole = updates.role ?? currentRole;
    if (newRole !== currentRole) {
      if (currentRole === 'doctor' && user.Doctor) {
        await user.Doctor.destroy();
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
        });
      }
      if (newRole === 'patient') {
        await Patient.create({ userId: user.id });
      }
    }

    const doctorFieldUpdates = {};
    if (newRole === 'doctor') {
      if (updates.bmdcRegistrationNumber !== undefined) doctorFieldUpdates.bmdcRegistrationNumber = updates.bmdcRegistrationNumber || null;
      if (updates.department !== undefined) doctorFieldUpdates.department = updates.department || null;
      if (updates.experience !== undefined) {
        doctorFieldUpdates.experience = updates.experience === '' || updates.experience == null
          ? null
          : parseInt(updates.experience, 10);
      }
      if (updates.verified !== undefined) doctorFieldUpdates.verified = updates.verified;
    }

    delete updates.bmdcRegistrationNumber;
    delete updates.department;
    delete updates.experience;
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

    const full = await User.findByPk(user.id, {
      attributes: { exclude: ['password'] },
      include: [
        { model: Doctor, as: 'Doctor', required: false, attributes: ['id', 'department', 'verified', 'bmdcRegistrationNumber', 'experience'] },
        { model: Patient, as: 'Patient', required: false, attributes: ['id'] },
      ],
    });
    const doctorId = full.Doctor ? full.Doctor.id : null;
    const patientId = full.Patient ? full.Patient.id : null;
    const { Doctor: _d, Patient: _p, ...rest } = full.toJSON();
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
          full.Doctor
            ? {
              department: full.Doctor.department,
              verified: full.Doctor.verified,
              bmdcRegistrationNumber: full.Doctor.bmdcRegistrationNumber,
              experience: full.Doctor.experience,
            }
            : null
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
