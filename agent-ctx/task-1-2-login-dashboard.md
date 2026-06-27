# Task 1 & 2: Login Page + Dashboard Page

## Files Created

### 1. `/src/store/app-store.ts`
- Zustand store with `currentView`, `user`, `isLoading`, `selectedProjectId`
- Actions: `navigateTo()`, `login()`, `logout()`, `setLoading()`, `selectProject()`
- Type: ViewType = 'login' | 'dashboard' | 'project-detail'

### 2. `/src/components/castalia/login-page.tsx`
- Full-screen dark navy background with decorative floating construction shapes (gold blocks, grid pattern, floating icons via framer-motion)
- Left panel (lg+): Brand showcase with Castalia Proyect logo, tagline in Spanish, feature pills, stats strip
- Right panel: Glassmorphism login card with email/password inputs, show/hide password toggle, "Remember me" checkbox, "Forgot password" link (shows toast), login button (primary with gold hover shadow)
- Below form: Demo credentials hint box with 3 clickable demo accounts (admin, manager, employee) that auto-fill
- Calls POST /api/auth/login on submit, calls store.login() on success, error toast on failure
- Fully responsive — brand panel hidden on mobile, mobile logo shown instead

### 3. `/src/components/castalia/dashboard-page.tsx`
- **Header**: Sticky top bar with logo, notification bell (with unread count badge), user avatar/name/role, logout button
- **Stats Row**: 4 animated cards in 2x2/4-col grid — Total Projects (Building2), Photos This Week (Camera), Pending Tasks (CheckSquare, highlighted ring if > 0), Reports Generated (FileText). Each has icon, trend indicator, sub-text
- **Quick Actions**: Horizontal scrollable bar with "Nuevo Proyecto" (gold), "Subir Foto", "Crear Reporte", "Marcar Urgencia" (destructive red)
- **Filter Bar**: Search input with clear button, Status dropdown, Priority dropdown, Manager dropdown, Date button (placeholder), Quick filter chips ("Fotos sin revisar", "Tareas vencidas", "Sin actualizaciones") with toggle active state
- **Projects Grid**: Responsive (1/2/3 cols), animated cards with gradient cover + decorative grid + building icon, status & priority badges, project name, client, address with icons, progress bar, stacked member avatars (color-coded initials), photo/task counts. Clicking navigates via store. Hover: lift + shadow
- **Activity Feed**: Right sidebar on desktop (sticky), below on mobile. 10 recent items with avatar, user action text in Spanish (e.g. "María subió 3 fotos a Condominio Vista Mar"), time ago, clickable project links, "Ver todo" link
- **Loading State**: Full skeleton dashboard matching the layout
- **Data Fetching**: useEffect on mount fetches GET /api/projects, GET /api/activity?limit=10, GET /api/tasks?status=PENDING — falls back to rich demo data

### 4. `/src/app/page.tsx` (updated)
- Simple view router using the Zustand store's `currentView`
- Renders LoginPage or DashboardPage based on state

## Theme Colors Used
- `bg-navy`, `text-navy-foreground` for login background
- `bg-gold`, `text-gold-foreground` for accent elements
- `bg-primary`, `text-primary-foreground` for dark blue primary
- `bg-success`, `bg-warning`, `bg-destructive` for status indicators
- All from the existing CSS custom properties (oklch color space)