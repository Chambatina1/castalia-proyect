'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Building2, Camera, CheckSquare, FileText, Plus, Upload, AlertTriangle, Search, Bell, LogOut, MapPin, Image, Clock, ArrowUpRight, X, LayoutDashboard, MessageSquare, FileBarChart, Users, Settings, ChevronRight, Menu, TrendingUp, FolderKanban, Trash2,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useAppStore, STATUS_CONFIG, PRIORITY_CONFIG, ROLE_LABELS } from '@/store/app-store'
import { useToast } from '@/hooks/use-toast'
import CreateProjectModal from '@/components/castalia/create-project-modal'

// ─── Types ─────────────────────────────────────────────
interface ApiProject {
  id: string; name: string; clientName: string; address: string; city?: string
  status: string; priority: string; progress: number; coverImage?: string
  _count: { members: number; photos: number; tasks: number; reports: number }
  members: { userId: string; user: { id: string; name: string; avatar?: string } }[]
  updatedAt: string; createdAt: string
}

interface Activity { id: string; userName: string; action: string; projectName?: string; projectId?: string; createdAt: string }

// ─── Helpers ───────────────────────────────────────────
const AVATAR_COLORS = ['#38C5B5', '#5D7380', '#F0A030', '#E12E2E', '#8B5CF6']
function getInitials(n: string) { return n.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) }
function timeAgo(dateStr: string) {
  const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (s < 60) return 'ahora mismo'
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`
  if (s < 86400) return `hace ${Math.floor(s / 3600)}h`
  return `hace ${Math.floor(s / 86400)}d`
}
function getAvatarStyle(i: number) { return { background: `linear-gradient(135deg, ${AVATAR_COLORS[i % AVATAR_COLORS.length]}, ${AVATAR_COLORS[(i + 2) % AVATAR_COLORS.length]})` } }

// ─── Component ─────────────────────────────────────────
export default function DashboardPage() {
  const { currentUser, navigateTo, logout, mobileMenuOpen, setMobileMenuOpen, isManagerOrAdmin, selectProject } = useAppStore()
  const { toast } = useToast()

  const [projects, setProjects] = useState<ApiProject[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [priorityFilter, setPriorityFilter] = useState('ALL')
  const [searchOpen, setSearchOpen] = useState(false)
  const [showCreateProject, setShowCreateProject] = useState(false)
  const [expandedStat, setExpandedStat] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ApiProject | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const [projRes, actRes] = await Promise.allSettled([
        fetch('/api/projects').then(r => r.json()),
        fetch('/api/activity?limit=10').then(r => r.json()),
      ])
      if (projRes.status === 'fulfilled' && Array.isArray(projRes.value)) setProjects(projRes.value)
      if (actRes.status === 'fulfilled' && Array.isArray(actRes.value)) {
        setActivities(actRes.value.map((a: any) => ({
          id: a.id, userName: a.user?.name || 'Usuario', action: a.action,
          projectName: a.project?.name, projectId: a.project?.id, createdAt: a.createdAt,
        })))
      }
    } catch {}
    setLoading(false)
  }, [])

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/projects/${deleteTarget.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
 toast({ title: 'Proyecto eliminado', description: deleteTarget.name })
      setProjects(prev => prev.filter(p => p.id !== deleteTarget.id))
    } catch {
      toast({ title: 'Error', description: 'No se pudo eliminar', variant: 'destructive' })
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  useEffect(() => {
    if (currentUser) loadData()
  }, [currentUser, loadData])

  const filteredProjects = useMemo(() => {
    let result = projects
    if (statusFilter !== 'ALL') result = result.filter(p => p.status === statusFilter)
    if (priorityFilter !== 'ALL') result = result.filter(p => p.priority === priorityFilter)
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(p => p.name.toLowerCase().includes(q) || p.clientName.toLowerCase().includes(q) || p.address.toLowerCase().includes(q))
    }
    return result
  }, [projects, statusFilter, priorityFilter, search])

  const stats = useMemo(() => {
    const active = projects.filter(p => p.status === 'ACTIVE').length
    const totalPhotos = projects.reduce((s, p) => s + p._count.photos, 0)
    const pendingTasks = projects.reduce((s, p) => s + p._count.tasks, 0) // simplified
    const totalReports = projects.reduce((s, p) => s + p._count.reports, 0)
    return { active, totalPhotos, pendingTasks, totalReports }
  }, [projects])

  const NAV_ITEMS = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'projects' as const, label: 'Proyectos', icon: FolderKanban },
    { id: 'tasks' as const, label: 'Tareas', icon: CheckSquare },
    { id: 'chat' as const, label: 'Chat', icon: MessageSquare },
    ...(isManagerOrAdmin() ? [{ id: 'reports' as const, label: 'Reportes', icon: FileBarChart }] : []),
    ...(isManagerOrAdmin() ? [{ id: 'clients' as const, label: 'Clientes', icon: Users }] : []),
    ...(isManagerOrAdmin() ? [{ id: 'settings' as const, label: 'Ajustes', icon: Settings }] : []),
  ]

  return (
    <div className="min-h-screen flex" style={{ background: '#F7F8FA' }}>
      {/* ─── SIDEBAR (desktop) ─── */}
      <aside className="hidden lg:flex flex-col w-[260px] shrink-0 fixed inset-y-0 left-0 z-40"
        style={{ background: '#0D1117' }}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 h-[72px] shrink-0">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #38C5B5, #2DA194)' }}>
            <Building2 className="w-5 h-5 text-white" strokeWidth={1.8} />
          </div>
          <div>
            <h1 className="text-[15px] font-bold text-white tracking-[-0.01em]">CASTALIA</h1>
            <p className="text-[9px] font-bold tracking-[0.3em] uppercase" style={{ color: '#38C5B5' }}>PROYECT</p>
          </div>
        </div>

        <ScrollArea className="flex-1 px-3 py-2">
          <nav className="space-y-0.5">
            {NAV_ITEMS.map((item) => (
              <button key={item.id} onClick={() => navigateTo(item.id)}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[14px] font-medium transition-all duration-150 group"
                style={{
                  background: item.id === 'dashboard' ? 'rgba(56,197,181,0.1)' : 'transparent',
                  color: item.id === 'dashboard' ? '#38C5B5' : '#6B7B8D',
                }}>
                <item.icon className="w-[19px] h-[19px]" strokeWidth={1.8} />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </ScrollArea>

        {/* User */}
        <div className="px-4 py-4 shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="flex items-center gap-3">
            <Avatar className="w-9 h-9">
              <AvatarFallback className="text-[12px] font-bold text-white" style={getAvatarStyle(0)}>
                {currentUser ? getInitials(currentUser.name) : '?'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-white truncate">{currentUser?.name}</p>
              <p className="text-[11px]" style={{ color: '#38C5B5' }}>
                {currentUser?.role ? ROLE_LABELS[currentUser.role] || currentUser.role : ''}
              </p>
            </div>
            <button onClick={logout} className="p-1.5 rounded-lg transition-colors hover:bg-white/5"
              style={{ color: '#4A5568' }}>
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ─── MAIN ─── */}
      <main className="flex-1 lg:ml-[260px] flex flex-col min-h-screen">
        {/* Top header */}
        <header className="sticky top-0 z-30 h-[72px] flex items-center gap-4 px-4 lg:px-8 shrink-0 border-b"
          style={{
            background: 'rgba(247,248,250,0.85)',
            backdropFilter: 'blur(16px)',
            borderColor: '#E2E6EB',
          }}>
          {/* Mobile menu */}
          <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden p-2 rounded-xl hover:bg-black/5">
            <Menu className="w-5 h-5" style={{ color: '#35414A' }} />
          </button>

          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#ADB5B7' }} />
            <Input
              placeholder="Buscar proyectos, clientes..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-11 pl-10 rounded-xl text-[14px] border-[#E2E6EB] bg-white focus-visible:border-[#38C5B5]/40 focus-visible:ring-[#38C5B5]/10"
            />
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {isManagerOrAdmin() && (
              <Button onClick={() => setShowCreateProject(true)}
                className="hidden sm:flex h-10 px-5 rounded-xl text-[13px] font-semibold text-white border-0 gap-2"
                style={{ background: 'linear-gradient(135deg, #38C5B5, #2DA194)', boxShadow: '0 1px 8px rgba(56,197,181,0.2)' }}>
                <Plus className="w-4 h-4" strokeWidth={2.5} />
                Nuevo Proyecto
              </Button>
            )}
            {/* Notifications */}
            <button className="relative p-2.5 rounded-xl hover:bg-black/5 transition-colors">
              <Bell className="w-5 h-5" style={{ color: '#35414A' }} />
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full border-2 border-white"
                style={{ background: '#E12E2E' }} />
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 p-4 lg:p-8">
          {/* Welcome */}
          <div className="mb-8">
            <h2 className="text-[28px] lg:text-[32px] font-bold tracking-[-0.025em]" style={{ color: '#1A2332' }}>
              Hola, {currentUser?.name?.split(' ')[0]}
            </h2>
            <p className="text-[16px] mt-1.5" style={{ color: '#5D7380' }}>
              Aquí tienes el resumen de tus proyectos activos.
            </p>
          </div>

          {/* Stats - expandibles */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-8">
            {[
              { key: 'active', label: 'Proyectos Activos', value: stats.active, icon: Building2, color: '#38C5B5', bg: 'rgba(56,197,181,0.08)' },
              { key: 'photos', label: 'Fotos Totales', value: stats.totalPhotos, icon: Camera, color: '#2DA194', bg: 'rgba(45,161,148,0.08)' },
              { key: 'tasks', label: 'Tareas Pendientes', value: stats.pendingTasks, icon: CheckSquare, color: '#F0A030', bg: 'rgba(240,160,48,0.08)' },
              { key: 'reports', label: 'Reportes', value: stats.totalReports, icon: FileText, color: '#5D7380', bg: 'rgba(93,115,128,0.08)' },
            ].map((stat) => (
              <Card key={stat.key} onClick={() => setExpandedStat(expandedStat === stat.key ? null : stat.key)}
                className="border-0 shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer"
                style={{ background: '#FFFFFF' }}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: stat.bg }}>
                      <stat.icon className="w-5 h-5" style={{ color: stat.color }} strokeWidth={1.8} />
                    </div>
                    <span className="text-[11px] font-medium" style={{ color: '#ADB5B7' }}>
                      {expandedStat === stat.key ? '▲' : '▼'}
                    </span>
                  </div>
                  <p className="text-[28px] lg:text-[32px] font-bold tracking-tight" style={{ color: '#1A2332' }}>{stat.value}</p>
                  <p className="text-[13px] font-medium mt-0.5" style={{ color: '#5D7380' }}>{stat.label}</p>
                  <AnimatePresence>
                    {expandedStat === stat.key && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="pt-3 mt-3 border-t" style={{ borderColor: '#EDF0F4' }}>
                          {stat.key === 'active' && (
                            <div className="space-y-2">
                              {projects.filter(p => p.status === 'ACTIVE').slice(0, 5).map(p => (
                                <div key={p.id} onClick={(e) => { e.stopPropagation(); navigateTo('project-detail', p.id); selectProject(p as any); }} className="flex items-center gap-2 p-2 rounded-lg hover:bg-black/5 cursor-pointer">
                                  <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0"><img src={p.coverImage || ''} alt="" className="w-full h-full object-cover" /></div>
                                  <p className="text-[12px] font-medium truncate" style={{ color: '#35414A' }}>{p.name}</p>
                                </div>
                              ))}
                            </div>
                          )}
                          {stat.key === 'photos' && (
                            <div className="space-y-2">
                              {projects.filter(p => p._count.photos > 0).sort((a,b) => b._count.photos - a._count.photos).slice(0, 5).map(p => (
                                <div key={p.id} onClick={(e) => { e.stopPropagation(); navigateTo('project-detail', p.id); selectProject(p as any); }} className="flex items-center justify-between p-2 rounded-lg hover:bg-black/5 cursor-pointer">
                                  <p className="text-[12px] font-medium truncate" style={{ color: '#35414A' }}>{p.name}</p>
                                  <span className="text-[11px] font-bold" style={{ color: stat.color }}>{p._count.photos}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {stat.key === 'tasks' && (
                            <p className="text-[12px]" style={{ color: '#5D7380' }}>Toca un proyecto para ver sus tareas</p>
                          )}
                          {stat.key === 'reports' && (
                            <p className="text-[12px]" style={{ color: '#5D7380' }}>No hay reportes generados aún</p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Quick actions */}
          {isManagerOrAdmin() && (
            <div className="flex gap-2.5 mb-8 overflow-x-auto pb-1 hide-scrollbar">
              {[
                { label: 'Subir Foto', icon: Upload, color: '#38C5B5' },
                { label: 'Crear Reporte', icon: FileBarChart, color: '#2DA194' },
                { label: 'Marcar Urgencia', icon: AlertTriangle, color: '#E12E2E' },
              ].map((action) => (
                <button key={action.label} onClick={() => toast({ title: action.label, description: 'Función disponible pronto' })}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold whitespace-nowrap border transition-all duration-200 hover:shadow-sm"
                  style={{ borderColor: '#E2E6EB', color: action.color, background: '#FFFFFF' }}>
                  <action.icon className="w-4 h-4" strokeWidth={2} />
                  {action.label}
                </button>
              ))}
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px] h-10 rounded-xl text-[13px] font-medium border-[#E2E6EB] bg-white">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos los estados</SelectItem>
                <SelectItem value="ACTIVE">Activo</SelectItem>
                <SelectItem value="PAUSED">Pausado</SelectItem>
                <SelectItem value="COMPLETED">Completado</SelectItem>
                <SelectItem value="ARCHIVED">Archivado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[160px] h-10 rounded-xl text-[13px] font-medium border-[#E2E6EB] bg-white">
                <SelectValue placeholder="Prioridad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas</SelectItem>
                <SelectItem value="LOW">Baja</SelectItem>
                <SelectItem value="MEDIUM">Media</SelectItem>
                <SelectItem value="HIGH">Alta</SelectItem>
                <SelectItem value="URGENT">Urgente</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-[13px] font-medium ml-auto" style={{ color: '#5D7380' }}>
              {filteredProjects.length} proyecto{filteredProjects.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Projects Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
            <AnimatePresence mode="popLayout">
              {filteredProjects.map((project, i) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.25, delay: i * 0.04 }}
                >
                  <div className="relative rounded-2xl overflow-hidden border bg-white hover:shadow-lg transition-all duration-300 group"
                    style={{ borderColor: '#E8EBF0' }}>
                    <div className="cursor-pointer" onClick={() => navigateTo('project-detail', project.id)}>
                    {/* Cover */}
                    <div className="relative h-[160px] overflow-hidden"
                      style={{ background: project.coverImage ? undefined : `linear-gradient(135deg, #1A2332 0%, #2DA194 100%)` }}>
                      {project.coverImage && (
                        <img src={project.coverImage} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                      {/* Project name overlay on cover */}
                      <div className="absolute bottom-3 left-3 right-12">
                        <h3 className="text-[15px] font-bold text-white leading-tight drop-shadow-lg line-clamp-2">{project.name}</h3>
                      </div>
                      <div className="absolute top-3 left-3 flex gap-1.5">
                        {STATUS_CONFIG[project.status] && (
                          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg border backdrop-blur-sm"
                            style={{ ...parseBadge(STATUS_CONFIG[project.status].color) }}>
                            {STATUS_CONFIG[project.status].label}
                          </span>
                        )}
                        {PRIORITY_CONFIG[project.priority] && (
                          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg border backdrop-blur-sm"
                            style={{ ...parseBadge(PRIORITY_CONFIG[project.priority].color) }}>
                            {PRIORITY_CONFIG[project.priority].label}
                          </span>
                        )}
                      </div>
                      {/* Delete button - top right of cover */}
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(project) }}
                        className="absolute top-3 right-3 h-8 w-8 rounded-lg flex items-center justify-center sm:opacity-0 sm:group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-sm hover:!bg-red-500/80">
                        <Trash2 className="w-3.5 h-3.5 text-white" />
                      </button>
                      <div className="absolute bottom-3 right-3">
                        <span className="text-[12px] font-medium px-2 py-1 rounded-md bg-black/40 text-white backdrop-blur-sm">
                          {project.progress}%
                        </span>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="px-4 pb-4 pt-1">
                      <p className="text-[13px] font-medium mb-1" style={{ color: '#38C5B5' }}>{project.clientName}</p>
                      <div className="flex items-center gap-1.5 mb-3">
                        <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: '#ADB5B7' }} />
                        <span className="text-[12px] truncate" style={{ color: '#5D7380' }}>
                          {project.address}{project.city ? `, ${project.city}` : ''}
                        </span>
                      </div>

                      {/* Progress */}
                      <div className="mb-3">
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#EDF0F4' }}>
                          <div className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${project.progress}%`, background: 'linear-gradient(90deg, #38C5B5, #2DA194)' }} />
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center -space-x-2">
                          {project.members.slice(0, 3).map((m, mi) => (
                            <Avatar key={m.userId} className="w-7 h-7 border-2 border-white">
                              <AvatarFallback className="text-[10px] font-bold text-white" style={getAvatarStyle(mi)}>
                                {getInitials(m.user.name)}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                          {project.members.length > 3 && (
                            <div className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold"
                              style={{ background: '#EDF0F4', color: '#5D7380' }}>
                              +{project.members.length - 3}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1 text-[12px] font-medium" style={{ color: '#5D7380' }}>
                            <Camera className="w-3.5 h-3.5" /> {project._count.photos}
                          </span>
                          <span className="flex items-center gap-1 text-[12px] font-medium" style={{ color: '#5D7380' }}>
                            <CheckSquare className="w-3.5 h-3.5" /> {project._count.tasks}
                          </span>
                        </div>
                      </div>
                    </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Empty state */}
          {!loading && filteredProjects.length === 0 && (
            <div className="text-center py-16">
              <FolderKanban className="w-12 h-12 mx-auto mb-4" style={{ color: '#ADB5B7' }} />
              <p className="text-[16px] font-semibold" style={{ color: '#35414A' }}>Sin proyectos encontrados</p>
              <p className="text-[14px] mt-1" style={{ color: '#5D7380' }}>Ajusta los filtros o crea un nuevo proyecto</p>
              {isManagerOrAdmin() && (
                <button
                  onClick={() => setShowCreateProject(true)}
                  className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white"
                  style={{ background: 'linear-gradient(135deg, #38C5B5, #2DA194)' }}>
                  <Plus className="w-4 h-4" strokeWidth={2.5} />
                  Crear Proyecto
                </button>
              )}
            </div>
          )}

          {/* Activity Feed */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-8">
            <div className="lg:col-span-2" />
            <div className="lg:col-span-1">
              <Card className="border-0 shadow-sm" style={{ background: '#FFFFFF' }}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[16px] font-bold" style={{ color: '#1A2332' }}>Actividad Reciente</h3>
                    <button className="text-[12px] font-semibold" style={{ color: '#38C5B5' }}>Ver todo</button>
                  </div>
                  <ScrollArea className="max-h-[360px]">
                    <div className="space-y-4">
                      {activities.length > 0 ? activities.map((act) => (
                        <div key={act.id} className="flex gap-3 group cursor-pointer">
                          <Avatar className="w-8 h-8 shrink-0 mt-0.5">
                            <AvatarFallback className="text-[10px] font-bold text-white" style={getAvatarStyle(act.id.length % 5)}>
                              {getInitials(act.userName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] leading-snug" style={{ color: '#35414A' }}>
                              <span className="font-semibold">{act.userName}</span>{' '}
                              <span style={{ color: '#5D7380' }}>
                                {actionLabel(act.action)}
                                {act.projectName && (
                                  <button onClick={() => act.projectId && navigateTo('project-detail', act.projectId)}
                                    className="font-semibold hover:underline ml-0.5" style={{ color: '#38C5B5' }}>
                                    {act.projectName}
                                  </button>
                                )}
                              </span>
                            </p>
                            <p className="text-[11px] mt-0.5" style={{ color: '#ADB5B7' }}>{timeAgo(act.createdAt)}</p>
                          </div>
                        </div>
                      )) : (
                        <p className="text-[13px] text-center py-6" style={{ color: '#ADB5B7' }}>Sin actividad reciente</p>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      {/* ─── Mobile Bottom Nav ─── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 h-[64px] flex items-center justify-around border-t"
        style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(16px)', borderColor: '#E2E6EB' }}>
        {[
          { id: 'dashboard' as const, label: 'Inicio', icon: LayoutDashboard },
          { id: 'projects' as const, label: 'Proyectos', icon: FolderKanban },
          { id: 'tasks' as const, label: 'Tareas', icon: CheckSquare },
          { id: 'chat' as const, label: 'Chat', icon: MessageSquare },
        ].map((item) => (
          <button key={item.id} onClick={() => navigateTo(item.id)}
            className="flex flex-col items-center gap-0.5 px-3 py-1"
            style={{ color: item.id === 'dashboard' ? '#38C5B5' : '#ADB5B7' }}>
            <item.icon className="w-5 h-5" strokeWidth={item.id === 'dashboard' ? 2.2 : 1.8} />
            <span className="text-[10px] font-semibold">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* ─── Mobile Sidebar Sheet ─── */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-[280px] p-0" style={{ background: '#0D1117' }}>
          <SheetHeader className="p-6 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <SheetTitle className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #38C5B5, #2DA194)' }}>
                <Building2 className="w-5 h-5 text-white" strokeWidth={1.8} />
              </div>
              <div>
                <p className="text-[15px] font-bold text-white tracking-[-0.01em]">CASTALIA</p>
                <p className="text-[9px] font-bold tracking-[0.3em] uppercase" style={{ color: '#38C5B5' }}>PROYECT</p>
              </div>
            </SheetTitle>
          </SheetHeader>
          <ScrollArea className="flex-1 px-3 py-3">
            <nav className="space-y-0.5">
              {NAV_ITEMS.map((item) => (
                <button key={item.id} onClick={() => { navigateTo(item.id); setMobileMenuOpen(false) }}
                  className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-[14px] font-medium transition-all"
                  style={{ color: item.id === 'dashboard' ? '#38C5B5' : '#6B7B8D' }}>
                  <item.icon className="w-[19px] h-[19px]" strokeWidth={1.8} />
                  {item.label}
                </button>
              ))}
            </nav>
          </ScrollArea>
          <div className="p-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <button onClick={() => { logout(); setMobileMenuOpen(false) }}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[14px] font-medium"
              style={{ color: '#E12E2E' }}>
              <LogOut className="w-[19px] h-[19px]" strokeWidth={1.8} />
              Cerrar sesión
            </button>
          </div>
        </SheetContent>
      </Sheet>

      <CreateProjectModal open={showCreateProject} onClose={() => setShowCreateProject(false)} onCreated={() => loadData()} />

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDeleteTarget(null)} />
          <div className="relative w-[340px] bg-white rounded-2xl overflow-hidden shadow-xl">
            <div className="p-6 text-center">
              <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: '#FEE2E2' }}>
                <Trash2 className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-[17px] font-bold mb-1.5" style={{ color: '#1A2332' }}>Eliminar proyecto</h3>
              <p className="text-[14px] leading-relaxed" style={{ color: '#5D7380' }}>
                Vas a eliminar <span className="font-semibold" style={{ color: '#1A2332' }}>{deleteTarget.name}</span> y toda su información (fotos, tareas, reportes). Esta acción no se puede deshacer.
              </p>
            </div>
            <div className="flex border-t" style={{ borderColor: '#E8EBF0' }}>
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="flex-1 h-12 text-[14px] font-semibold border-r"
                style={{ color: '#5D7380', borderColor: '#E8EBF0' }}>
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 h-12 text-[14px] font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: '#DC2626' }}>
                {deleting ? (
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile FAB */}
      {isManagerOrAdmin() && (
        <button
          onClick={() => setShowCreateProject(true)}
          className="sm:hidden fixed bottom-20 right-4 z-30 h-14 w-14 rounded-full flex items-center justify-center shadow-lg"
          style={{ background: 'linear-gradient(135deg, #38C5B5, #2DA194)', boxShadow: '0 4px 20px rgba(56,197,181,0.4)' }}
        >
          <Plus className="h-6 w-6 text-white" strokeWidth={2.5} />
        </button>
      )}
    </div>
  )
}

// ─── Utilities ─────────────────────────────────────────
function parseBadge(cls: string) {
  // Parse "bg-[#38C5B5]/15 text-[#2DA194] border-[#38C5B5]/25" into styles
  const bgMatch = cls.match(/bg-(.+?)(?:\s|$)/)
  const textMatch = cls.match(/text-(.+?)(?:\s|$)/)
  const borderMatch = cls.match(/border-(.+?)(?:\s|$)/)
  return {
    background: bgMatch?.[1]?.startsWith('[#') ? hexToRgba(bgMatch[1].slice(1, -1), 0.12) : undefined,
    color: textMatch?.[1]?.startsWith('[#') ? textMatch[1].slice(1, -1) : undefined,
    borderColor: borderMatch?.[1]?.startsWith('[#') ? hexToRgba(borderMatch[1].slice(1, -1), 0.25) : undefined,
  }
}
function hexToRgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}
function actionLabel(action: string) {
  const labels: Record<string, string> = {
    UPLOADED: 'subió fotos a', STATUS_CHANGED: 'actualizó', COMMENTED: 'comentó en',
    COMPLETED: 'completó', CREATED: 'creó', UPDATED: 'actualizó',
  }
  return labels[action] || action.toLowerCase()
}