import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  hashPassword,
  comparePassword,
  signToken,
  findUserByEmail,
} from "@/lib/auth";
import { registerSchema, loginSchema } from "@/lib/validations";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type } = Object.fromEntries(new URL(req.url).searchParams);

    if (type === "register") {
      const parsed = registerSchema.safeParse(body);
      if (!parsed.success) {
        return errorResponse(parsed.error.errors[0].message);
      }
      const { name, email, password, role } = parsed.data;

      const existing = await findUserByEmail(email);
      if (existing) {
        return errorResponse("Email already registered", 409);
      }

      const hashed = await hashPassword(password);
      const [user] = await db
        .insert(users)
        .values({ name, email, password: hashed, role })
        .returning();

      const token = signToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      return successResponse(
        {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            avatar: user.avatar,
          },
          token,
        },
        "Registration successful",
        201
      );
    }

    if (type === "login") {
      const parsed = loginSchema.safeParse(body);
      if (!parsed.success) {
        return errorResponse(parsed.error.errors[0].message);
      }
      const { email, password } = parsed.data;

      const user = await findUserByEmail(email);
      if (!user) {
        return errorResponse("Invalid email or password", 401);
      }

      const valid = await comparePassword(password, user.password);
      if (!valid) {
        return errorResponse("Invalid email or password", 401);
      }

      const token = signToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      return successResponse({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
        },
        token,
      });
    }

    return errorResponse("Invalid auth type", 400);
  } catch (error) {
    console.error("Auth error:", error);
    return errorResponse("Authentication failed", 500);
  }
}
