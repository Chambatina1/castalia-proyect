import { create } from 'zustand';

// ─── Types ───────────────────────────────────────────────────────────────────

export type View =
  | 'login'
  | 'dashboard'
  | 'projects'
  | 'project-detail'
  | 'photos'
  | 'chat'
  | 'tasks'
  | 'reports'
  | 'clients'
  | 'settings'
  | 'client-portal';

export type UserRole = 'SUPER_ADMIN' | 'MANAGER' | 'EMPLOYEE' | 'CLIENT';

export type ProjectStatus =
  | 'ACTIVE'
  | 'PAUSED'
  | 'COMPLETED'
  | 'ARCHIVED';

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'NEEDS_REVIEW';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  position?: string;
  isActive?: boolean;
}

export interface Project {
  id: string;
  name: string;
  clientName: string;
  clientEmail?: string;
  address: string;
  city?: string;
  state?: string;
  status: ProjectStatus;
  priority: TaskPriority;
  startDate?: string;
  estimatedEnd?: string;
  description?: string;
  progress: number;
  coverImage?: string;
  _count?: {
    members: number;
    photos: number;
    tasks: number;
    reports: number;
  };
  members?: ProjectMember[];
  photos?: Photo[];
  tasks?: Task[];
  reports?: Report[];
  creator?: Partial<User>;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: string;
  user?: Partial<User>;
}

export interface Photo {
  id: string;
  url: string;
  thumbnailUrl?: string;
  caption?: string;
  projectId: string;
  uploadedById: string;
  uploadedBy?: Partial<User>;
  tags?: string;
  isApproved?: boolean;
  isVisibleToClient?: boolean;
  isUrgent?: boolean;
  createdAt: string;
}

export interface Annotation {
  id: string;
  type: 'arrow' | 'circle' | 'text' | 'freedraw' | 'comment';
  x: number;
  y: number;
  color: string;
  text?: string;
  points?: { x: number; y: number }[];
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  projectId: string;
  assigneeId?: string;
  assignee?: Partial<User>;
  creatorId?: string;
  creator?: Partial<User>;
  dueDate?: string;
  checklist?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  content: string;
  senderId: string;
  sender?: Partial<User>;
  projectId?: string;
  messageType?: string;
  fileUrl?: string;
  mentions?: string;
  isInternal?: boolean;
  createdAt: string;
  readBy?: string[];
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  link?: string;
  createdAt: string;
}

export interface Report {
  id: string;
  title: string;
  type: 'PROGRESS' | 'INSPECTION' | 'BEFORE_AFTER' | 'INTERNAL' | 'CLIENT';
  content?: string;
  photos?: string;
  status: 'DRAFT' | 'FINAL' | 'SENT';
  projectId: string;
  project?: Partial<Project>;
  generatedBy: string;
  generator?: Partial<User>;
  sentToEmail?: string;
  shareLink?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClientShare {
  id: string;
  projectId: string;
  project?: Partial<Project>;
  createdBy: string;
  creator?: Partial<User>;
  clientEmail?: string;
  clientName?: string;
  token: string;
  password?: string;
  expiresAt?: string;
  allowedPhotos?: string;
  allowedReports?: string;
  isActive: boolean;
  lastAccessed?: string;
  createdAt: string;
}

export interface ActivityEntry {
  id: string;
  userId: string;
  user?: Partial<User>;
  projectId?: string;
  project?: { id: string; name: string };
  action: string;
  entityType?: string;
  entityId?: string;
  details?: string;
  createdAt: string;
}

export interface Note {
  id: string;
  projectId: string;
  authorId: string;
  author?: Partial<User>;
  content: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectFilters {
  status?: ProjectStatus;
  priority?: TaskPriority;
  search?: string;
  manager?: string;
  dateRange?: { from?: Date; to?: Date };
}

export interface TaskFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
  projectId?: string;
  assigneeId?: string;
}

// ─── Permission Map ──────────────────────────────────────────────────────────

const ROLE_PERMISSIONS: Record<UserRole, View[]> = {
  SUPER_ADMIN: [
    'dashboard',
    'projects',
    'project-detail',
    'photos',
    'chat',
    'tasks',
    'reports',
    'clients',
    'settings',
  ],
  MANAGER: [
    'dashboard',
    'projects',
    'project-detail',
    'photos',
    'chat',
    'tasks',
    'reports',
    'clients',
    'settings',
  ],
  EMPLOYEE: [
    'dashboard',
    'projects',
    'project-detail',
    'photos',
    'chat',
    'tasks',
  ],
  CLIENT: ['client-portal', 'projects', 'project-detail', 'photos', 'chat'],
};

// ─── Store Interface ─────────────────────────────────────────────────────────

interface AppStore {
  // Auth
  currentUser: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;

