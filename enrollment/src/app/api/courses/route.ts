import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { courses, users, reviews, enrollments } from "@/lib/db/schema";
import { eq, sql, desc, and, or, ilike } from "drizzle-orm";
import { successResponse, errorResponse, paginatedResponse } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "12");
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";
    const level = searchParams.get("level") || "";
    const slug = searchParams.get("slug") || "";
    const id = searchParams.get("id") || "";
    const offset = (page - 1) * limit;

    if (slug) {
      const [course] = await db
        .select()
        .from(courses)
        .where(and(eq(courses.slug, slug), eq(courses.published, true)))
        .limit(1);

      if (!course) return errorResponse("Course not found", 404);

      const [instructor] = await db
        .select({ id: users.id, name: users.name, email: users.email, avatar: users.avatar, bio: users.bio })
        .from(users)
        .where(eq(users.id, course.instructorId))
        .limit(1);

      const reviewList = await db
        .select()
        .from(reviews)
        .where(eq(reviews.courseId, course.id));

      const [stats] = await db
        .select({
          enrollmentCount: sql<number>`count(*)::int`,
          avgRating: sql<number>`coalesce(avg(${reviews.rating}), 0)`,
        })
        .from(enrollments)
        .leftJoin(reviews, eq(reviews.courseId, enrollments.courseId))
        .where(eq(enrollments.courseId, course.id));

      const totalLessons = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(courses)
        .innerJoin(sql`modules`, sql`modules.course_id = ${courses.id}`)
        .innerJoin(sql`lessons`, sql`lessons.module_id = modules.id`)
        .where(eq(courses.id, course.id));

      return successResponse({
        ...course,
        instructor,
        reviews: reviewList,
        enrollmentCount: stats?.enrollmentCount || 0,
        avgRating: Number(stats?.avgRating || 0).toFixed(1),
        totalLessons: totalLessons[0]?.count || 0,
      });
    }

    if (id) {
      const [course] = await db.select().from(courses).where(eq(courses.id, id)).limit(1);
      if (!course) return errorResponse("Course not found", 404);
      return successResponse(course);
    }

    const conditions = [eq(courses.published, true)];
    if (search) conditions.push(ilike(courses.title, `%${search}%`));
    if (category) conditions.push(eq(courses.category, category));
    if (level) conditions.push(eq(courses.level, level));

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(courses)
      .where(and(...conditions));

    const courseList = await db
      .select()
      .from(courses)
      .where(and(...conditions))
      .orderBy(desc(courses.createdAt))
      .limit(limit)
      .offset(offset);

    return paginatedResponse(courseList, count, page, limit);
  } catch (error) {
    console.error("Courses fetch error:", error);
    return errorResponse("Failed to fetch courses", 500);
  }
}
