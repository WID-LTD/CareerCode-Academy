import { NextRequest } from "next/server";
import { verifyToken, TokenPayload } from "@/lib/auth";
import { errorResponse } from "@/lib/api-response";

export function getTokenPayload(req: NextRequest): TokenPayload | null {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  return verifyToken(token);
}

export function requireAuth(req: NextRequest): TokenPayload | null {
  const payload = getTokenPayload(req);
  if (!payload) return null;
  return payload;
}

export function requireRole(req: NextRequest, roles: string[]): TokenPayload | null {
  const payload = requireAuth(req);
  if (!payload) return null;
  if (!roles.includes(payload.role)) return null;
  return payload;
}
