import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../config/db';
import { uploadFields, getFileUrl } from '../middleware/upload';

const router = Router();

// POST /api/v1/applications/instructor
router.post(
  '/instructor',
  uploadFields([
    { name: 'resume', maxCount: 1 },
    { name: 'profileImage', maxCount: 1 }
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        fullName,
        email,
        phone,
        country,
        state,
        professionalTitle,
        yearsExperience,
        specialization,
        githubUrl,
        linkedinUrl,
        portfolioUrl,
        bio,
        teachingExperience,
        interestedCourses,
        availability,
        motivation
      } = req.body;

      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const resumeUrl = getFileUrl(files?.['resume']?.[0]);
      const profileImageUrl = getFileUrl(files?.['profileImage']?.[0]);

      const { rows } = await query(
        `INSERT INTO instructor_applications (
          full_name, email, phone, country, state, professional_title, years_experience,
          specialization, github_url, linkedin_url, portfolio_url, resume_url, profile_image_url,
          bio, teaching_experience, interested_courses, availability, motivation
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
        ) RETURNING id`,
        [
          fullName, email, phone, country, state, professionalTitle, yearsExperience,
          specialization, githubUrl, linkedinUrl, portfolioUrl, resumeUrl, profileImageUrl,
          bio, teachingExperience, interestedCourses, availability, motivation
        ]
      );

      res.status(201).json({ success: true, message: 'Application submitted successfully', data: rows[0] });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
