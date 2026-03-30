import { z } from "zod";

export const updateProfileSchema = z
  .object({
    fullname: z.string().min(1).optional(),
    age: z.number().int().min(10).max(100).optional(),
    height: z.number().min(100).max(250).optional(),
    weight: z.number().min(30).max(300).optional(),
    gender: z.enum(["male", "female"]).optional(),
    plan: z.enum(["cutting", "bulking", "maintenance"]).optional(),
    activity_level: z
      .enum([
        "sedentary",
        "light exercise",
        "moderate exercise",
        "heavy exercise",
      ])
      .optional(),
  })
  .refine((data) => Object.values(data).some((value) => value != null), {
    message: "At least one profile field is required",
  });

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
