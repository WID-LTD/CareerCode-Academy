import { db } from "@/lib/db";
import { enrollments, courses } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";

export async function hasCourseAccess(
  userId: string,
  courseId: string
): Promise<boolean> {
  const [enrollment] = await db
    .select()
    .from(enrollments)
    .where(
      and(
        eq(enrollments.userId, userId),
        eq(enrollments.courseId, courseId),
        eq(enrollments.status, "active")
      )
    )
    .limit(1);
  return !!enrollment;
}

export async function getEnrollmentStats(userId: string) {
  const result = await db
    .select()
    .from(enrollments)
    .where(eq(enrollments.userId, userId));

  return {
    total: result.length,
    active: result.filter((e) => e.status === "active").length,
    completed: result.filter((e) => e.status === "completed").length,
    averageProgress:
      result.length > 0
        ? Math.round(
            result.reduce((sum, e) => sum + (e.progress || 0), 0) /
              result.length
          )
        : 0,
  };
}

export async function getInstructorStats(instructorId: string) {
  const courseList = await db
    .select()
    .from(courses)
    .where(eq(courses.instructorId, instructorId));

  const courseIds = courseList.map((c) => c.id);

  if (courseIds.length === 0) {
    return {
      totalCourses: 0,
      totalStudents: 0,
      totalRevenue: 0,
      averageRating: 0,
    };
  }

  const enrollmentData = await db
    .select()
    .from(enrollments)
    .where(inArray(enrollments.courseId, courseIds));

  return {
    totalCourses: courseList.length,
    totalStudents: enrollmentData.length,
    totalRevenue: 0,
    averageRating: 0,
  };
}
