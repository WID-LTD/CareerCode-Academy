import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { sendMail } from '../config/mailer';

export interface TokenPayload {
  userId: string;
  role: 'student' | 'instructor' | 'admin';
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
  return crypto.randomBytes(32).toString('hex');
}

export function generatePasswordResetToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function generateCertificateCode(): string {
  return 'CERT-' + crypto.randomBytes(12).toString('hex').toUpperCase();
}

export async function sendVerificationEmail(email: string, token: string): Promise<void> {
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${token}`;
  await sendMail({
    to: email,
    subject: 'Verify your CareerCode Academy email',
    html: `
      <h1>Email Verification</h1>
      <p>Click the link below to verify your email address:</p>
      <a href="${verificationUrl}" style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:6px;">Verify Email</a>
      <p>Or copy this URL: ${verificationUrl}</p>
      <p>This link expires in 24 hours.</p>
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
  await sendMail({
    to: email,
    subject: 'Welcome to CareerCode Academy!',
    html: `
      <h1>Welcome, ${name}!</h1>
      <p>Your account has been created successfully.</p>
      <p>Start learning and building your career today.</p>
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
