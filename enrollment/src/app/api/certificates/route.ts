import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  certificates,
  enrollments,
  courses,
  users,
} from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth, requireRole } from "@/lib/auth/middleware";
import { successResponse, errorResponse } from "@/lib/api-response";
import { generateVerificationCode } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    const payload = requireAuth(req);
    if (!payload) return errorResponse("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get("courseId");
    const code = searchParams.get("code");

    if (code) {
      const [cert] = await db
        .select()
        .from(certificates)
        .where(eq(certificates.verificationCode, code))
        .limit(1);
      if (!cert) return errorResponse("Certificate not found", 404);

      const [user] = await db
        .select({ name: users.name, email: users.email })
        .from(users)
        .where(eq(users.id, cert.userId))
        .limit(1);

      const [course] = await db
        .select({ title: courses.title })
        .from(courses)
        .where(eq(courses.id, cert.courseId))
        .limit(1);

      return successResponse({ ...cert, user, course });
    }

    if (courseId) {
      const [cert] = await db
        .select()
        .from(certificates)
        .where(
          and(
            eq(certificates.userId, payload.userId),
            eq(certificates.courseId, courseId)
          )
        )
        .limit(1);
      return successResponse(cert || null);
    }

    const certList = await db
      .select({
        certificate: certificates,
        course: courses,
      })
      .from(certificates)
      .innerJoin(courses, eq(courses.id, certificates.courseId))
      .where(eq(certificates.userId, payload.userId))
      .orderBy(sql`${certificates.issuedAt} desc`);

    return successResponse(certList);
  } catch (error) {
    console.error("Certificates fetch error:", error);
    return errorResponse("Failed to fetch certificates", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = requireAuth(req);
    if (!payload) return errorResponse("Unauthorized", 401);

    const body = await req.json();
    const { courseId } = body;
    if (!courseId) return errorResponse("courseId is required", 400);

    const [enrollment] = await db
      .select()
      .from(enrollments)
      .where(
        and(
          eq(enrollments.userId, payload.userId),
          eq(enrollments.courseId, courseId),
          eq(enrollments.status, "completed")
        )
      )
      .limit(1);

    if (!enrollment) {
      return errorResponse("Course not completed yet", 400);
    }

    const existingCert = await db
      .select()
      .from(certificates)
      .where(
        and(
          eq(certificates.userId, payload.userId),
          eq(certificates.courseId, courseId)
        )
      )
      .limit(1);

    if (existingCert.length > 0) {
      return successResponse(existingCert[0], "Certificate already exists");
    }

    const code = generateVerificationCode();
    const [course] = await db
      .select()
      .from(courses)
      .where(eq(courses.id, courseId))
      .limit(1);

    const [cert] = await db
      .insert(certificates)
      .values({
        userId: payload.userId,
        courseId,
        verificationCode: code,
      })
      .returning();

    return successResponse({ ...cert, course }, "Certificate generated", 201);
  } catch (error) {
    console.error("Certificate generation error:", error);
    return errorResponse("Failed to generate certificate", 500);
  }
}
