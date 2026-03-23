import { pgEnum, pgTable, timestamp, uuid, integer, real, date, unique } from "drizzle-orm/pg-core";
import { users } from "./users.js";

export const healthSourceEnum = pgEnum("health_source", ["HEALTH_APP", "MANUAL"]);

export const healthLogs = pgTable("health_logs", {
  id:                  uuid("id").primaryKey().defaultRandom(),
  user_id:             uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date:                date("date").notNull(),
  body_weight_kg:      real("body_weight_kg"),
  heart_rate_avg:      integer("heart_rate_avg"),
  heart_rate_resting:  integer("heart_rate_resting"),
  steps:               integer("steps"),
  calories_burned:     real("calories_burned"),
  sleep_hours:         real("sleep_hours"),
  sleep_quality:       integer("sleep_quality"),
  mood:                integer("mood"),
  energy_level:        integer("energy_level"),
  source:              healthSourceEnum("source").notNull().default("MANUAL"),
  created_at:          timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userDateUnique: unique().on(table.user_id, table.date),
}));
