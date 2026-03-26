import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Op } from 'sequelize';
import db from '../models/index.js';
import PasswordResetToken from '../models/PasswordResetToken.js';
import { logAudit } from '../lib/auditLog.js';
import { getJwtSecret } from '../config/security.js';
import { sendVerificationCodeEmail } from '../lib/mail.js';

const { User, Doctor, Patient, EmailVerificationCode, sequelize } = db;

const JWT_SECRET = getJwtSecret();
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || 'curenet_auth';
const AUTH_COOKIE_MAX_AGE_MS = parseInt(process.env.AUTH_COOKIE_MAX_AGE_MS, 10) || 7 * 24 * 60 * 60 * 1000;
const EMAIL_VERIFICATION_PURPOSE = 'email_verification';
const EMAIL_VERIFICATION_CODE_TTL_MS = 10 * 60 * 1000;
const EMAIL_VERIFICATION_RESEND_MIN_INTERVAL_MS = 60 * 1000;
const EMAIL_VERIFICATION_MAX_ATTEMPTS = 5;

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

function isUnverifiedLoginAllowed() {
  return process.env.AUTH_ALLOW_UNVERIFIED_LOGIN === 'true';
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
  if (doctor?.profileImage) payload.profileImage = doctor.profileImage;
  if (!payload.profileImage && patient?.profileImage) payload.profileImage = patient.profileImage;
  return payload;
}

function getVerificationMetadata(record) {
  return {
    verificationRequired: true,
    email: record.email,
    verificationExpiresAt: record.expiresAt,
  };
}

async function loadAuthUser(userId) {
  return User.findByPk(userId, {
    attributes: { exclude: ['password'] },
    include: [
      { model: Doctor, as: 'Doctor', required: false },
      { model: Patient, as: 'Patient', required: false },
    ],
  });
}

async function replaceVerificationCode(user, { resendCount = 0 } = {}) {
  const code = EmailVerificationCode.generateCode();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + EMAIL_VERIFICATION_CODE_TTL_MS);

  const record = await EmailVerificationCode.create({
    userId: user.id,
    purpose: EMAIL_VERIFICATION_PURPOSE,
    codeHash: EmailVerificationCode.hashCode(code),
    expiresAt,
    resendCount,
    attemptCount: 0,
    lastSentAt: now,
  });

  return { code, expiresAt, recordId: record.id };
}