  // Navigation
  currentView: View;
  previousView: View | null;
  selectedProjectId: string | null;
  navigateTo: (view: View, projectId?: string) => void;
  goBack: () => void;

  // Projects
  projects: Project[];
  selectedProject: Project | null;
  projectFilters: ProjectFilters;
  setProjects: (projects: Project[]) => void;
  addProject: (project: Project) => void;
  updateProject: (id: string, data: Partial<Project>) => void;
  removeProject: (id: string) => void;
  setProjectFilters: (filters: ProjectFilters) => void;
  selectProject: (project: Project | null) => void;

  // Photos
  photos: Photo[];
  selectedPhoto: Photo | null;
  uploadModalOpen: boolean;
  uploadProjectId: string | null;
  setPhotos: (photos: Photo[]) => void;
  addPhoto: (photo: Photo) => void;
  removePhoto: (id: string) => void;
  selectPhoto: (photo: Photo | null) => void;
  setUploadModalOpen: (open: boolean) => void;
  closeUploadModal: () => void;
  openUploadModal: (projectId: string) => void;

  // Tasks
  tasks: Task[];
  taskFilters: TaskFilters;
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (id: string, data: Partial<Task>) => void;
  removeTask: (id: string) => void;
  setTaskFilters: (filters: TaskFilters) => void;

  // Chat
  messages: ChatMessage[];
  setMessages: (messages: ChatMessage[]) => void;
  addMessage: (message: ChatMessage) => void;
  clearMessages: () => void;

  // Reports
  reports: Report[];
  setReports: (reports: Report[]) => void;
  addReport: (report: Report) => void;

  // Client Shares
  clientShares: ClientShare[];
  setClientShares: (shares: ClientShare[]) => void;
  addClientShare: (share: ClientShare) => void;

  // Notifications
  notifications: Notification[];
  unreadCount: number;
  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Notification) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;

  // UI
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  mobileMenuOpen: boolean;
  searchQuery: string;
  searchOpen: boolean;
  toggleSidebar: () => void;
  toggleSidebarCollapse: () => void;
  toggleMobileMenu: () => void;
  setMobileMenuOpen: (open: boolean) => void;
  setSearch: (query: string) => void;
  toggleSearch: () => void;
  setSearchOpen: (open: boolean) => void;

  // Helpers
  canAccess: (view: View) => boolean;
  isManagerOrAdmin: () => boolean;
  isAdmin: () => boolean;
}

// ─── Store ───────────────────────────────────────────────────────────────────

