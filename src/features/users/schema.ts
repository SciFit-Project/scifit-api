import { z } from "zod";

export const updateProfileSchema = z.object({
  age: z.number().int().min(10).max(100),
  height: z.number().min(100).max(250),
  weight: z.number().min(30).max(300),
  gender: z.enum(["male", "female"]),
  plan: z.enum(["cutting", "bulking", "maintenance"]),
  activity_level: z.enum([
    "sedentary",
    "light exercise",
    "moderate exercise",
    "heavy exercise",
  ]),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
