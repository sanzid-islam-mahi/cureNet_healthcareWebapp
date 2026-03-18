import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import db from '../models/index.js';
import PasswordResetToken from '../models/PasswordResetToken.js';
import { logAudit } from '../lib/auditLog.js';
import { getJwtSecret } from '../config/security.js';

const { User, Doctor, Patient } = db;

const JWT_SECRET = getJwtSecret();
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || 'curenet_auth';
const AUTH_COOKIE_MAX_AGE_MS = parseInt(process.env.AUTH_COOKIE_MAX_AGE_MS, 10) || 7 * 24 * 60 * 60 * 1000;

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

function hashResetToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function signToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function getAuthCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: AUTH_COOKIE_MAX_AGE_MS,
    path: '/',
  };
}

function setAuthCookie(res, token) {
  res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());
}

function clearAuthCookie(res) {
  const { maxAge: _maxAge, ...cookieOptions } = getAuthCookieOptions();
  res.clearCookie(AUTH_COOKIE_NAME, cookieOptions);
}

function formatUserResponse(user) {
  const u = user.toJSON ? user.toJSON() : user;
  const { Doctor: doctor, Patient: patient, ...rest } = u;
  const payload = { ...rest };
  if (doctor) payload.doctorId = doctor.id;
  if (patient) payload.patientId = patient.id;
  return payload;
}

export async function register(req, res) {
  try {
    const {
      email,
      password,
      firstName,
      lastName,
      phone,
      dateOfBirth,
      gender,
      address,
      role = 'patient',
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

    // Only patient and doctor can self-register; admin requires separate provisioning
    if (role === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Admin registration is not allowed',
      });
    }
    const allowedRoles = ['patient', 'doctor'];
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
      });
    }
    if (user.role === 'patient') {
      await Patient.create({ userId: user.id });
    }

    const token = signToken(user.id);
    const fullUser = await User.findByPk(user.id, {
      attributes: { exclude: ['password'] },
      include: [
        { model: Doctor, as: 'Doctor', required: false },
        { model: Patient, as: 'Patient', required: false },
      ],
    });

    setAuthCookie(res, token);
    return res.status(201).json({
      success: true,
      data: { user: formatUserResponse(fullUser) },
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Registration failed' });
  }
}

export async function login(req, res) {
  try {
    const { email, phone, password } = req.body;
    const emailVal = typeof email === 'string' ? email.trim() : '';
    const phoneVal = typeof phone === 'string' ? phone.trim() : '';
    if (!password) {
      return res.status(400).json({ success: false, message: 'Email or phone and password required' });
    }
    if (!emailVal && !phoneVal) {
      return res.status(400).json({ success: false, message: 'Email or phone is required' });
    }

    const where = emailVal ? { email: emailVal } : { phone: phoneVal };
    const user = await User.findOne({
      where,
      include: [
        { model: Doctor, as: 'Doctor', required: false },
        { model: Patient, as: 'Patient', required: false },
      ],
    });

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email/phone or password' });
    }
    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account is deactivated' });
    }

    const ip = req.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || null;
    logAudit({ action: 'user_login', userId: user.id, entityType: 'user', entityId: user.id, details: { email: user.email }, ip }).catch(() => {});

    const token = signToken(user.id);
    setAuthCookie(res, token);
    return res.json({
      success: true,
      data: { user: formatUserResponse(user) },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Login failed' });
  }
}

export async function getProfile(req, res) {
  try {
    const user = req.user;
    return res.json({
      success: true,
      data: { user: formatUserResponse(user) },
    });
  } catch (err) {
    console.error('Get profile error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to get profile' });
  }
}

export async function updateProfile(req, res) {
  try {
    const { firstName, lastName, phone, dateOfBirth, gender, address } = req.body;
    const user = req.user;

    await user.update({
      ...(firstName !== undefined && { firstName }),
      ...(lastName !== undefined && { lastName }),
      ...(phone !== undefined && { phone }),
      ...(dateOfBirth !== undefined && { dateOfBirth }),
      ...(gender !== undefined && { gender }),
      ...(address !== undefined && { address }),
    });

    const updated = await User.findByPk(user.id, {
      attributes: { exclude: ['password'] },
      include: [
        { model: Doctor, as: 'Doctor', required: false },
        { model: Patient, as: 'Patient', required: false },
      ],
    });

    return res.json({
      success: true,
      data: { user: formatUserResponse(updated) },
    });
  } catch (err) {
    console.error('Update profile error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Update failed' });
  }
}

export async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.json({ success: true, message: 'If that email exists, we sent a reset link' });
    }

    const token = PasswordResetToken.generateToken();
    const tokenHash = hashResetToken(token);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await PasswordResetToken.destroy({ where: { userId: user.id } });
    await PasswordResetToken.create({ userId: user.id, token: tokenHash, expiresAt });

    // TODO: send email with reset link (e.g. FRONTEND_URL/reset-password?token=...)
    // Never expose the reset token in the API response; send it only via email.
    return res.json({
      success: true,
      message: 'If that email exists, we sent a reset link',
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Request failed' });
  }
}

export async function verifyResetToken(req, res) {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Token is required' });
    }

    const record = await PasswordResetToken.findOne({ where: { token: hashResetToken(token) } });

    if (!record || record.expiresAt < new Date()) {
      return res.status(400).json({ success: false, message: 'Invalid or expired token' });
    }

    return res.json({ success: true, message: 'Token is valid' });
  } catch (err) {
    console.error('Verify reset token error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Verification failed' });
  }
}

export async function resetPassword(req, res) {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ success: false, message: 'Token and new password required' });
    }
    if (!validatePasswordStrength(password)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be 8+ chars and include uppercase, lowercase, and a number',
      });
    }

    const record = await PasswordResetToken.findOne({ where: { token: hashResetToken(token) } });
    if (!record || record.expiresAt < new Date()) {
      return res.status(400).json({ success: false, message: 'Invalid or expired token' });
    }

    const user = await User.findByPk(record.userId);
    if (!user) {
      return res.status(400).json({ success: false, message: 'User not found' });
    }

    user.password = password;
    await user.save();
    await PasswordResetToken.destroy({ where: { id: record.id } });

    return res.json({ success: true, message: 'Password reset successfully' });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Reset failed' });
  }
}

export async function logout(_req, res) {
  clearAuthCookie(res);
  return res.json({ success: true, message: 'Logged out successfully' });
}
