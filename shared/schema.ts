import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
});

// Marathon Pace Plan table
export const pacePlans = pgTable("pace_plans", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  targetTime: text("target_time").notNull(), // Stored as "HH:MM:SS" format
  segments: jsonb("segments").notNull(), // Stores the array of segment paces
  totalTime: text("total_time").notNull(), // Calculated total time based on segments
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPacePlanSchema = createInsertSchema(pacePlans).pick({
  userId: true,
  name: true,
  targetTime: true,
  segments: true,
  totalTime: true,
});

// Segment type for the JSON data
export const segmentSchema = z.object({
  id: z.number(),
  name: z.string(),
  distance: z.string(),
  targetPace: z.string(), // "MM:SS/km" format
  customPace: z.string(), // "MM:SS/km" format
  segmentTime: z.string(), // "MM:SS" format
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertPacePlan = z.infer<typeof insertPacePlanSchema>;
export type PacePlan = typeof pacePlans.$inferSelect;
export type Segment = z.infer<typeof segmentSchema>;