// ─── Persist helpers ─────────────────────────────────────────────────────
const STORAGE_KEY = 'castalia-auth';
function loadPersistedAuth(): { currentUser: User | null; token: string | null } {
  if (typeof window === 'undefined') return { currentUser: null, token: null };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { currentUser: null, token: null };
}
function persistAuth(user: User | null, token: string | null) {
  if (typeof window === 'undefined') return;
  try {
    if (user && token) localStorage.setItem(STORAGE_KEY, JSON.stringify({ currentUser: user, token }));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

export const useAppStore = create<AppStore>((set, get) => ({
  // ── Auth ──
  currentUser: null,
  token: null,
  isAuthenticated: false,

  login: (user, token) => {
    persistAuth(user, token);
    set({
      currentUser: user,
      token,
      isAuthenticated: true,
      currentView: 'dashboard' as View,
    });
  },

  logout: () => {
    persistAuth(null, null);
    set({
      currentUser: null,
      token: null,
      isAuthenticated: false,
      currentView: 'login' as View,
      projects: [],
      selectedProject: null,
      selectedProjectId: null,
      photos: [],
      tasks: [],
      messages: [],
      reports: [],
      clientShares: [],
      notifications: [],
      unreadCount: 0,
    });
  },

  // ── Navigation ──
  currentView: 'login' as View,
  previousView: null,
  selectedProjectId: null,

  navigateTo: (view, projectId) =>
    set((state) => ({
      previousView: state.currentView,
      currentView: view,
      selectedProjectId: projectId ?? (view === 'project-detail' ? state.selectedProjectId : null),
      mobileMenuOpen: false,
    })),

  goBack: () =>
    set((state) => {
      const target = state.previousView ?? 'dashboard';
      return {
        currentView: target as View,
        previousView: state.currentView,
      };
    }),

  // ── Projects ──
  projects: [],
  selectedProject: null,
  projectFilters: {},

  setProjects: (projects) => set({ projects }),

  addProject: (project) =>
    set((state) => ({ projects: [project, ...state.projects] })),

  updateProject: (id, data) =>
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === id ? { ...p, ...data, updatedAt: new Date().toISOString() } : p
      ),
      selectedProject:
        state.selectedProject?.id === id
          ? { ...state.selectedProject, ...data, updatedAt: new Date().toISOString() }
          : state.selectedProject,
    })),

  removeProject: (id) =>
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
      selectedProject: state.selectedProject?.id === id ? null : state.selectedProject,
    })),

  setProjectFilters: (filters) =>
    set({ projectFilters: { ...get().projectFilters, ...filters } }),

  selectProject: (project) =>
    set({ selectedProject: project, selectedProjectId: project?.id ?? null }),

  // ── Photos ──
  photos: [],
  selectedPhoto: null,
  uploadModalOpen: false,
  uploadProjectId: null,

  setPhotos: (photos) => set({ photos }),

  addPhoto: (photo) =>
    set((state) => ({ photos: [photo, ...state.photos] })),

  removePhoto: (id) =>
    set((state) => ({
      photos: state.photos.filter((p) => p.id !== id),
      selectedPhoto: state.selectedPhoto?.id === id ? null : state.selectedPhoto,
    })),

  selectPhoto: (photo) => set({ selectedPhoto: photo }),
  setUploadModalOpen: (open) => set({ uploadModalOpen: open }),
  closeUploadModal: () => set({ uploadModalOpen: false, uploadProjectId: null }),
  openUploadModal: (projectId) => set({ uploadModalOpen: true, uploadProjectId: projectId }),

  // ── Tasks ──
  tasks: [],
  taskFilters: {},

  setTasks: (tasks) => set({ tasks }),

  addTask: (task) =>
    set((state) => ({ tasks: [task, ...state.tasks] })),

  updateTask: (id, data) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id ? { ...t, ...data, updatedAt: new Date().toISOString() } : t
      ),
    })),

  removeTask: (id) =>
    set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) })),

  setTaskFilters: (filters) =>
    set({ taskFilters: { ...get().taskFilters, ...filters } }),

  // ── Chat ──
  messages: [],

  setMessages: (messages) => set({ messages }),

  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),

  clearMessages: () => set({ messages: [] }),

  // ── Reports ──
  reports: [],
  setReports: (reports) => set({ reports }),
  addReport: (report) =>
    set((state) => ({ reports: [report, ...state.reports] })),

  // ── Client Shares ──
  clientShares: [],
  setClientShares: (shares) => set({ clientShares: shares }),
  addClientShare: (share) =>
    set((state) => ({ clientShares: [share, ...state.clientShares] })),

  // ── Notifications ──
  notifications: [],
  unreadCount: 0,

  setNotifications: (notifications) =>
    set({
      notifications,
      unreadCount: notifications.filter((n) => !n.read).length,
    }),

  addNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + (notification.read ? 0 : 1),
    })),

  markAsRead: (id) =>
    set((state) => {
      const wasUnread = state.notifications.find((n) => n.id === id && !n.read);
      return {
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, read: true } : n
        ),
        unreadCount: wasUnread ? state.unreadCount - 1 : state.unreadCount,
      };
    }),

  markAllAsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    })),

  // ── UI ──
  sidebarOpen: true,
  sidebarCollapsed: false,
  mobileMenuOpen: false,
  searchQuery: '',
  searchOpen: false,

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  toggleSidebarCollapse: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  toggleMobileMenu: () =>
    set((state) => ({ mobileMenuOpen: !state.mobileMenuOpen })),
  setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
  setSearch: (query) => set({ searchQuery: query }),
  toggleSearch: () => set((state) => ({ searchOpen: !state.searchOpen })),
  setSearchOpen: (open) => set({ searchOpen: open }),

  // ── Helpers ──
  canAccess: (view) => {
    const { currentUser } = get();
    if (!currentUser) return view === 'login';
    return ROLE_PERMISSIONS[currentUser.role]?.includes(view) ?? false;
  },

  isManagerOrAdmin: () => {
    const { currentUser } = get();
    if (!currentUser) return false;
    return currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'MANAGER';
  },

  isAdmin: () => {
    const { currentUser } = get();
    if (!currentUser) return false;
    return currentUser.role === 'SUPER_ADMIN';
  },
}));

