import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  fullname: z.string().min(1, "Name is required"),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type LoginSchema = z.infer<typeof loginSchema>;

export const googleSyncSchema = z.object({
  fullname: z.string().min(1, "Name is required").optional(),
  avatar: z.string().url("Avatar must be a valid URL").optional(),
});

export type GoogleSyncInput = z.infer<typeof googleSyncSchema>;
