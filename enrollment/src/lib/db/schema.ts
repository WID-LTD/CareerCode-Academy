import {
  pgTable,
  uuid,
  text,
  timestamp,
  decimal,
  integer,
  boolean,
  jsonb,
  unique,
  check,
  primaryKey,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    password: text("password").notNull(),
    role: text("role", {
      enum: ["student", "instructor", "admin", "super_admin"],
    })
      .notNull()
      .default("student"),
    avatar: text("avatar"),
    bio: text("bio"),
    isVerified: boolean("is_verified").default(false),
    verificationToken: text("verification_token"),
    verificationTokenExpires: timestamp("verification_token_expires"),
    resetToken: text("reset_token"),
    resetTokenExpiry: timestamp("reset_token_expiry"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    check("users_role_check", sql`${table.role} IN ('student','instructor','admin','super_admin')`),
  ]
);

export const refreshTokens = pgTable("refresh_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const courses = pgTable(
  "courses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    thumbnail: text("thumbnail"),
    price: decimal("price", { precision: 10, scale: 2 }).notNull().default("0"),
    category: text("category"),
    instructorId: uuid("instructor_id")
      .notNull()
      .references(() => users.id),
    level: text("level", {
      enum: ["beginner", "intermediate", "advanced"],
    }),
    duration: text("duration"),
    published: boolean("published").default(false),
    slug: text("slug").notNull().unique(),
    learningOutcomes: jsonb("learning_outcomes").default([]),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    check(
      "courses_level_check",
      sql`${table.level} IN ('beginner','intermediate','advanced')`
    ),
  ]
);

export const modules = pgTable("modules", {
  id: uuid("id").defaultRandom().primaryKey(),
  courseId: uuid("course_id")
    .notNull()
    .references(() => courses.id),
  title: text("title").notNull(),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const lessons = pgTable("lessons", {
  id: uuid("id").defaultRandom().primaryKey(),
  courseId: uuid("course_id")
    .notNull()
    .references(() => courses.id),
  moduleId: uuid("module_id")
    .notNull()
    .references(() => modules.id),
  title: text("title").notNull(),
  description: text("description"),
  videoUrl: text("video_url"),
  duration: text("duration"),
  orderIndex: integer("order_index").notNull().default(0),
  resources: jsonb("resources").default([]),
  isFree: boolean("is_free").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const enrollments = pgTable(
  "enrollments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id),
    status: text("status", {
      enum: ["pending", "active", "completed", "cancelled"],
    })
      .notNull()
      .default("active"),
    progress: integer("progress").notNull().default(0),
    completedLessons: jsonb("completed_lessons").default([]),
    enrolledAt: timestamp("enrolled_at").defaultNow().notNull(),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    unique().on(table.userId, table.courseId),
    check(
      "enrollments_status_check",
      sql`${table.status} IN ('pending','active','completed','cancelled')`
    ),
  ]
);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id),
    amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("NGN"),
    provider: text("provider", { enum: ["paystack", "flutterwave"] }),
    reference: text("reference").notNull().unique(),
    status: text("status", {
      enum: ["pending", "successful", "failed", "refunded"],
    })
      .notNull()
      .default("pending"),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    check(
      "payments_status_check",
      sql`${table.status} IN ('pending','successful','failed','refunded')`
    ),
  ]
);

export const certificates = pgTable(
  "certificates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id),
    certificateUrl: text("certificate_url"),
    verificationCode: text("verification_code").notNull().unique(),
    issuedAt: timestamp("issued_at").defaultNow().notNull(),
  },
  (table) => [unique().on(table.userId, table.courseId)]
);

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    rating: integer("rating").notNull(),
    comment: text("comment"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    unique().on(table.courseId, table.userId),
    check("reviews_rating_check", sql`${table.rating} BETWEEN 1 AND 5`),
  ]
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    title: text("title").notNull(),
    message: text("message").notNull(),
    type: text("type", {
      enum: ["enrollment", "payment", "progress", "certificate", "system"],
    }).notNull(),
    read: boolean("read").default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    check(
      "notifications_type_check",
      sql`${table.type} IN ('enrollment','payment','progress','certificate','system')`
    ),
  ]
);

export const wishlists = pgTable(
  "wishlists",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [unique().on(table.userId, table.courseId)]
);

export const lessonProgress = pgTable(
  "lesson_progress",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    lessonId: uuid("lesson_id")
      .notNull()
      .references(() => lessons.id),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id),
    completed: boolean("completed").default(false),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [unique().on(table.userId, table.lessonId)]
);
