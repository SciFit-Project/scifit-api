import { v4 as uuidv4 } from "uuid";
import { eq } from "drizzle-orm";
import { GoogleSyncInput, LoginSchema, RegisterInput } from "./schema.js";
import { db } from "../../core/db/index.js";
import { comparePassword, hashPassword } from "./helper/hash.js";
import { generateTokens } from "../../core/middleware/auth.js";
import { users } from "../../core/db/tables/users.js";
import { redisDel, redisGet, redisSet } from "../../utils/redis.js";

const normalizeEmail = (email: string) => email.toLowerCase().trim();

const PROFILE_CACHE_TTL_SECONDS = 60 * 5;
const getProfileCacheKey = (userId: string) => `user:profile:${userId}`;

const serializeUser = (user: {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  role: string | null;
  provider: string | null;
  gender?: string | null;
  age?: number | null;
  weightKg?: number | null;
  heightCm?: number | null;
  experienceLevel?: string | null;
  goal?: string | null;
  onboardingCompleted?: boolean | null;
}) => ({
  id: user.id,
  email: user.email,
  fullName: user.fullName,
  avatarUrl: user.avatarUrl,
  role: user.role,
  provider: user.provider,
  gender: user.gender,
  age: user.age,
  weightKg: user.weightKg,
  heightCm: user.heightCm,
  experienceLevel: user.experienceLevel,
  goal: user.goal,
  onboardingCompleted: user.onboardingCompleted ?? false,
});

export const registerUser = async (body: RegisterInput) => {
  const normalizedEmail = normalizeEmail(body.email);

  try {
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (existingUser.length > 0) {
      throw { message: "Email already in use", status: 400 };
    }

    const hashed = await hashPassword(body.password);
    const userId = uuidv4();

    const [create] = await db
      .insert(users)
      .values({
        id: userId,
        email: normalizedEmail,
        fullName: body.fullname,
        passwordHash: hashed,
        provider: "email",
      })
      .returning({
        id: users.id,
        provider: users.provider,
        fullName: users.fullName,
        email: users.email,
        avatarUrl: users.avatarUrl,
        role: users.role,
      });

    return { user: serializeUser(create) };
  } catch (error) {
    if ((error as any)?.status) {
      throw error;
    }
    console.error("Registration Error:", error);
    throw { message: "Internal Server Error", status: 500 };
  }
};

const findUserById = async (id: string) => {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user;
};

const buildGoogleProfile = (
  authUser: {
    id: string;
    email?: string;
    role?: "user" | "admin";
    fullName?: string;
    avatarUrl?: string;
  },
  input?: GoogleSyncInput,
) => {
  const email = authUser.email ? normalizeEmail(authUser.email) : "";

  if (!email) {
    throw { message: "Google account is missing an email", status: 400 };
  }

  const fullName = input?.fullname?.trim() || authUser.fullName || email;
  const avatarUrl = input?.avatar || authUser.avatarUrl || null;
  const role: "user" | "admin" = authUser.role || "user";

  return {
    id: authUser.id,
    email,
    fullName,
    avatarUrl,
    role,
    provider: "google" as const,
  };
};

const issueAuthPayload = async (user: {
  id: string;
  email: string;
  role: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  provider: string | null;
}) => {
  const { accessToken, refreshToken } = await generateTokens({
    id: user.id,
    email: user.email,
    role: user.role || "user",
  });

  return {
    accessToken,
    refreshToken,
    user: serializeUser(user),
  };
};

export const syncGoogleUser = async (
  authUser: {
    id: string;
    email?: string;
    role?: "user" | "admin";
    fullName?: string;
    avatarUrl?: string;
  },
  input?: GoogleSyncInput,
) => {
  const profile = buildGoogleProfile(authUser, input);
  const existingUser = await findUserById(profile.id);

  if (existingUser) {
    const [updatedUser] = await db
      .update(users)
      .set({
        email: profile.email,
        fullName: profile.fullName,
        avatarUrl: profile.avatarUrl,
        role: existingUser.role || profile.role,
        provider: "google",
      })
      .where(eq(users.id, profile.id))
      .returning();

    return issueAuthPayload(updatedUser);
  }

  const [newUser] = await db
    .insert(users)
    .values(profile)
    .returning();

  return issueAuthPayload(newUser);
};

export const syncGoogleUserLogin = async (
  authUser: {
    id: string;
    email?: string;
    role?: "user" | "admin";
    fullName?: string;
    avatarUrl?: string;
  },
  input?: GoogleSyncInput,
) => {
  return syncGoogleUser(authUser, input);
};

export const syncGoogleUserRegister = async (
  authUser: {
    id: string;
    email?: string;
    role?: "user" | "admin";
    fullName?: string;
    avatarUrl?: string;
  },
  input?: GoogleSyncInput,
) => {
  return syncGoogleUser(authUser, input);
};

export const userLogin = async (body: LoginSchema) => {
  const normalizedEmail = normalizeEmail(body.email);
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  if (!user) {
    throw { message: "User not found", status: 404 };
  }

  const isPasswordCorrect = await comparePassword(
    body.password,
    user.passwordHash!,
  );
  if (!isPasswordCorrect) {
    throw { message: "Invalid credentials", status: 401 };
  }
  if (!user.role) {
    throw { message: "Invalid credentials", status: 401 };
  }

  return issueAuthPayload(user);
};

export const getProfile = async (id: string) => {
  const cacheKey = getProfileCacheKey(id);
  const cachedProfile = await redisGet<{ user: ReturnType<typeof serializeUser> }>(
    cacheKey,
  );

  if (cachedProfile) {
    return cachedProfile;
  }

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      avatarUrl: users.avatarUrl,
      role: users.role,
      provider: users.provider,
      gender: users.gender,
      age: users.age,
      weightKg: users.weightKg,
      heightCm: users.heightCm,
      experienceLevel: users.experienceLevel,
      goal: users.goal,
      onboardingCompleted: users.onboardingCompleted,
    })
    .from(users)
    .where(eq(users.id, id));

  if (!user) {
    throw { message: "User not found", status: 404 };
  }

  const profile = { user: serializeUser(user) };

  await redisSet(cacheKey, profile, PROFILE_CACHE_TTL_SECONDS);

  return profile;
};

export const invalidateProfileCache = async (userId: string) => {
  await redisDel(getProfileCacheKey(userId));
};
