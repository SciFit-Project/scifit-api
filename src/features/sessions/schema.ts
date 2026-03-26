import { z } from "zod";

export const startSessionSchema = z.object({
  workoutDayId: z.string().uuid(),
  description: z.string().optional(),
});
export type StartSessionInput = z.infer<typeof startSessionSchema>;

export const logSetSchema = z.object({
  exerciseId: z.string().uuid(),
  setNumber: z.number().int().positive(),
  weightKg: z.number().min(0).optional(),
  reps: z.number().int().min(0),
  rpe: z.number().min(0).max(10).optional(),
});
export type LogSetInput = z.infer<typeof logSetSchema>;

export const finishSessionSchema = z.object({
  finishedAt: z.string().datetime(),
  notes: z.string().optional(),
  perceivedExertion: z.number().int().min(0).max(10).optional(),
});
export type FinishSessionInput = z.infer<typeof finishSessionSchema>;
