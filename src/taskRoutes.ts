import { Router } from "express";
import { TaskStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "./db.js";

export const taskRouter = Router({ mergeParams: true });

const routeParams = (params: Record<string, string | string[]>) => ({
  projectId: String(params.projectId),
  taskId: params.taskId ? String(params.taskId) : undefined
});

const taskInput = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).nullable().optional(),
  assigneeId: z.string().min(1).nullable().optional(),
  dueDate: z.coerce.date().nullable().optional()
});
const taskUpdateInput = taskInput.partial();
const statusInput = z.object({ status: z.enum([TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.DONE]) });
const commentInput = z.object({ body: z.string().trim().min(1).max(5000) });

const taskInclude = {
  assignee: { select: { id: true, name: true, email: true, role: true } },
  comments: {
    orderBy: { createdAt: "asc" as const },
    include: { author: { select: { id: true, name: true, email: true } } }
  }
};

const getProject = (projectId: string) => prisma.project.findUnique({ where: { id: projectId }, select: { id: true } });
const getTask = (projectId: string, taskId: string) => prisma.task.findFirst({ where: { id: taskId, projectId }, include: taskInclude });

async function validAssignee(projectId: string, assigneeId: string | null | undefined) {
  if (assigneeId === undefined || assigneeId === null) return true;
  const membership = await prisma.projectMember.findUnique({ where: { projectId_userId: { projectId, userId: assigneeId } } });
  return Boolean(membership);
}

function canTransition(from: TaskStatus, to: TaskStatus) {
  return from === to || (from === TaskStatus.TODO && to === TaskStatus.IN_PROGRESS) || (from === TaskStatus.IN_PROGRESS && to === TaskStatus.DONE);
}

taskRouter.get("/", async (request, response, next) => {
  try {
    const { projectId } = routeParams(request.params);
    if (!(await getProject(projectId))) {
      response.status(404).json({ error: "Project not found" });
      return;
    }
    const tasks = await prisma.task.findMany({ where: { projectId }, orderBy: { createdAt: "desc" }, include: taskInclude });
    response.json({ tasks });
  } catch (error) {
    next(error);
  }
});

taskRouter.post("/", async (request, response, next) => {
  try {
    const { projectId } = routeParams(request.params);
    const input = taskInput.parse(request.body);
    if (!(await getProject(projectId))) {
      response.status(404).json({ error: "Project not found" });
      return;
    }
    if (!(await validAssignee(projectId, input.assigneeId))) {
      response.status(400).json({ error: "Assignee must be a member of this project" });
      return;
    }
    const task = await prisma.task.create({ data: { ...input, projectId }, include: taskInclude });
    response.status(201).json({ task });
  } catch (error) {
    next(error);
  }
});

taskRouter.get("/:taskId", async (request, response, next) => {
  try {
    const { projectId, taskId } = routeParams(request.params);
    const task = await getTask(projectId, taskId!);
    if (!task) {
      response.status(404).json({ error: "Task not found in this project" });
      return;
    }
    response.json({ task });
  } catch (error) {
    next(error);
  }
});

taskRouter.patch("/:taskId", async (request, response, next) => {
  try {
    const { projectId, taskId } = routeParams(request.params);
    const input = taskUpdateInput.parse(request.body);
    const currentTask = await getTask(projectId, taskId!);
    if (!currentTask) {
      response.status(404).json({ error: "Task not found in this project" });
      return;
    }
    if (!(await validAssignee(projectId, input.assigneeId))) {
      response.status(400).json({ error: "Assignee must be a member of this project" });
      return;
    }
    const task = await prisma.task.update({ where: { id: taskId }, data: input, include: taskInclude });
    response.json({ task });
  } catch (error) {
    next(error);
  }
});

taskRouter.delete("/:taskId", async (request, response, next) => {
  try {
    const { projectId, taskId } = routeParams(request.params);
    if (!(await getTask(projectId, taskId!))) {
      response.status(404).json({ error: "Task not found in this project" });
      return;
    }
    await prisma.task.delete({ where: { id: taskId } });
    response.status(204).send();
  } catch (error) {
    next(error);
  }
});

taskRouter.patch("/:taskId/status", async (request, response, next) => {
  try {
    const { projectId, taskId } = routeParams(request.params);
    const { status } = statusInput.parse(request.body);
    const currentTask = await getTask(projectId, taskId!);
    if (!currentTask) {
      response.status(404).json({ error: "Task not found in this project" });
      return;
    }
    if (!canTransition(currentTask.status, status)) {
      response.status(409).json({ error: `Invalid status transition from ${currentTask.status} to ${status}` });
      return;
    }
    const task = await prisma.task.update({ where: { id: taskId }, data: { status }, include: taskInclude });
    response.json({ task });
  } catch (error) {
    next(error);
  }
});

taskRouter.get("/:taskId/comments", async (request, response, next) => {
  try {
    const { projectId, taskId } = routeParams(request.params);
    const task = await getTask(projectId, taskId!);
    if (!task) {
      response.status(404).json({ error: "Task not found in this project" });
      return;
    }
    response.json({ comments: task.comments });
  } catch (error) {
    next(error);
  }
});

taskRouter.post("/:taskId/comments", async (request, response, next) => {
  try {
    const { projectId, taskId } = routeParams(request.params);
    const { body } = commentInput.parse(request.body);
    if (!(await getTask(projectId, taskId!))) {
      response.status(404).json({ error: "Task not found in this project" });
      return;
    }
    const comment = await prisma.comment.create({
      data: { body, taskId: taskId!, authorId: request.user!.id },
      include: { author: { select: { id: true, name: true, email: true } } }
    });
    response.status(201).json({ comment });
  } catch (error) {
    next(error);
  }
});
