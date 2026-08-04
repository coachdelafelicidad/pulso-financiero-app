import { cookies } from "next/headers";
import { CHALLENGE_COOKIE, CHALLENGE_TTL_SECONDS } from "@/lib/auth/webauthn-config";

type ChallengePayload = {
  challenge: string;
  email?: string;
  type: "registration" | "authentication";
};

function encodePayload(payload: ChallengePayload): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function decodePayload(value: string): ChallengePayload | null {
  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as ChallengePayload;
  } catch {
    return null;
  }
}

export function setChallengeCookie(payload: ChallengePayload) {
  cookies().set(CHALLENGE_COOKIE, encodePayload(payload), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: CHALLENGE_TTL_SECONDS,
  });
}

export function readChallengeCookie(): ChallengePayload | null {
  const raw = cookies().get(CHALLENGE_COOKIE)?.value;
  if (!raw) return null;
  return decodePayload(raw);
}

export function clearChallengeCookie() {
  cookies().set(CHALLENGE_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
