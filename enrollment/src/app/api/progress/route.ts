import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  lessonProgress,
  lessons,
  enrollments,
  modules,
  certificates,
  notifications,
  courses,
} from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/middleware";
import { successResponse, errorResponse } from "@/lib/api-response";
import { progressUpdateSchema } from "@/lib/validations";
import { generateVerificationCode } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    const payload = requireAuth(req);
    if (!payload) return errorResponse("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get("courseId");

    if (!courseId) return errorResponse("courseId is required", 400);

    const progressList = await db
      .select()
      .from(lessonProgress)
      .where(
        and(
          eq(lessonProgress.userId, payload.userId),
          eq(lessonProgress.courseId, courseId)
        )
      );

    const totalLessons = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(lessons)
      .where(eq(lessons.courseId, courseId));

    const completedCount = progressList.filter((p) => p.completed).length;
    const total = totalLessons[0]?.count || 1;

    return successResponse({
      progress: progressList,
      completedLessons: completedCount,
      totalLessons: total,
      percentage: Math.round((completedCount / total) * 100),
    });
  } catch (error) {
    console.error("Progress fetch error:", error);
    return errorResponse("Failed to fetch progress", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = requireAuth(req);
    if (!payload) return errorResponse("Unauthorized", 401);

    const body = await req.json();
    const parsed = progressUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.errors[0].message);
    }

    const { lessonId, completed } = parsed.data;

    const [lesson] = await db
      .select()
      .from(lessons)
      .where(eq(lessons.id, lessonId))
      .limit(1);
    if (!lesson) return errorResponse("Lesson not found", 404);

    const existing = await db
      .select()
      .from(lessonProgress)
      .where(
        and(
          eq(lessonProgress.userId, payload.userId),
          eq(lessonProgress.lessonId, lessonId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      const [updated] = await db
        .update(lessonProgress)
        .set({
          completed,
          completedAt: completed ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(eq(lessonProgress.id, existing[0].id))
        .returning();
      return successResponse(updated, "Progress updated");
    }

    const [newProgress] = await db
      .insert(lessonProgress)
      .values({
        userId: payload.userId,
        lessonId,
        courseId: lesson.courseId,
        completed,
        completedAt: completed ? new Date() : null,
      })
      .returning();

    const totalLessons = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(lessons)
      .where(eq(lessons.courseId, lesson.courseId));

    const completedCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(lessonProgress)
      .where(
        and(
          eq(lessonProgress.userId, payload.userId),
          eq(lessonProgress.courseId, lesson.courseId),
          eq(lessonProgress.completed, true)
        )
      );

    const total = totalLessons[0]?.count || 1;
    const done = completedCount[0]?.count || 0;
    const percentage = Math.round((done / total) * 100);

    await db
      .update(enrollments)
      .set({
        progress: percentage,
        ...(percentage >= 100 ? { status: "completed", completedAt: new Date() } : {}),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(enrollments.userId, payload.userId),
          eq(enrollments.courseId, lesson.courseId)
        )
      );

    if (percentage >= 100) {
      const [course] = await db
        .select()
        .from(courses)
        .where(eq(courses.id, lesson.courseId))
        .limit(1);

      const existingCert = await db
        .select()
        .from(certificates)
        .where(
          and(
            eq(certificates.userId, payload.userId),
            eq(certificates.courseId, lesson.courseId)
          )
        )
        .limit(1);

      if (existingCert.length === 0 && course) {
        const code = generateVerificationCode();
        await db.insert(certificates).values({
          userId: payload.userId,
          courseId: lesson.courseId,
          verificationCode: code,
        });

        await db.insert(notifications).values({
          userId: payload.userId,
          title: "Certificate Earned!",
          message: `Congratulations! You earned a certificate for "${course.title}"`,
          type: "certificate",
        });
      }
    }

    return successResponse(newProgress, "Lesson progress updated");
  } catch (error) {
    console.error("Progress update error:", error);
    return errorResponse("Failed to update progress", 500);
  }
}
