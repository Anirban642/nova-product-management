import { useEffect, useState } from "react";
import { ArrowLeft, ArrowUpRight, Bell, CalendarDays, Check, ChevronDown, CircleHelp, FolderKanban, LayoutDashboard, LogOut, Menu, MessageCircle, Plus, Search, Send, Settings2, Sparkles, UserPlus, Users, X } from "lucide-react";
import { api, type Project, type Task, type User } from "./api";

type AuthMode = "login" | "signup";

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    if (!localStorage.getItem("nova_token")) {
      setCheckingSession(false);
      return;
    }
    api.me().then(({ user: currentUser }) => setUser(currentUser)).catch(() => localStorage.removeItem("nova_token")).finally(() => setCheckingSession(false));
  }, []);

  if (checkingSession) return <div className="page-loader"><div className="loader-mark">N</div><span>Restoring your workspace</span></div>;
  return user ? <Dashboard user={user} onLogout={() => { localStorage.removeItem("nova_token"); setUser(null); }} /> : <Auth onAuthenticated={setUser} />;
}

function Auth({ onAuthenticated }: { onAuthenticated: (user: User) => void }) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (mode === "signup" && name.trim().length < 2) return setError("Tell us your name to get started.");
    if (!email.includes("@")) return setError("Enter a valid email address.");
    if (password.length < 8) return setError("Your password needs at least 8 characters.");
    setSubmitting(true);
    try {
      const result = mode === "login" ? await api.login({ email, password }) : await api.signup({ name, email, password });
      localStorage.setItem("nova_token", result.token);
      onAuthenticated(result.user);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to authenticate.");
    } finally {
      setSubmitting(false);
    }
  };

  return <main className="auth-page">
    <section className="auth-story">
      <div className="brand-lockup"><span className="brand-symbol">N</span><span>NOVA</span></div>
      <div className="story-copy">
        <p className="eyebrow">The team operating system</p>
        <h1>Make good work feel <em>inevitable.</em></h1>
        <p className="story-description">A calmer place to plan the work, bring people together, and move every important idea forward.</p>
      </div>
      <div className="story-footer"><span className="signal-dot" /> <span>Built for teams in motion</span><span className="footer-rule" /><span>01 / 03</span></div>
    </section>
    <section className="auth-panel">
      <div className="mobile-brand brand-lockup"><span className="brand-symbol">N</span><span>NOVA</span></div>
      <div className="auth-heading"><p className="eyebrow">Welcome back</p><h2>{mode === "login" ? "Sign in to your orbit." : "Start your orbit."}</h2><p>{mode === "login" ? "Pick up where your team left off." : "Create your team workspace in a minute."}</p></div>
      <div className="auth-tabs"><button className={mode === "login" ? "active" : ""} onClick={() => { setMode("login"); setError(""); }}>Sign in</button><button className={mode === "signup" ? "active" : ""} onClick={() => { setMode("signup"); setError(""); }}>Create account</button></div>
      <form onSubmit={submit} className="auth-form">
        {mode === "signup" && <label>Full name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Alex Morgan" autoComplete="name" /></label>}
        <label>Work email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" autoComplete="email" /></label>
        <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="8+ characters" autoComplete={mode === "login" ? "current-password" : "new-password"} /></label>
        {error && <div className="form-error"><X size={16} />{error}</div>}
        <button className="primary-button" disabled={submitting}>{submitting ? "Opening workspace..." : mode === "login" ? "Enter NOVA" : "Create workspace"}<ArrowUpRight size={18} /></button>
      </form>
      <p className="auth-note"><Check size={15} /> Your workspace is private by default.</p>
    </section>
  </main>;
}

