import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { RequestHandler } from "express";
import { env } from "./config.js";
import { prisma } from "./db.js";

export type AuthUser = { id: string; role: "ADMIN" | "MEMBER" };

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const hashPassword = (password: string) => bcrypt.hash(password, 12);
export const verifyPassword = (password: string, hash: string) => bcrypt.compare(password, hash);
export const createToken = (user: AuthUser) => jwt.sign(user, env.JWT_SECRET, { expiresIn: "7d" });

export const requireAuth: RequestHandler = async (request, response, next) => {
  const header = request.header("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;

  if (!token) {
    response.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as AuthUser;
    const user = await prisma.user.findUnique({ where: { id: payload.id }, select: { id: true, role: true } });
    if (!user) {
      response.status(401).json({ error: "User no longer exists" });
      return;
    }
    request.user = user;
    next();
  } catch {
    response.status(401).json({ error: "Invalid or expired token" });
  }
};

export const requireAdmin: RequestHandler = (request, response, next) => {
  if (request.user?.role !== "ADMIN") {
    response.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
};
