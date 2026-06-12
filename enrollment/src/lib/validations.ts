import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["student", "instructor"]).default("student"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const enrollmentSchema = z.object({
  courseId: z.string().uuid("Invalid course ID"),
});

export const paymentInitSchema = z.object({
  courseId: z.string().uuid("Invalid course ID"),
  provider: z.enum(["paystack", "flutterwave"]),
});

export const paymentVerifySchema = z.object({
  reference: z.string().min(1, "Reference is required"),
});

export const progressUpdateSchema = z.object({
  lessonId: z.string().uuid("Invalid lesson ID"),
  completed: z.boolean(),
});

export const reviewSchema = z.object({
  courseId: z.string().uuid("Invalid course ID"),
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type EnrollmentInput = z.infer<typeof enrollmentSchema>;
export type PaymentInitInput = z.infer<typeof paymentInitSchema>;
export type PaymentVerifyInput = z.infer<typeof paymentVerifySchema>;
export type ProgressUpdateInput = z.infer<typeof progressUpdateSchema>;
export type ReviewInput = z.infer<typeof reviewSchema>;
