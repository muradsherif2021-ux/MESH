import jwt from "jsonwebtoken";
import { logger } from "./logger";

const ACCESS_SECRET = process.env.SESSION_SECRET ?? "dev-access-secret-change-in-prod";
const REFRESH_SECRET = (process.env.SESSION_SECRET ?? "dev-access-secret-change-in-prod") + "-refresh";

const ACCESS_TTL = 60 * 15; // 15 minutes
const REFRESH_TTL = 60 * 60 * 24 * 7; // 7 days

export interface TokenPayload {
  sub: string; // user id
  username: string;
  roleId: string | null;
  roleName: string | null;
  branchId: string | null;
}

export function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_TTL });
}

export function signRefreshToken(userId: string): string {
  return jwt.sign({ sub: userId }, REFRESH_SECRET, { expiresIn: REFRESH_TTL });
}

export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, ACCESS_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): { sub: string } | null {
  try {
    return jwt.verify(token, REFRESH_SECRET) as { sub: string };
  } catch {
    return null;
  }
}
