const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export type User = { id: string; name: string; email: string; role: "ADMIN" | "MEMBER" };
export type Comment = { id: string; body: string; createdAt: string; author: Pick<User, "id" | "name" | "email"> };
export type Task = { id: string; title: string; description: string | null; status: "TODO" | "IN_PROGRESS" | "DONE"; dueDate: string | null; projectId: string; assigneeId: string | null; assignee: User | null; comments: Comment[]; createdAt: string; updatedAt: string };
export type ProjectMember = { projectId: string; userId: string; role: "ADMIN" | "MEMBER"; user: User };
export type Project = { id: string; name: string; description: string | null; members: ProjectMember[]; tasks: Task[]; createdAt: string };

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("nova_token");
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers }
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error ?? "Something went wrong. Please try again.");
  }
  return response.status === 204 ? (undefined as T) : response.json();
}

export const api = {
  login: (body: { email: string; password: string }) => request<{ user: User; token: string }>("/api/auth/login", { method: "POST", body: JSON.stringify(body) }),
  signup: (body: { name: string; email: string; password: string }) => request<{ user: User; token: string }>("/api/auth/signup", { method: "POST", body: JSON.stringify(body) }),
  me: () => request<{ user: User }>("/api/auth/me"),
  logout: () => request<void>("/api/auth/logout", { method: "POST" }),
  projects: () => request<{ projects: Project[] }>("/api/projects"),
  createProject: (body: { name: string; description?: string }) => request<{ project: Project }>("/api/projects", { method: "POST", body: JSON.stringify(body) }),
  project: (projectId: string) => request<{ project: Project }>(`/api/projects/${projectId}`),
  createTask: (projectId: string, body: { title: string; description?: string }) => request<{ task: Task }>(`/api/projects/${projectId}/tasks`, { method: "POST", body: JSON.stringify(body) }),
  updateTaskStatus: (projectId: string, taskId: string, status: Task["status"]) => request<{ task: Task }>(`/api/projects/${projectId}/tasks/${taskId}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  addComment: (projectId: string, taskId: string, body: string) => request<{ comment: Comment }>(`/api/projects/${projectId}/tasks/${taskId}/comments`, { method: "POST", body: JSON.stringify({ body }) }),
  addMember: (projectId: string, userId: string, role: "ADMIN" | "MEMBER") => request<{ member: ProjectMember }>(`/api/projects/${projectId}/members`, { method: "POST", body: JSON.stringify({ userId, role }) })
};
