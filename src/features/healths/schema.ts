import { z } from "zod";

export const manualHealthLogSchema = z.object({
  date: z.string().date(),
  bodyWeightKg: z.number().positive(),
});

export type ManualHealthLogInput = z.infer<typeof manualHealthLogSchema>;