function Dashboard({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    api.projects().then(({ projects: nextProjects }) => setProjects(nextProjects)).catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Unable to load projects.")).finally(() => setLoading(false));
  }, []);

  return <div className="app-shell">
    <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
      <div className="sidebar-top"><div className="brand-lockup"><span className="brand-symbol">N</span><span>NOVA</span></div><button className="icon-button mobile-close" aria-label="Close navigation" onClick={() => setSidebarOpen(false)}><X size={19} /></button></div>
      <div className="workspace-switcher"><span className="workspace-avatar">A</span><span><strong>Acme Studio</strong><small>Personal workspace</small></span><ChevronDown size={15} /></div>
      <nav><p className="nav-label">Workspace</p><button className={`nav-item ${!activeProjectId ? "selected" : ""}`} onClick={() => setActiveProjectId(null)}><LayoutDashboard size={18} />Overview</button><button className={`nav-item ${activeProjectId ? "selected" : ""}`} onClick={() => setActiveProjectId(projects[0]?.id ?? null)}><FolderKanban size={18} />Projects<span className="nav-count">{projects.length}</span></button><button className="nav-item"><Users size={18} />People</button><p className="nav-label nav-label-spaced">Manage</p><button className="nav-item"><Settings2 size={18} />Settings</button><button className="nav-item"><CircleHelp size={18} />Help center</button></nav>
      <div className="sidebar-bottom"><div className="upgrade-note"><Sparkles size={17} /><strong>Find your flow</strong><span>Invite your team and make space for the big work.</span><button>Explore NOVA <ArrowUpRight size={14} /></button></div><button className="nav-item logout" onClick={async () => { try { await api.logout(); } finally { onLogout(); } }}><LogOut size={18} />Sign out</button></div>
    </aside>
    {sidebarOpen && <button className="sidebar-scrim" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}
    <main className="main-content">
      <header className="topbar"><button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setSidebarOpen(true)}><Menu size={21} /></button><div className="breadcrumbs"><span>Workspace</span><span>/</span><strong>{activeProjectId ? projects.find((project) => project.id === activeProjectId)?.name ?? "Project" : "Overview"}</strong></div><div className="topbar-actions"><button className="icon-button" aria-label="Search"><Search size={18} /></button><button className="icon-button notification" aria-label="Notifications"><Bell size={18} /><i /></button><div className="profile"><span className="profile-avatar">{user.name.charAt(0).toUpperCase()}</span><span className="profile-name">{user.name}</span><ChevronDown size={15} /></div></div></header>
      <div className="content-wrap"><div className="page-intro"><div><p className="eyebrow">Wednesday, September 9, 2026</p><h1>Good morning, {user.name.split(" ")[0]}.</h1><p className="intro-copy">Here is the pulse of your workspace today.</p></div><button className="primary-button compact" onClick={() => setCreateOpen(true)}><Plus size={17} />New project</button></div>
        {activeProjectId && <ProjectDetail projectId={activeProjectId} currentUser={user} onBack={() => setActiveProjectId(null)} />}
        {!activeProjectId && <>
        <div className="metric-row"><Metric label="Active projects" value={projects.length.toString().padStart(2, "0")} detail="Across your workspace" /><Metric label="Open tasks" value={projects.reduce((total, project) => total + project.tasks.length, 0).toString().padStart(2, "0")} detail="Waiting for momentum" /><Metric label="Team members" value={new Set(projects.flatMap((project) => project.members.map(({ user: member }) => member.id))).size.toString().padStart(2, "0")} detail="Contributors in orbit" /></div>
        <section className="section-heading"><div><p className="eyebrow">Your work</p><h2>Projects</h2></div><button className="text-button">View all <ArrowUpRight size={15} /></button></section>
        {loading && <div className="state-panel"><div className="spinner" /><h3>Gathering your workspace</h3><p>Projects will appear here in just a moment.</p></div>}
        {!loading && error && <div className="state-panel error-state"><X size={24} /><h3>We could not load your projects</h3><p>{error}</p><button className="secondary-button" onClick={() => window.location.reload()}>Try again</button></div>}
        {!loading && !error && projects.length === 0 && <div className="state-panel empty-state"><div className="empty-icon"><FolderKanban size={27} /></div><h3>Your workspace is a blank canvas</h3><p>Create your first project to give the team a clear place to plan and deliver.</p><button className="primary-button compact" onClick={() => setCreateOpen(true)}><Plus size={17} />Create your first project</button></div>}
        {!loading && !error && projects.length > 0 && <div className="project-grid">{projects.map((project, index) => <ProjectCard key={project.id} project={project} index={index} onOpen={() => setActiveProjectId(project.id)} />)}</div>}
        </>}
      </div>
    </main>
    {createOpen && <CreateProjectDialog onClose={() => setCreateOpen(false)} onCreated={(project) => { setProjects((current) => [project, ...current]); setCreateOpen(false); setActiveProjectId(project.id); }} />}
  </div>;
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) { return <div className="metric"><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>; }
function ProjectCard({ project, index, onOpen }: { project: Project; index: number; onOpen: () => void }) { const palettes = ["coral", "mint", "blue"]; const progress = project.tasks.length ? Math.round(project.tasks.filter((task) => task.status === "DONE").length / project.tasks.length * 100) : 0; return <article className={`project-card ${palettes[index % palettes.length]}`} onClick={onOpen}><div className="card-top"><span className="project-mark"><FolderKanban size={17} /></span><button className="card-menu" aria-label={`Open ${project.name} menu`}><ChevronDown size={16} /></button></div><h3>{project.name}</h3><p>{project.description || "No description yet. Add a little context for your team."}</p><div className="project-progress"><div><span>Progress</span><b>{progress}%</b></div><div className="progress-track"><i style={{ width: `${progress}%` }} /></div></div><div className="card-meta"><span><Users size={15} />{project.members.length} members</span><span><Check size={15} />{project.tasks.length} tasks</span></div><div className="card-footer"><div className="avatar-stack">{project.members.slice(0, 3).map(({ user: member }) => <span key={member.id} title={member.name}>{member.name.charAt(0)}</span>)}</div><ArrowUpRight size={18} /></div></article>; }

function CreateProjectDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (project: Project) => void }) { const [name, setName] = useState(""); const [description, setDescription] = useState(""); const [error, setError] = useState(""); const [saving, setSaving] = useState(false); const submit = async (event: React.FormEvent) => { event.preventDefault(); if (!name.trim()) return setError("Give your project a name."); setSaving(true); try { const { project } = await api.createProject({ name: name.trim(), description: description.trim() || undefined }); onCreated(project); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Project could not be created."); } finally { setSaving(false); } }; return <div className="dialog-overlay"><button className="overlay-close" aria-label="Close dialog" onClick={onClose} /><form className="create-dialog" onSubmit={submit}><div className="dialog-heading"><div><p className="eyebrow">New workspace</p><h2>Create a project</h2></div><button type="button" className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={18} /></button></div><label>Project name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Spring launch" autoFocus /></label><label>Description <span>(optional)</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What is this team working toward?" rows={4} /></label>{error && <div className="form-error"><X size={15} />{error}</div>}<div className="dialog-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button compact" disabled={saving}>{saving ? "Creating..." : "Create project"}<ArrowUpRight size={15} /></button></div></form></div>; }

function ProjectDetail({ projectId, currentUser, onBack }: { projectId: string; currentUser: User; onBack: () => void }) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [comment, setComment] = useState("");
  const [inviteId, setInviteId] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskError, setTaskError] = useState("");

  const loadProject = () => {
    setLoading(true);
    api.project(projectId).then(({ project: nextProject }) => setProject(nextProject)).catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Unable to load this project.")).finally(() => setLoading(false));
  };
  useEffect(loadProject, [projectId]);

  const changeStatus = async (task: Task, status: Task["status"]) => {
    try {
      const { task: updatedTask } = await api.updateTaskStatus(projectId, task.id, status);
      setProject((current) => current ? { ...current, tasks: current.tasks.map((item) => item.id === task.id ? updatedTask : item) } : current);
      setSelectedTask((current) => current?.id === task.id ? updatedTask : current);
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Status could not be updated."); }
  };
  const submitComment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedTask || !comment.trim()) return;
    try {
      const { comment: newComment } = await api.addComment(projectId, selectedTask.id, comment.trim());
      const updatedTask = { ...selectedTask, comments: [...selectedTask.comments, newComment] };
      setSelectedTask(updatedTask);
      setProject((current) => current ? { ...current, tasks: current.tasks.map((item) => item.id === updatedTask.id ? updatedTask : item) } : current);
      setComment("");
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Comment could not be added."); }
  };
  const inviteMember = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!inviteId.trim()) return;
    setInviteError("");
    try {
      const { member } = await api.addMember(projectId, inviteId.trim(), "MEMBER");
      setProject((current) => current ? { ...current, members: [...current.members, member] } : current);
      setInviteId("");
    } catch (requestError) { setInviteError(requestError instanceof Error ? requestError.message : "Member could not be added."); }
  };
  const createTask = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!taskTitle.trim()) return setTaskError("Give the task a title.");
    setTaskError("");
    try {
      const { task } = await api.createTask(projectId, { title: taskTitle.trim() });
      setProject((current) => current ? { ...current, tasks: [task, ...current.tasks] } : current);
      setTaskTitle("");
    } catch (requestError) { setTaskError(requestError instanceof Error ? requestError.message : "Task could not be created."); }
  };

  if (loading) return <div className="state-panel detail-state"><div className="spinner" /><h3>Opening project workspace</h3><p>Loading members, tasks, and activity.</p></div>;
  if (error && !project) return <div className="state-panel error-state detail-state"><X size={24} /><h3>Project unavailable</h3><p>{error}</p><button className="secondary-button" onClick={loadProject}>Try again</button></div>;
  if (!project) return null;
  const columns: { status: Task["status"]; label: string }[] = [{ status: "TODO", label: "To do" }, { status: "IN_PROGRESS", label: "In progress" }, { status: "DONE", label: "Done" }];
  const completedTasks = project.tasks.filter((task) => task.status === "DONE").length;
  const progress = project.tasks.length ? Math.round(completedTasks / project.tasks.length * 100) : 0;
  return <section className="project-detail">
    <button className="back-button" onClick={onBack}><ArrowLeft size={16} />All projects</button>
    <div className="detail-heading"><div><p className="eyebrow">Project workspace</p><h2>{project.name}</h2><p>{project.description || "A shared place for the team to plan and deliver."}</p></div><div className="detail-progress"><div><span>Delivery progress</span><strong>{progress}%</strong></div><div className="progress-track"><i style={{ width: `${progress}%` }} /></div><small>{completedTasks} of {project.tasks.length} tasks complete</small></div></div>
    {error && <div className="inline-error"><X size={15} />{error}</div>}
    <div className="detail-grid"><div className="board-area"><div className="board-heading"><h3>Task board</h3><span>{project.tasks.length} total tasks</span></div><div className="kanban">{columns.map((column) => <div className="kanban-column" key={column.status}><div className="column-heading"><span className={`status-dot ${column.status.toLowerCase()}`} />{column.label}<b>{project.tasks.filter((task) => task.status === column.status).length}</b></div><div className="task-list">{project.tasks.filter((task) => task.status === column.status).map((task) => <TaskCard key={task.id} task={task} onOpen={() => setSelectedTask(task)} onChangeStatus={changeStatus} />)}</div>{column.status === "TODO" && <form className="quick-task-form" onSubmit={createTask}><input value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} placeholder="New task title" aria-label="New task title" /><button aria-label="Create task" disabled={!taskTitle.trim()}><Plus size={15} /></button>{taskError && <small className="invite-error">{taskError}</small>}</form>}</div>)}</div></div>
      <aside className="member-panel"><div className="member-panel-heading"><div><p className="eyebrow">The crew</p><h3>Members <span>{project.members.length}</span></h3></div><Users size={20} /></div><div className="member-list">{project.members.map(({ user: member, role }) => <div className="member-row" key={member.id}><span className="member-avatar">{member.name.charAt(0)}</span><span><strong>{member.name}</strong><small>{member.email}</small></span><em>{role.toLowerCase()}</em></div>)}</div><form className="invite-form" onSubmit={inviteMember}><label>Add by member ID<input id="member-id-input" value={inviteId} onChange={(event) => setInviteId(event.target.value)} placeholder="User ID" /></label><button className="primary-button compact" disabled={!inviteId.trim()}><UserPlus size={15} />Add member</button>{inviteError && <small className="invite-error">{inviteError}</small>}</form></aside>
    </div>
    {selectedTask && <TaskPanel task={selectedTask} currentUser={currentUser} onClose={() => setSelectedTask(null)} comment={comment} setComment={setComment} submitComment={submitComment} onChangeStatus={changeStatus} />}
  </section>;
}

