import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import * as UserModel from '../models/user';
import { uploadSingle } from '../middleware/upload';
import { NotFoundError } from '../utils/errors';

const router = Router();

const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  bio: z.string().max(500).optional(),
  role: z.enum(['student', 'instructor', 'admin']).optional(),
  isVerified: z.boolean().optional(),
});

// GET /users
router.get(
  '/',
  authenticate,
  authorize('admin', 'super_admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = (page - 1) * limit;

      const users = await UserModel.getAllUsers(limit, offset);
      const total = await UserModel.countUsers();

      res.json({
        success: true,
        data: users,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /users/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await UserModel.getUserById(req.params.id);
    if (!user) {
      throw new NotFoundError('User');
    }
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
});

// PUT /users/:id
router.put(
  '/:id',
  authenticate,
  uploadSingle('avatar'),
  validate(updateUserSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      // Only admin or the user themselves can update
      if (req.user!.role !== 'admin' && req.user!.userId !== req.params.id) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }

      const data: any = { ...req.body };
      if ((req as any).file?.filename) {
        data.avatar = `/uploads/${(req as any).file.filename}`;
      }

      const user = await UserModel.updateUser(req.params.id, data);
      if (!user) {
        throw new NotFoundError('User');
      }

      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /users/:id
router.delete(
  '/:id',
  authenticate,
  authorize('admin', 'super_admin'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const deleted = await UserModel.deleteUser(req.params.id);
      if (!deleted) {
        throw new NotFoundError('User');
      }
      res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
