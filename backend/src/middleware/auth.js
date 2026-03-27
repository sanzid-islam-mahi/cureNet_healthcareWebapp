import jwt from 'jsonwebtoken';
import db from '../models/index.js';
import { getJwtSecret } from '../config/security.js';

const { User, Doctor, Patient, Receptionist, Clinic } = db;
const JWT_SECRET = getJwtSecret();
const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || 'curenet_auth';

function getCookieValue(req, name) {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(';');
  for (const cookie of cookies) {
    const [rawName, ...rest] = cookie.trim().split('=');
    if (rawName === name) {
      return decodeURIComponent(rest.join('='));
    }
  }

  return null;
}

function serializeClinicSummary(clinic) {
  const value = clinic?.toJSON ? clinic.toJSON() : clinic;
  if (!value) return null;
  return {
    id: value.id,
    name: value.name,
    addressLine: value.addressLine,
    area: value.area,
    city: value.city,
    phone: value.phone,
    status: value.status,
  };
}

export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader && authHeader.split(' ')[1];
  const token = bearerToken || getCookieValue(req, AUTH_COOKIE_NAME);

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findByPk(decoded.userId, {
      attributes: { exclude: ['password'] },
      include: [
        { model: Doctor, as: 'Doctor', required: false, include: [{ model: Clinic, as: 'Clinic', required: false }] },
        { model: Patient, as: 'Patient', required: false },
        { model: Receptionist, as: 'Receptionist', required: false, include: [{ model: Clinic, as: 'Clinic', required: false }] },
      ],
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }
    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account is deactivated' });
    }

    user.patientId = user.Patient?.id ?? null;
    user.doctorId = user.Doctor?.id ?? null;
    user.receptionistId = user.Receptionist?.id ?? null;
    user.clinicId = user.Receptionist?.clinicId ?? user.Doctor?.clinicId ?? null;
    user.clinic = serializeClinicSummary(
      user.Receptionist?.Clinic || user.Doctor?.Clinic || null
    );
    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired' });
    }
    return res.status(403).json({ success: false, message: 'Invalid token' });
  }
};

export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Not authorized for this role' });
    }
    next();
  };
};