// ─── Status/Label Helpers ────────────────────────────────────────────────────

export const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: 'Activo', color: 'bg-[#38C5B5]/15 text-[#2DA194] border-[#38C5B5]/25' },
  IN_PROGRESS: { label: 'En Progreso', color: 'bg-[#38C5B5]/15 text-[#2DA194] border-[#38C5B5]/25' },
  PAUSED: { label: 'Pausado', color: 'bg-amber-500/15 text-amber-600 border-amber-500/25' },
  COMPLETED: { label: 'Completado', color: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/25' },
  ARCHIVED: { label: 'Archivado', color: 'bg-[#5D7380]/15 text-[#5D7380] border-[#5D7380]/25' },
  PENDING: { label: 'Pendiente', color: 'bg-amber-500/15 text-amber-600 border-amber-500/25' },
  NEEDS_REVIEW: { label: 'Revisión', color: 'bg-orange-500/15 text-orange-600 border-orange-500/25' },
  NOT_STARTED: { label: 'Sin Iniciar', color: 'bg-[#5D7380]/15 text-[#5D7380] border-[#5D7380]/25' },
  CANCELLED: { label: 'Cancelado', color: 'bg-red-500/15 text-red-600 border-red-500/25' },
  TODO: { label: 'Por Hacer', color: 'bg-[#5D7380]/15 text-[#5D7380] border-[#5D7380]/25' },
  DONE: { label: 'Hecho', color: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/25' },
  REVIEW: { label: 'En Revisión', color: 'bg-orange-500/15 text-orange-600 border-orange-500/25' },
  DRAFT: { label: 'Borrador', color: 'bg-[#5D7380]/15 text-[#5D7380] border-[#5D7380]/25' },
  FINAL: { label: 'Final', color: 'bg-[#38C5B5]/15 text-[#2DA194] border-[#38C5B5]/25' },
  SENT: { label: 'Enviado', color: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/25' },
};

export const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  LOW: { label: 'Baja', color: 'bg-[#5D7380]/10 text-[#5D7380]' },
  MEDIUM: { label: 'Media', color: 'bg-[#38C5B5]/10 text-[#2DA194]' },
  HIGH: { label: 'Alta', color: 'bg-orange-500/10 text-orange-600' },
  URGENT: { label: 'Urgente', color: 'bg-red-500/10 text-red-600' },
};

export const REPORT_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  PROGRESS: { label: 'Progreso', color: 'bg-[#38C5B5]/15 text-[#2DA194] border-[#38C5B5]/25' },
  INSPECTION: { label: 'Inspección', color: 'bg-amber-500/15 text-amber-600 border-amber-500/25' },
  BEFORE_AFTER: { label: 'Antes/Después', color: 'bg-violet-500/15 text-violet-600 border-violet-500/25' },
  INTERNAL: { label: 'Interno', color: 'bg-[#5D7380]/15 text-[#5D7380] border-[#5D7380]/25' },
  CLIENT: { label: 'Cliente', color: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/25' },
};

export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Admin',
  MANAGER: 'Gerente',
  EMPLOYEE: 'Empleado',
  CLIENT: 'Cliente',
};

export const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: 'bg-[#38C5B5]/15 text-[#2DA194] border-[#38C5B5]/25',
  MANAGER: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/25',
  EMPLOYEE: 'bg-[#5D7380]/15 text-[#5D7380] border-[#5D7380]/25',
  CLIENT: 'bg-violet-500/15 text-violet-600 border-violet-500/25',
};