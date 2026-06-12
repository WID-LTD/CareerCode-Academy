import { NextResponse } from "next/server";

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export function successResponse<T>(data: T, message?: string, status = 200) {
  return NextResponse.json(
    { success: true, data, message } as ApiResponse<T>,
    { status }
  );
}

export function errorResponse(error: string, status = 400) {
  return NextResponse.json(
    { success: false, error } as ApiResponse,
    { status }
  );
}

export function paginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
) {
  return NextResponse.json({
    success: true,
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
}
