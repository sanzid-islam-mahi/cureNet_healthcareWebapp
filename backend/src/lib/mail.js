import nodemailer from 'nodemailer';

const DEFAULT_MAIL_HOST = process.env.MAIL_HOST || '127.0.0.1';
const DEFAULT_MAIL_PORT = parseInt(process.env.MAIL_PORT || '1025', 10);
const DEFAULT_MAIL_SECURE = process.env.MAIL_SECURE === 'true';
const DEFAULT_MAIL_FROM = process.env.MAIL_FROM || 'CureNet <no-reply@curenet.local>';
const APP_BASE_URL = process.env.APP_BASE_URL || process.env.FRONTEND_URL || 'http://localhost:5173';

let transporterPromise;

function getTransporter() {
  if (!transporterPromise) {
    transporterPromise = Promise.resolve(
      nodemailer.createTransport({
        host: DEFAULT_MAIL_HOST,
        port: DEFAULT_MAIL_PORT,
        secure: DEFAULT_MAIL_SECURE,
        auth: process.env.MAIL_USER && process.env.MAIL_PASSWORD
          ? {
              user: process.env.MAIL_USER,
              pass: process.env.MAIL_PASSWORD,
            }
          : undefined,
      })
    );
  }

  return transporterPromise;
}

function getDisplayName(firstName) {
  return firstName?.trim() || 'there';
}

function buildEmailShell({ intro, bodyHtml, bodyText }) {
  return {
    text: [intro, '', ...bodyText].join('\n'),
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
        <p>${intro}</p>
        ${bodyHtml}
      </div>
    `,
  };
}

async function sendEmail({ to, subject, text, html }) {
  const transporter = await getTransporter();
  const info = await transporter.sendMail({
    from: DEFAULT_MAIL_FROM,
    to,
    subject,
    text,
    html,
  });

  const rejected = Array.isArray(info.rejected) ? info.rejected.filter(Boolean) : [];
  const accepted = Array.isArray(info.accepted) ? info.accepted.filter(Boolean) : [];

  console.info('Mail send result:', {
    subject,
    to,
    messageId: info.messageId || null,
    accepted,
    rejected,
    response: info.response || null,
  });

  if (accepted.length === 0 || rejected.length > 0) {
    throw new Error(`Email delivery was not accepted for all recipients: rejected=${rejected.join(', ') || 'unknown'}`);
  }

  return info;
}

export async function sendVerificationCodeEmail({ to, code, firstName }) {
  const displayName = getDisplayName(firstName);
  const email = buildEmailShell({
    intro: `Hi ${displayName},`,
    bodyText: [
      `Your CureNet verification code is ${code}.`,
      'It expires in 10 minutes.',
      '',
      `You can verify your account in the app at ${APP_BASE_URL}.`,
      '',
      'If you did not create this account, you can ignore this email.',
    ],
    bodyHtml: `
      <p>Your CureNet verification code is:</p>
      <p style="font-size: 28px; font-weight: 700; letter-spacing: 6px;">${code}</p>
      <p>It expires in 10 minutes.</p>
      <p>You can verify your account in the app at <a href="${APP_BASE_URL}">${APP_BASE_URL}</a>.</p>
      <p>If you did not create this account, you can ignore this email.</p>
    `,
  });

  return sendEmail({
    to,
    subject: 'Verify your CureNet email address',
    ...email,
  });
}

export async function sendPasswordResetEmail({ to, token, firstName }) {
  const displayName = getDisplayName(firstName);
  const resetUrl = `${APP_BASE_URL.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(token)}`;
  const email = buildEmailShell({
    intro: `Hi ${displayName},`,
    bodyText: [
      'We received a request to reset your CureNet password.',
      `Reset your password here: ${resetUrl}`,
      'This link expires in 1 hour.',
      '',
      'If you did not request a password reset, you can ignore this email.',
    ],
    bodyHtml: `
      <p>We received a request to reset your CureNet password.</p>
      <p><a href="${resetUrl}" style="display: inline-block; padding: 12px 18px; background: #4f46e5; color: #ffffff; text-decoration: none; border-radius: 8px;">Reset password</a></p>
      <p>If the button does not open, use this link:</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>This link expires in 1 hour.</p>
      <p>If you did not request a password reset, you can ignore this email.</p>
    `,
  });

  return sendEmail({
    to,
    subject: 'Reset your CureNet password',
    ...email,
  });
}

export async function sendMedicationReminderEmail({ to, firstName, medicineName, scheduledAt }) {
  const displayName = getDisplayName(firstName);
  const doseTime = new Date(scheduledAt).toLocaleString();
  const email = buildEmailShell({
    intro: `Hi ${displayName},`,
    bodyText: [
      `This is your CureNet reminder to take ${medicineName}.`,
      `Scheduled time: ${doseTime}`,
      '',
      `Open ${APP_BASE_URL} to review your reminders and mark the dose as taken.`,
    ],
    bodyHtml: `
      <p>This is your CureNet reminder to take <strong>${medicineName}</strong>.</p>
      <p>Scheduled time: <strong>${doseTime}</strong></p>
      <p>Open <a href="${APP_BASE_URL}">${APP_BASE_URL}</a> to review your reminders and mark the dose as taken.</p>
    `,
  });

  return sendEmail({
    to,
    subject: `Medication reminder: ${medicineName}`,
    ...email,
  });
}
