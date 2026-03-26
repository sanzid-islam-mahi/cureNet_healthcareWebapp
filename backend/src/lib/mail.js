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

export async function sendVerificationCodeEmail({ to, code, firstName }) {
  const transporter = await getTransporter();
  const displayName = firstName?.trim() || 'there';

  return transporter.sendMail({
    from: DEFAULT_MAIL_FROM,
    to,
    subject: 'Verify your CureNet email address',
    text: [
      `Hi ${displayName},`,
      '',
      `Your CureNet verification code is ${code}.`,
      'It expires in 10 minutes.',
      '',
      `You can verify your account in the app at ${APP_BASE_URL}.`,
      '',
      'If you did not create this account, you can ignore this email.',
    ].join('\n'),
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
        <p>Hi ${displayName},</p>
        <p>Your CureNet verification code is:</p>
        <p style="font-size: 28px; font-weight: 700; letter-spacing: 6px;">${code}</p>
        <p>It expires in 10 minutes.</p>
        <p>You can verify your account in the app at <a href="${APP_BASE_URL}">${APP_BASE_URL}</a>.</p>
        <p>If you did not create this account, you can ignore this email.</p>
      </div>
    `,
  });
}