function TaskCard({ task, onOpen, onChangeStatus }: { task: Task; onOpen: () => void; onChangeStatus: (task: Task, status: Task["status"]) => void }) { const nextStatus = task.status === "TODO" ? "IN_PROGRESS" : task.status === "IN_PROGRESS" ? "DONE" : null; return <button className="task-card" onClick={onOpen}><div className="task-card-top"><span className="task-type">TASK</span><ChevronDown size={15} /></div><h4>{task.title}</h4>{task.description && <p>{task.description}</p>}<div className="task-card-bottom"><span>{task.assignee ? <><span className="mini-avatar">{task.assignee.name.charAt(0)}</span>{task.assignee.name.split(" ")[0]}</> : "Unassigned"}</span>{task.dueDate && <span><CalendarDays size={13} />{new Date(task.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>}</div>{nextStatus && <span className="advance-status" onClick={(event) => { event.stopPropagation(); onChangeStatus(task, nextStatus); }}>{task.status === "TODO" ? "Start task" : "Mark done"}<ArrowUpRight size={13} /></span>}</button>; }

function TaskPanel({ task, currentUser, onClose, comment, setComment, submitComment, onChangeStatus }: { task: Task; currentUser: User; onClose: () => void; comment: string; setComment: (value: string) => void; submitComment: (event: React.FormEvent) => void; onChangeStatus: (task: Task, status: Task["status"]) => void }) { const nextStatus = task.status === "TODO" ? "IN_PROGRESS" : task.status === "IN_PROGRESS" ? "DONE" : null; return <div className="task-overlay"><button className="overlay-close" aria-label="Close task" onClick={onClose}><X size={19} /></button><aside className="task-panel"><div className="task-panel-header"><span className={`task-status-label ${task.status.toLowerCase()}`}>{task.status.replace("_", " ")}</span><span className="task-type">TASK</span></div><h2>{task.title}</h2>{task.description && <p className="task-description">{task.description}</p>}<div className="task-fields"><div><span>Assignee</span><strong>{task.assignee?.name || "Unassigned"}</strong></div><div><span>Due date</span><strong>{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No due date"}</strong></div></div>{nextStatus && <button className="primary-button compact" onClick={() => onChangeStatus(task, nextStatus)}><Check size={15} />{nextStatus === "DONE" ? "Mark as done" : "Move to in progress"}</button>}<div className="activity-heading"><h3>Activity</h3><span>{task.comments.length}</span></div><div className="comment-list">{task.comments.length ? task.comments.map((item) => <div className="comment" key={item.id}><span className="member-avatar">{item.author.name.charAt(0)}</span><div><strong>{item.author.id === currentUser.id ? "You" : item.author.name}</strong><small>{new Date(item.createdAt).toLocaleDateString()}</small><p>{item.body}</p></div></div>) : <div className="no-comments"><MessageCircle size={20} /><span>No activity yet. Start the conversation.</span></div>}</div><form className="comment-form" onSubmit={submitComment}><input value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Write a comment..." /><button aria-label="Send comment" disabled={!comment.trim()}><Send size={16} /></button></form></aside></div>; }
