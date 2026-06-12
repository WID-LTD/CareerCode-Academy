import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/middleware";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const payload = requireAuth(req);
    if (!payload) return errorResponse("Unauthorized", 401);

    const limit = parseInt(
      new URL(req.url).searchParams.get("limit") || "50"
    );

    const list = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, payload.userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);

    const unreadCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, payload.userId),
          eq(notifications.read, false)
        )
      );

    return successResponse({
      notifications: list,
      unreadCount: unreadCount[0]?.count || 0,
    });
  } catch (error) {
    console.error("Notifications fetch error:", error);
    return errorResponse("Failed to fetch notifications", 500);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const payload = requireAuth(req);
    if (!payload) return errorResponse("Unauthorized", 401);

    const body = await req.json();
    const { id } = body;

    if (id) {
      await db
        .update(notifications)
        .set({ read: true })
        .where(
          and(
            eq(notifications.id, id),
            eq(notifications.userId, payload.userId)
          )
        );
    } else {
      await db
        .update(notifications)
        .set({ read: true })
        .where(eq(notifications.userId, payload.userId));
    }

    return successResponse(null, "Notifications marked as read");
  } catch (error) {
    console.error("Notification update error:", error);
    return errorResponse("Failed to update notifications", 500);
  }
}
