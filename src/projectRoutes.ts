import { Router } from "express";
import { Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "./db.js";
import { requireAdmin } from "./auth.js";

export const projectRouter = Router();

const projectInput = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).nullable().optional()
});
const memberInput = z.object({
  userId: z.string().min(1),
  role: z.enum([Role.ADMIN, Role.MEMBER]).default(Role.MEMBER)
});
const roleInput = z.object({ role: z.enum([Role.ADMIN, Role.MEMBER]) });

const projectInclude = {
  members: {
    orderBy: { joinedAt: "asc" as const },
    include: { user: { select: { id: true, name: true, email: true, role: true } } }
  },
  tasks: {
    orderBy: { createdAt: "desc" as const },
    include: {
      assignee: { select: { id: true, name: true, email: true, role: true } },
      comments: {
        orderBy: { createdAt: "asc" as const },
        include: { author: { select: { id: true, name: true, email: true } } }
      }
    }
  }
};

projectRouter.get("/", async (_request, response, next) => {
  try {
    const projects = await prisma.project.findMany({ orderBy: { createdAt: "desc" }, include: projectInclude });
    response.json({ projects });
  } catch (error) {
    next(error);
  }
});

projectRouter.post("/", async (request, response, next) => {
  try {
    const input = projectInput.parse(request.body);
    const project = await prisma.project.create({
      data: {
        name: input.name,
        description: input.description,
        members: { create: { userId: request.user!.id, role: request.user!.role } }
      },
      include: projectInclude
    });
    response.status(201).json({ project });
  } catch (error) {
    next(error);
  }
});

projectRouter.get("/:projectId", async (request, response, next) => {
  try {
    const project = await prisma.project.findUnique({ where: { id: request.params.projectId }, include: projectInclude });
    if (!project) {
      response.status(404).json({ error: "Project not found" });
      return;
    }
    response.json({ project });
  } catch (error) {
    next(error);
  }
});

projectRouter.patch("/:projectId", async (request, response, next) => {
  try {
    const input = projectInput.partial().parse(request.body);
    const project = await prisma.project.update({
      where: { id: request.params.projectId },
      data: input,
      include: projectInclude
    });
    response.json({ project });
  } catch (error) {
    next(error);
  }
});

projectRouter.delete("/:projectId", requireAdmin, async (request, response, next) => {
  try {
    const projectId = request.params.projectId as string;
    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } });
    if (!project) {
      response.status(404).json({ error: "Project not found" });
      return;
    }
    await prisma.project.delete({ where: { id: project.id } });
    response.status(204).send();
  } catch (error) {
    next(error);
  }
});

projectRouter.post("/:projectId/members", async (request, response, next) => {
  try {
    const input = memberInput.parse(request.body);
    const [project, user] = await Promise.all([
      prisma.project.findUnique({ where: { id: request.params.projectId }, select: { id: true } }),
      prisma.user.findUnique({ where: { id: input.userId }, select: { id: true } })
    ]);
    if (!project) {
      response.status(404).json({ error: "Project not found" });
      return;
    }
    if (!user) {
      response.status(404).json({ error: "User not found" });
      return;
    }
    const existing = await prisma.projectMember.findUnique({ where: { projectId_userId: { projectId: project.id, userId: user.id } } });
    if (existing) {
      response.status(409).json({ error: "User is already a project member" });
      return;
    }
    const member = await prisma.projectMember.create({
      data: { projectId: project.id, userId: user.id, role: input.role },
      include: { user: { select: { id: true, name: true, email: true, role: true } } }
    });
    response.status(201).json({ member });
  } catch (error) {
    next(error);
  }
});

projectRouter.patch("/:projectId/members/:userId", async (request, response, next) => {
  try {
    const input = roleInput.parse(request.body);
    const member = await prisma.projectMember.update({
      where: { projectId_userId: { projectId: request.params.projectId, userId: request.params.userId } },
      data: { role: input.role },
      include: { user: { select: { id: true, name: true, email: true, role: true } } }
    });
    response.json({ member });
  } catch (error) {
    next(error);
  }
});

projectRouter.delete("/:projectId/members/:userId", async (request, response, next) => {
  try {
    const membership = await prisma.projectMember.findUnique({ where: { projectId_userId: { projectId: request.params.projectId, userId: request.params.userId } } });
    if (!membership) {
      response.status(404).json({ error: "Project member not found" });
      return;
    }
    await prisma.projectMember.delete({ where: { projectId_userId: { projectId: request.params.projectId, userId: request.params.userId } } });
    response.status(204).send();
  } catch (error) {
    next(error);
  }
});
