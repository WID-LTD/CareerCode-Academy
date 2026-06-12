import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  enrollments,
  courses,
  notifications,
  payments,
  users,
} from "@/lib/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/middleware";
import { successResponse, errorResponse, paginatedResponse } from "@/lib/api-response";
import { enrollmentSchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  try {
    const payload = requireAuth(req);
    if (!payload) return errorResponse("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get("courseId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;

    if (courseId) {
      const [enrollment] = await db
        .select()
        .from(enrollments)
        .where(
          and(
            eq(enrollments.userId, payload.userId),
            eq(enrollments.courseId, courseId)
          )
        )
        .limit(1);
      return successResponse(enrollment || null);
    }

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(enrollments)
      .where(eq(enrollments.userId, payload.userId));

    const enrollmentList = await db
      .select({
        enrollment: enrollments,
        course: courses,
      })
      .from(enrollments)
      .innerJoin(courses, eq(courses.id, enrollments.courseId))
      .where(eq(enrollments.userId, payload.userId))
      .orderBy(desc(enrollments.enrolledAt))
      .limit(limit)
      .offset(offset);

    return paginatedResponse(enrollmentList, count, page, limit);
  } catch (error) {
    console.error("Enrollments fetch error:", error);
    return errorResponse("Failed to fetch enrollments", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = requireAuth(req);
    if (!payload) return errorResponse("Unauthorized", 401);

    const body = await req.json();
    const parsed = enrollmentSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.errors[0].message);
    }

    const { courseId } = parsed.data;

    const [course] = await db
      .select()
      .from(courses)
      .where(eq(courses.id, courseId))
      .limit(1);
    if (!course) return errorResponse("Course not found", 404);

    const existingEnrollment = await db
      .select()
      .from(enrollments)
      .where(
        and(
          eq(enrollments.userId, payload.userId),
          eq(enrollments.courseId, courseId)
        )
      )
      .limit(1);

    if (existingEnrollment.length > 0) {
      return errorResponse("Already enrolled in this course", 409);
    }

    if (Number(course.price) > 0) {
      return successResponse(
        { requiresPayment: true, course },
        "This course requires payment"
      );
    }

    const [enrollment] = await db
      .insert(enrollments)
      .values({
        userId: payload.userId,
        courseId,
        status: "active",
        progress: 0,
      })
      .returning();

    await db.insert(notifications).values({
      userId: course.instructorId,
      title: "New Enrollment",
      message: `A new student enrolled in "${course.title}"`,
      type: "enrollment",
    });

    return successResponse(enrollment, "Enrolled successfully", 201);
  } catch (error) {
    console.error("Enrollment error:", error);
    return errorResponse("Failed to enroll", 500);
  }
}
