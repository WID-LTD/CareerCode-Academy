import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { validate } from '../middleware/validate';
import { authenticate, AuthRequest } from '../middleware/auth';
import * as UserModel from '../models/user';
import * as NotificationModel from '../models/notification';
import * as TokenModel from '../models/token';
import {
  generateToken,
  generateRefreshToken,
  verifyRefreshToken,
  generateVerificationCode,
  generatePasswordResetToken,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
} from '../utils/helpers';
import { UnauthorizedError, NotFoundError, ConflictError } from '../utils/errors';

const router = Router();

const registerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address'),
  password: z.string().min(4, 'Password must be at least 4 characters').max(100),
  role: z.enum(['student', 'instructor']).optional().default('student'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(6, 'Password must be at least 6 characters').max(100),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  bio: z.string().max(500).optional(),
  avatar: z.string().url().optional(),
});

// POST /register
router.post(
  '/register',
  validate(registerSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, email, password, role } = req.body;

      const existingUser = await UserModel.getUserByEmail(email);
      if (existingUser) {
        throw new ConflictError('Email already registered');
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      const verificationToken = generateVerificationCode();
      const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const user = await UserModel.createUser({
        name,
        email,
        password: hashedPassword,
        role,
        verification_token: verificationToken,
        verification_token_expires: verificationTokenExpires,
      });

      // Email verification disabled — no verification email sent
      const tokenPayload = { userId: user.id, role: user.role };
      const token = generateToken(tokenPayload);
      const refreshToken = generateRefreshToken(tokenPayload);
      const refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      await TokenModel.createRefreshToken(user.id, refreshToken, refreshTokenExpiresAt);

      res.status(201).json({
        success: true,
        message: 'Account created. Please verify your email.',
        data: {
          userId: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          token,
          refreshToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /login
router.post(
  '/login',
  validate(loginSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;

      const user = await UserModel.getUserByEmail(email);
      if (!user) {
        throw new UnauthorizedError('Invalid email or password');
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        throw new UnauthorizedError('Invalid email or password');
      }

      if (!user.is_verified) {
        throw new UnauthorizedError('Please verify your email address.');
      }

      const tokenPayload = { userId: user.id, role: user.role };
      const token = generateToken(tokenPayload);
      const refreshToken = generateRefreshToken(tokenPayload);
      const refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      await TokenModel.createRefreshToken(user.id, refreshToken, refreshTokenExpiresAt);

      res.json({
        success: true,
        data: {
          userId: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          isVerified: user.is_verified,
          token,
          refreshToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /forgot-password
router.post(
  '/forgot-password',
  validate(forgotPasswordSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = req.body;
      const user = await UserModel.getUserByEmail(email);

      if (user) {
        const resetToken = generatePasswordResetToken();
        const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

        await UserModel.updateUser(user.id, {
          reset_token: resetToken,
          reset_token_expiry: resetTokenExpiry,
        });

        await sendPasswordResetEmail(email, resetToken);
      }

      res.json({
        success: true,
        message: 'If the email exists, a password reset link has been sent.',
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /reset-password
router.post(
  '/reset-password',
  validate(resetPasswordSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token, password } = req.body;

      const user = await UserModel.getUserByResetToken(token);
      if (!user) {
        throw new UnauthorizedError('Invalid or expired reset token');
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      await UserModel.updateUser(user.id, {
        password: hashedPassword,
        reset_token: null,
        reset_token_expiry: null,
      });

      res.json({
        success: true,
        message: 'Password reset successful.',
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /verify-email/:token
router.get(
  '/verify-email/:token',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token } = req.params;

      const user = await UserModel.getUserByVerificationToken(token);
      if (!user) {
        throw new UnauthorizedError('Invalid or expired verification token');
      }

      await UserModel.updateUser(user.id, {
        is_verified: true,
        verification_token: null,
        verification_token_expires: null,
      });

      // Welcome email disabled
      res.json({
        success: true,
        message: 'Email verified successfully.',
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /resend-verification
const resendVerificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many verification email requests. Please try again later.' },
});

const resendVerificationSchema = z.object({
  email: z.string().email('Invalid email address'),
});

router.post(
  '/resend-verification',
  resendVerificationLimiter,
  validate(resendVerificationSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = req.body;

      const user = await UserModel.getUserByEmail(email);

      if (!user || user.is_verified) {
        return res.json({
          success: true,
          message: 'If the account exists and is unverified, a verification email has been sent.',
        });
      }

      const verificationToken = generateVerificationCode();
      const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await UserModel.updateUser(user.id, {
        verification_token: verificationToken,
        verification_token_expires: verificationTokenExpires,
      });

      await sendVerificationEmail(email, verificationToken);

      res.json({
        success: true,
        message: 'If the account exists and is unverified, a verification email has been sent.',
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /refresh-token
router.post(
  '/refresh-token',
  validate(refreshTokenSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = req.body;
      const decoded = verifyRefreshToken(refreshToken);

      // Verify token exists in database (whitelist)
      const dbToken = await TokenModel.findRefreshToken(refreshToken);
      if (!dbToken) {
        throw new UnauthorizedError('Invalid or revoked refresh token');
      }

      const user = await UserModel.getUserById(decoded.userId);
      if (!user) {
        throw new UnauthorizedError('User not found');
      }

      const tokenPayload = { userId: user.id, role: user.role };
      const newToken = generateToken(tokenPayload);
      const newRefreshToken = generateRefreshToken(tokenPayload);

      // Token Rotation: Delete old token, insert new token
      await TokenModel.deleteRefreshToken(refreshToken);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await TokenModel.createRefreshToken(user.id, newRefreshToken, expiresAt);

      res.json({
        success: true,
        data: {
          token: newToken,
          refreshToken: newRefreshToken,
        },
      });
    } catch (error: any) {
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        next(new UnauthorizedError('Invalid or expired refresh token'));
      } else {
        next(error);
      }
    }
  }
);

// POST /logout
router.post(
  '/logout',
  validate(refreshTokenSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = req.body;
      
      // Delete token from database
      await TokenModel.deleteRefreshToken(refreshToken);
      
      res.json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /me
router.get(
  '/me',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = await UserModel.getUserById(req.user!.userId);
      if (!user) {
        throw new NotFoundError('User');
      }

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /profile
router.put(
  '/profile',
  authenticate,
  validate(updateProfileSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = await UserModel.updateUser(req.user!.userId, req.body);
      if (!user) {
        throw new NotFoundError('User');
      }

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
