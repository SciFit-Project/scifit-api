CREATE TYPE "public"."experience_level" AS ENUM('BEGINNER', 'INTERMEDIATE', 'ADVANCED');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('MALE', 'FEMALE');--> statement-breakpoint
CREATE TYPE "public"."goal" AS ENUM('CUTTING', 'BULKING', 'RECOMP');--> statement-breakpoint
CREATE TYPE "public"."provider" AS ENUM('email', 'google');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "public"."equipment" AS ENUM('barbell', 'dumbbell', 'machine', 'bodyweight', 'cable');--> statement-breakpoint
CREATE TYPE "public"."muscle_group" AS ENUM('chest', 'back', 'legs', 'shoulders', 'arms', 'core');--> statement-breakpoint
CREATE TYPE "public"."health_source" AS ENUM('HEALTH_APP', 'MANUAL');--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text,
	"full_name" text,
	"avatar_url" text,
	"provider" "provider" DEFAULT 'email' NOT NULL,
	"role" "role" DEFAULT 'user' NOT NULL,
	"gender" "gender" NOT NULL,
	"age" integer,
	"weight_kg" real,
	"height_cm" real,
	"experience_level" "experience_level",
	"goal" "goal",
	"onboarding_completed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "exercises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"muscle_group" "muscle_group" NOT NULL,
	"secondary_muscles" text[],
	"equipment" "equipment",
	"instruction" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "exercises_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "workout_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"frequency" integer NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workout_days" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"name" text NOT NULL,
	"day_of_week" integer NOT NULL,
	"order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workout_day_exercises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"day_id" uuid NOT NULL,
	"exercise_id" uuid NOT NULL,
	"sets" integer NOT NULL,
	"reps_min" integer,
	"reps_max" integer,
	"order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workout_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"workout_day_id" uuid,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"finished_at" timestamp,
	"description" text,
	"notes" text,
	"perceived_exertion" integer
);
--> statement-breakpoint
CREATE TABLE "session_sets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"exercise_id" uuid NOT NULL,
	"set_number" integer NOT NULL,
	"weight_kg" real,
	"reps" integer NOT NULL,
	"rpe" real,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "health_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"body_weight_kg" real,
	"heart_rate_avg" integer,
	"heart_rate_resting" integer,
	"steps" integer,
	"calories_burned" real,
	"sleep_hours" real,
	"sleep_quality" integer,
	"mood" integer,
	"energy_level" integer,
	"source" "health_source" DEFAULT 'MANUAL' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "health_logs_user_id_date_unique" UNIQUE("user_id","date")
);
--> statement-breakpoint
ALTER TABLE "workout_plans" ADD CONSTRAINT "workout_plans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_days" ADD CONSTRAINT "workout_days_plan_id_workout_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."workout_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_day_exercises" ADD CONSTRAINT "workout_day_exercises_day_id_workout_days_id_fk" FOREIGN KEY ("day_id") REFERENCES "public"."workout_days"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_day_exercises" ADD CONSTRAINT "workout_day_exercises_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_workout_day_id_workout_days_id_fk" FOREIGN KEY ("workout_day_id") REFERENCES "public"."workout_days"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_sets" ADD CONSTRAINT "session_sets_session_id_workout_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."workout_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_sets" ADD CONSTRAINT "session_sets_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_logs" ADD CONSTRAINT "health_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;