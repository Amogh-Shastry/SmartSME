import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "smartsme_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function resolveSecret(): Uint8Array {
  const raw = process.env.AUTH_SECRET;
  // In a running production server, refuse to fall back to a public, guessable
  // secret: anyone who knows it could forge a session for any user. Fail closed.
  // The compile step (next build) has no runtime secret and must not be blocked,
  // so we only enforce this when actually serving.
  if (!raw || raw.length < 32) {
    const isBuild = process.env.NEXT_PHASE === "phase-production-build";
    if (process.env.NODE_ENV === "production" && !isBuild) {
      throw new Error("AUTH_SECRET must be set to a random value of at least 32 characters in production.");
    }
    return new TextEncoder().encode("smartsme-dev-insecure-secret-change-me");
  }
  return new TextEncoder().encode(raw);
}

const secret = resolveSecret();

export async function createSessionToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);
}

export async function verifySessionToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

export async function setSessionCookie(userId: string): Promise<void> {
  const token = await createSessionToken(userId);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getSessionUserId(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
