import { eq } from "drizzle-orm";
import { db } from "../../core/db/index.js";
import { users } from "../../core/db/tables/users.js";
import { UpdateProfileInput } from "./schema.js";

const mapGender = (gender: UpdateProfileInput["gender"]) =>
  gender.toUpperCase() as "MALE" | "FEMALE";

const mapGoal = (plan: UpdateProfileInput["plan"]) => {
  switch (plan) {
    case "cutting":
      return "CUTTING" as const;
    case "bulking":
      return "BULKING" as const;
    case "maintenance":
      return "RECOMP" as const;
  }
};

const mapExperienceLevel = (
  activityLevel: UpdateProfileInput["activity_level"],
) => {
  switch (activityLevel) {
    case "sedentary":
    case "light exercise":
      return "BEGINNER" as const;
    case "moderate exercise":
    case "heavy exercise":
      return "INTERMEDIATE" as const;
  }
};

const serializeUserProfile = (user: {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  provider: "email" | "google";
  role: "user" | "admin";
  gender: "MALE" | "FEMALE" | null;
  age: number | null;
  weightKg: number | null;
  heightCm: number | null;
  experienceLevel: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | null;
  goal: "CUTTING" | "BULKING" | "RECOMP" | null;
  onboardingCompleted: boolean;
}) => ({
  id: user.id,
  email: user.email,
  fullName: user.fullName,
  avatarUrl: user.avatarUrl,
  provider: user.provider,
  role: user.role,
  gender: user.gender,
  age: user.age,
  weightKg: user.weightKg,
  heightCm: user.heightCm,
  experienceLevel: user.experienceLevel,
  goal: user.goal,
  onboardingCompleted: user.onboardingCompleted,
});

export const updateProfile = async (
  userId: string,
  body: UpdateProfileInput,
) => {
  const [updatedUser] = await db
    .update(users)
    .set({
      age: body.age,
      heightCm: body.height,
      weightKg: body.weight,
      gender: mapGender(body.gender),
      goal: mapGoal(body.plan),
      experienceLevel: mapExperienceLevel(body.activity_level),
      onboardingCompleted: true,
    })
    .where(eq(users.id, userId))
    .returning({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      avatarUrl: users.avatarUrl,
      provider: users.provider,
      role: users.role,
      gender: users.gender,
      age: users.age,
      weightKg: users.weightKg,
      heightCm: users.heightCm,
      experienceLevel: users.experienceLevel,
      goal: users.goal,
      onboardingCompleted: users.onboardingCompleted,
    });

  if (!updatedUser) {
    throw { message: "User not found", status: 404 };
  }

  return { user: serializeUserProfile(updatedUser) };
};
