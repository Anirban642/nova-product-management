import { PrismaClient, Role, TaskStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("NovaDemo123!", 12);
  const admin = await prisma.user.upsert({ where: { email: "admin@nova.local" }, update: {}, create: { name: "Avery Admin", email: "admin@nova.local", passwordHash, role: Role.ADMIN } });
  const member = await prisma.user.upsert({ where: { email: "member@nova.local" }, update: {}, create: { name: "Mina Member", email: "member@nova.local", passwordHash, role: Role.MEMBER } });
  const project = await prisma.project.upsert({ where: { id: "nova-demo-project" }, update: {}, create: { id: "nova-demo-project", name: "Launch workspace", description: "A seeded project for testing the NOVA pipeline." } });
  await prisma.projectMember.createMany({ data: [{ projectId: project.id, userId: admin.id, role: Role.ADMIN }, { projectId: project.id, userId: member.id, role: Role.MEMBER }], skipDuplicates: true });
  await prisma.task.upsert({ where: { id: "nova-demo-task" }, update: {}, create: { id: "nova-demo-task", title: "Review NOVA workspace", description: "Confirm the seeded project and authentication flow.", status: TaskStatus.TODO, projectId: project.id, assigneeId: member.id } });
  console.log("Seeded NOVA demo data.");
  console.log("Demo accounts: admin@nova.local / NovaDemo123!, member@nova.local / NovaDemo123!");
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
