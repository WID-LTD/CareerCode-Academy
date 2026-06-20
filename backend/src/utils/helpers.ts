import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { sendMail } from '../config/mailer';

export interface TokenPayload {
  userId: string;
  role: 'student' | 'instructor' | 'admin' | 'super_admin';
}

export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: (process.env.JWT_EXPIRES_IN || '15m') as string & jwt.SignOptions['expiresIn'],
  });
}

export function generateRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as string & jwt.SignOptions['expiresIn'],
  });
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as TokenPayload;
}

export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function generatePasswordResetToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function generateCertificateCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const rand = (n: number) => Array.from({ length: n }, () => chars[crypto.randomInt(chars.length)]).join('');
  return `CERT-${rand(8)}-${rand(6)}`;
}

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' as const : 'lax' as const,
  path: '/',
};

export function setAuthCookies(res: any, token: string, refreshToken: string): void {
  res.cookie('token', token, {
    ...COOKIE_OPTIONS,
    maxAge: 15 * 60 * 1000, // 15 minutes
  });
  res.cookie('refreshToken', refreshToken, {
    ...COOKIE_OPTIONS,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/api/v1/auth',
  });
}

export function clearAuthCookies(res: any): void {
  res.clearCookie('token', { path: '/' });
  res.clearCookie('refreshToken', { path: '/api/v1/auth' });
}

export async function sendVerificationEmail(email: string, token: string): Promise<void> {
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${token}`;
  await sendMail({
    to: email,
    subject: `Your verification code: ${token} - CareerCode Academy`,
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="margin:0;padding:0;background:#f4f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f6;padding:40px 20px;">
          <tr><td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
              <tr><td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px 40px;text-align:center;">
                <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;">CareerCode Academy</h1>
                <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:14px;">Build Your Career, One Code at a Time</p>
              </td></tr>
              <tr><td style="padding:40px;">
                <h2 style="color:#1e293b;font-size:20px;margin:0 0 8px;">Welcome to CareerCode Academy!</h2>
                <p style="color:#64748b;font-size:15px;line-height:1.6;margin:0 0 24px;">
                  Thanks for creating an account. Please use the verification code below to activate your account.
                </p>
                <table cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
                  <tr><td align="center" style="background:#f0f4ff;border-radius:12px;padding:20px 40px;border:2px dashed #6366f1;letter-spacing:12px;font-size:36px;font-weight:800;color:#4f46e5;font-family:monospace;">
                    ${token}
                  </td></tr>
                </table>
                <p style="color:#64748b;font-size:14px;line-height:1.6;margin:0 0 8px;text-align:center;">
                  Or click the button below to verify instantly:
                </p>
                <table cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
                  <tr><td align="center">
                    <a href="${verificationUrl}" style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#ffffff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:600;">Verify Account</a>
                  </td></tr>
                </table>
                <p style="color:#94a3b8;font-size:13px;margin:0;text-align:center;">
                  This code expires in <strong>24 hours</strong>. If you did not create this account, please ignore this email.
                </p>
              </td></tr>
              <tr><td style="background:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #e2e8f0;">
                <p style="color:#94a3b8;font-size:12px;margin:0;">
                  &copy; 2024 CareerCode Academy. All rights reserved.
                </p>
              </td></tr>
            </table>
          </td></tr>
        </table>
      </body>
      </html>
    `,
  });
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`;
  await sendMail({
    to: email,
    subject: 'Reset your CareerCode Academy password',
    html: `
      <h1>Password Reset</h1>
      <p>Click the link below to reset your password:</p>
      <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:6px;">Reset Password</a>
      <p>Or copy this URL: ${resetUrl}</p>
      <p>This link expires in 1 hour.</p>
      <p>If you did not request this, please ignore this email.</p>
    `,
  });
}

export async function sendWelcomeEmail(email: string, name: string): Promise<void> {
  const loginUrl = `${process.env.FRONTEND_URL}/login`;
  await sendMail({
    to: email,
    subject: 'Email Verified Successfully',
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="margin:0;padding:0;background:#f4f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f6;padding:40px 20px;">
          <tr><td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
              <tr><td style="background:linear-gradient(135deg,#22c55e,#16a34a);padding:32px 40px;text-align:center;">
                <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;">Email Verified Successfully</h1>
              </td></tr>
              <tr><td style="padding:40px;">
                <table cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
                  <tr><td align="center" style="width:64px;height:64px;background:#dcfce7;border-radius:50%;text-align:center;vertical-align:middle;font-size:32px;line-height:64px;">&#10003;</td></tr>
                </table>
                <h2 style="color:#1e293b;font-size:20px;margin:0 0 8px;text-align:center;">Welcome, ${name}!</h2>
                <p style="color:#64748b;font-size:15px;line-height:1.6;margin:0 0 24px;text-align:center;">
                  Your email has been verified and your account is now active.
                  You can log in and start learning right away.
                </p>
                <table cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
                  <tr><td align="center">
                    <a href="${loginUrl}" style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#ffffff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:600;">Log In to Your Dashboard</a>
                  </td></tr>
                </table>
                <p style="color:#64748b;font-size:14px;line-height:1.6;margin:0;text-align:center;">
                  Start exploring courses, track your progress, and build your career.
                </p>
              </td></tr>
              <tr><td style="background:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #e2e8f0;">
                <p style="color:#94a3b8;font-size:12px;margin:0;">
                  &copy; 2024 CareerCode Academy. All rights reserved.
                </p>
              </td></tr>
            </table>
          </td></tr>
        </table>
      </body>
      </html>
    `,
  });
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function calculateProgress(totalLessons: number, completedLessons: number): number {
  if (totalLessons === 0) return 0;
  return Math.round((completedLessons / totalLessons) * 100);
}

export async function sendInstructorApprovalEmail(email: string, name: string, tempPassword: string): Promise<void> {
  const loginUrl = `${process.env.FRONTEND_URL}/login`;
  await sendMail({
    to: email,
    subject: 'Welcome to CareerCode Academy - Instructor Application Approved!',
    html: `
      <h1>Congratulations, ${name}!</h1>
      <p>Your application to become an instructor has been approved.</p>
      <p>We've created an account for you. You can log in using the following temporary credentials:</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Password:</strong> ${tempPassword}</p>
      <br />
      <a href="${loginUrl}" style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:6px;">Log in to Instructor Dashboard</a>
      <p>Please log in and change your password immediately from your profile settings.</p>
    `,
  });
}

export async function sendInstructorUpgradeEmail(email: string, name: string): Promise<void> {
  const loginUrl = `${process.env.FRONTEND_URL}/login`;
  await sendMail({
    to: email,
    subject: 'CareerCode Academy - Instructor Application Approved!',
    html: `
      <h1>Congratulations, ${name}!</h1>
      <p>Your application to become an instructor has been approved.</p>
      <p>Your existing student account has been upgraded to an Instructor account. Your password remains the same.</p>
      <br />
      <a href="${loginUrl}" style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:6px;">Log in to Instructor Dashboard</a>
    `,
  });
}
