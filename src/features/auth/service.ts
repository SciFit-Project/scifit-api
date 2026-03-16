import { v4 as uuidv4 } from "uuid";
import { eq } from "drizzle-orm";
import { LoginSchema, RegisterInput } from "./schema.js";
import { db } from "../../core/db/index.js";
import { comparePassword, hashPassword } from "./helper/hash.js";
import { generateTokens } from "../../core/middleware/auth.js";
import { users } from "../../core/db/tables/users.js";

export const registerUser = async (body: RegisterInput) => {
  const normalizedEmail = body.email.toLowerCase().trim();

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
        fullName: users.fullName,
        email: users.email,
        role: users.role,
      });

    return { create };
  } catch (error) {
    console.error("Registration Error:", error);
    throw { message: "Internal Server Error", status: 500 };
  }
};

const findUserById = async (id: string) => {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user;
};

export const syncGoogleUserLogin = async (body: any) => {
  const existingUser = await findUserById(body);
  if (!existingUser) {
    throw { message: "Account not found. Please register first.", status: 404 };
  }
  return {
    email: existingUser.email,
    fullName: existingUser.fullName,
    avatarUrl: existingUser.avatarUrl,
  };
};

export const syncGoogleUserRegister = async (body: any) => {
  const existingUser = await findUserById(body.id);
  if (existingUser) {
    throw { message: "Account already exists. Please login.", status: 409 };
  }

  const [newUser] = await db
    .insert(users)
    .values({
      id: body.id,
      email: body.email,
      fullName: body.fullname,
      avatarUrl: body.avatar,
      provider: "google",
    })
    .returning();

  return newUser;
};

export const userLogin = async (body: LoginSchema) => {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, body.email))
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

  const { accessToken } = await generateTokens({
    id: user.id,
    email: user.email,
    role: user.role,
  });

  const { refreshToken } = await generateTokens({
    id: user.id,
  });

  return { accessToken, refreshToken };
};

export const getProfile = async (id: string) => {
  const [user] = await db
    .select({
      email: users.email,
      fullName: users.fullName,
      avatarUrl: users.avatarUrl,
    })
    .from(users)
    .where(eq(users.id, id));

  if (!user) {
    throw { message: "User not found", status: 404 };
  }

  return { user };
};