async function issueAuthResponse(res, user) {
  const token = signToken(user.id);
  setAuthCookie(res, token);
  const fullUser = await loadAuthUser(user.id);
  return {
    success: true,
    data: { user: formatUserResponse(fullUser) },
  };
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

    const transaction = await sequelize.transaction();
    let user;
    let verification;

    try {
      user = await User.create({
        email,
        password,
        firstName,
        lastName,
        phone: phone || null,
        dateOfBirth: dateOfBirth || null,
        gender: gender || null,
        address: address || null,
        role: resolvedRole,
        emailVerifiedAt: null,
      }, { transaction });

      if (user.role === 'doctor') {
        await Doctor.create({
          userId: user.id,
          bmdcRegistrationNumber: bmdcRegistrationNumber || null,
          department: department || null,
          experience: experience != null ? parseInt(experience, 10) : null,
        }, { transaction });
      }
      if (user.role === 'patient') {
        await Patient.create({ userId: user.id }, { transaction });
      }

      const code = EmailVerificationCode.generateCode();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + EMAIL_VERIFICATION_CODE_TTL_MS);

      await EmailVerificationCode.create({
        userId: user.id,
        purpose: EMAIL_VERIFICATION_PURPOSE,
        codeHash: EmailVerificationCode.hashCode(code),
        expiresAt,
        consumedAt: null,
        resendCount: 0,
        attemptCount: 0,
        lastSentAt: now,
      }, { transaction });

      verification = { code, expiresAt };
      await transaction.commit();
    } catch (transactionError) {
      await transaction.rollback();
      throw transactionError;
    }

    try {
      await sendVerificationCodeEmail({
        to: user.email,
        code: verification.code,
        firstName: user.firstName,
      });
    } catch (mailError) {
      await EmailVerificationCode.destroy({ where: { userId: user.id } }).catch(() => {});
      await User.destroy({ where: { id: user.id } }).catch(() => {});
      console.error('Verification email send error:', mailError);
      return res.status(500).json({
        success: false,
        message: 'Could not send verification email. Please try registering again.',
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Account created. Check your email for the verification code.',
      data: getVerificationMetadata({
        email: user.email,
        expiresAt: verification.expiresAt,
      }),
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
    if (!user.emailVerifiedAt && !isUnverifiedLoginAllowed()) {
      return res.status(403).json({
        success: false,
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Email is not verified yet',
        data: { email: user.email },
      });
    }

    const ip = req.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || null;
    logAudit({ action: 'user_login', userId: user.id, entityType: 'user', entityId: user.id, details: { email: user.email }, ip }).catch(() => {});

    return res.json(await issueAuthResponse(res, user));
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

export async function verifyEmail(req, res) {
  try {
    const email = typeof req.body.email === 'string' ? req.body.email.trim() : '';
    const code = typeof req.body.code === 'string' ? req.body.code.trim() : '';

    if (!email || !code) {
      return res.status(400).json({ success: false, message: 'Email and verification code are required' });
    }

    const user = await User.findOne({
      where: { email },
      include: [
        { model: Doctor, as: 'Doctor', required: false },
        { model: Patient, as: 'Patient', required: false },
      ],
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid verification request' });
    }
    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account is deactivated' });
    }

    if (user.emailVerifiedAt) {
      return res.json(await issueAuthResponse(res, user));
    }

    const record = await EmailVerificationCode.findOne({
      where: {
        userId: user.id,
        purpose: EMAIL_VERIFICATION_PURPOSE,
        consumedAt: null,
      },
      order: [['createdAt', 'DESC']],
    });

    if (!record || record.expiresAt < new Date()) {
      return res.status(400).json({ success: false, message: 'Verification code is invalid or expired' });
    }

    if (record.attemptCount >= EMAIL_VERIFICATION_MAX_ATTEMPTS) {
      return res.status(429).json({ success: false, message: 'Too many verification attempts. Request a new code.' });
    }

    if (record.codeHash !== EmailVerificationCode.hashCode(code)) {
      await record.update({ attemptCount: record.attemptCount + 1 });
      return res.status(400).json({ success: false, message: 'Verification code is invalid or expired' });
    }

    const now = new Date();
    await user.update({ emailVerifiedAt: now });
    await record.update({ consumedAt: now });

    return res.json(await issueAuthResponse(res, user));
  } catch (err) {
    console.error('Verify email error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Email verification failed' });
  }
}

export async function resendVerificationCode(req, res) {
  try {
    const email = typeof req.body.email === 'string' ? req.body.email.trim() : '';
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.json({ success: true, message: 'If that email exists, a verification code was sent' });
    }
    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account is deactivated' });
    }

    if (user.emailVerifiedAt) {
      return res.status(400).json({ success: false, message: 'Email is already verified' });
    }

    const activeRecord = await EmailVerificationCode.findOne({
      where: {
        userId: user.id,
        purpose: EMAIL_VERIFICATION_PURPOSE,
        consumedAt: null,
      },
      order: [['createdAt', 'DESC']],
    });

    const now = Date.now();
    if (activeRecord?.lastSentAt && now - activeRecord.lastSentAt.getTime() < EMAIL_VERIFICATION_RESEND_MIN_INTERVAL_MS) {
      return res.status(429).json({
        success: false,
        message: 'Please wait before requesting another verification code',
      });
    }

    const verification = await replaceVerificationCode(user, {
      resendCount: (activeRecord?.resendCount || 0) + 1,
    });

    try {
      await sendVerificationCodeEmail({
        to: user.email,
        code: verification.code,
        firstName: user.firstName,
      });

      await EmailVerificationCode.destroy({
        where: {
          userId: user.id,
          purpose: EMAIL_VERIFICATION_PURPOSE,
          consumedAt: null,
          id: {
            [Op.ne]: verification.recordId,
          },
        },
      });
    } catch (mailError) {
      await EmailVerificationCode.destroy({ where: { id: verification.recordId } }).catch(() => {});
      console.error('Resend verification email error:', mailError);
      return res.status(500).json({
        success: false,
        message: 'Could not send verification email. Please try again.',
      });
    }

    return res.json({
      success: true,
      message: 'Verification code sent',
      data: getVerificationMetadata({
        email: user.email,
        expiresAt: verification.expiresAt,
      }),
    });
  } catch (err) {
    console.error('Resend verification code error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to resend verification code' });
  }
}

export async function getVerificationStatus(req, res) {
  try {
    const email = typeof req.query.email === 'string' ? req.query.email.trim() : '';
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const record = await EmailVerificationCode.findOne({
      where: {
        userId: user.id,
        purpose: EMAIL_VERIFICATION_PURPOSE,
        consumedAt: null,
      },
      order: [['createdAt', 'DESC']],
    });

    return res.json({
      success: true,
      data: {
        email: user.email,
        verified: Boolean(user.emailVerifiedAt),
        verificationRequired: !user.emailVerifiedAt,
        verificationExpiresAt: record?.expiresAt || null,
      },
    });
  } catch (err) {
    console.error('Get verification status error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to load verification status' });
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
