import express from "express";
import cors from "cors";
import { z } from "zod";
import { env } from "./config.js";
import { prisma } from "./db.js";
import { createToken, hashPassword, requireAuth, verifyPassword } from "./auth.js";
import { projectRouter } from "./projectRoutes.js";
import { taskRouter } from "./taskRoutes.js";

const app = express();
app.use(cors({ origin: env.CLIENT_ORIGIN }));
app.use(express.json());

app.get("/health", (_request, response) => response.json({ status: "ok", service: "nova-api" }));

const signupSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(128)
});

app.post("/api/auth/signup", async (request, response, next) => {
  try {
    const input = signupSchema.parse(request.body);
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      response.status(409).json({ error: "An account with that email already exists" });
      return;
    }
    const user = await prisma.user.create({
      data: { name: input.name, email: input.email, passwordHash: await hashPassword(input.password) },
      select: { id: true, name: true, email: true, role: true }
    });
    response.status(201).json({ user, token: createToken(user) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/login", async (request, response, next) => {
  try {
    const input = signupSchema.pick({ email: true, password: true }).parse(request.body);
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
      response.status(401).json({ error: "Invalid email or password" });
      return;
    }
    const safeUser = { id: user.id, name: user.name, email: user.email, role: user.role };
    response.json({ user: safeUser, token: createToken(user) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/logout", requireAuth, (_request, response) => response.status(204).send());
app.get("/api/auth/me", requireAuth, async (request, response, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: request.user!.id }, select: { id: true, name: true, email: true, role: true } });
    response.json({ user });
  } catch (error) {
    next(error);
  }
});

app.get("/api/protected", requireAuth, (request, response) => {
  response.json({ message: "You reached a protected NOVA route", user: request.user });
});

app.use("/api/projects", requireAuth, projectRouter);
app.use("/api/projects/:projectId/tasks", requireAuth, taskRouter);

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  if (error instanceof z.ZodError) {
    response.status(400).json({ error: "Invalid request", details: error.issues });
    return;
  }
  console.error(error);
  response.status(500).json({ error: "Internal server error" });
});

const server = app.listen(env.PORT, () => console.log(`NOVA API listening on port ${env.PORT}`));

const shutdown = async () => {
  server.close();
  await prisma.$disconnect();
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
