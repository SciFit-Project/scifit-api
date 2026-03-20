import { z } from "zod";

const exerciseSchema = z.object({
  exerciseId: z.string().uuid(),
  sets: z.number().int().positive(),
  repsMin: z.number().int().positive().optional(),
  repsMax: z.number().int().positive().optional(),
  order: z.number().int().min(0).optional(),
});

const daySchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  name: z.string().min(1),
  order: z.number().int().min(0).optional(),
  exercises: z.array(exerciseSchema).min(1),
});

export const createPlanSchema = z.object({
  name: z.string().min(1),
  frequency: z.number().int().min(1).max(7),
  days: z.array(daySchema).min(1),
});

export type CreatePlanInput = z.infer<typeof createPlanSchema>;