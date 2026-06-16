import { Router, Response, NextFunction } from 'express';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { uploadSingle } from '../middleware/upload';
import { query } from '../config/db';
import { uploadVideo, getStreamingUrl, deleteVideo, isCloudinaryConfigured } from '../config/cloudinary';
import { uploadFile } from '../config/storage';
import fs from 'fs';
import { NotFoundError, ForbiddenError } from '../utils/errors';

const router = Router();

// POST /videos/upload/:lessonId - Upload video to a lesson (local fallback + Cloudinary)
router.post(
  '/upload/:lessonId',
  authenticate,
  authorize('instructor', 'admin', 'super_admin'),
  uploadSingle('video'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { lessonId } = req.params;
      const userId = req.user!.userId;

      const lessonRes = await query(
        `SELECT l.*, c.instructor_id FROM lessons l JOIN courses c ON l.course_id = c.id WHERE l.id = $1`,
        [lessonId]
      );
      if (lessonRes.rows.length === 0) throw new NotFoundError('Lesson');
      if (req.user!.role !== 'admin' && lessonRes.rows[0].instructor_id !== userId) {
        throw new ForbiddenError('You can only upload videos to your own lessons');
      }

      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No video file provided' });
      }

      let videoUrl: string;
      let thumbnailUrl: string | null = null;
      let streamingUrl: string | null = null;

      // Try Cloudinary first
      if (isCloudinaryConfigured()) {
        try {
          const buffer = fs.readFileSync(req.file.path);
          const publicId = `careercode/videos/lesson-${lessonId}-${Date.now()}`;
          const uploadResult = await uploadVideo(buffer, publicId);
          videoUrl = uploadResult.secure_url;
          streamingUrl = await getStreamingUrl(publicId);
          thumbnailUrl = uploadResult.eager?.[0]?.secure_url || null;
          // Clean up local file
          fs.unlinkSync(req.file.path);
        } catch (cloudError) {
          console.error('Cloudinary upload failed, falling back to local:', cloudError);
          videoUrl = `/uploads/${req.file.filename}`;
        }
      } else if (process.env.S3_ENDPOINT && process.env.S3_BUCKET) {
        // Try S3 as backup
        try {
          const buffer = fs.readFileSync(req.file.path);
          const publicUrl = await uploadFile(buffer, req.file.filename, 'videos');
          videoUrl = publicUrl;
          fs.unlinkSync(req.file.path);
        } catch {
          videoUrl = `/uploads/${req.file.filename}`;
        }
      } else {
        videoUrl = `/uploads/${req.file.filename}`;
      }

      await query(
        `UPDATE lessons SET video_url = $1, video_thumbnail = $2 WHERE id = $3`,
        [streamingUrl || videoUrl, thumbnailUrl, lessonId]
      );

      res.json({
        success: true,
        data: {
          video_url: videoUrl,
          streaming_url: streamingUrl,
          thumbnail: thumbnailUrl,
          filename: req.file.filename,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /videos/stream/:lessonId - Get video info for a lesson
router.get(
  '/stream/:lessonId',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { lessonId } = req.params;

      const lessonRes = await query(
        'SELECT id, video_url, video_thumbnail FROM lessons WHERE id = $1',
        [lessonId]
      );
      if (lessonRes.rows.length === 0) throw new NotFoundError('Lesson');

      res.json({ success: true, data: lessonRes.rows[0] });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /videos/:lessonId - Remove video from a lesson
router.delete(
  '/:lessonId',
  authenticate,
  authorize('instructor', 'admin', 'super_admin'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { lessonId } = req.params;
      const userId = req.user!.userId;

      const lessonRes = await query(
        `SELECT l.*, c.instructor_id FROM lessons l JOIN courses c ON l.course_id = c.id WHERE l.id = $1`,
        [lessonId]
      );
      if (lessonRes.rows.length === 0) throw new NotFoundError('Lesson');
      if (req.user!.role !== 'admin' && lessonRes.rows[0].instructor_id !== userId) {
        throw new ForbiddenError('Unauthorized');
      }

      await query(`UPDATE lessons SET video_url = NULL, video_thumbnail = NULL WHERE id = $1`, [lessonId]);

      res.json({ success: true, message: 'Video removed' });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
