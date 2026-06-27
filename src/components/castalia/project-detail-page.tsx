'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, MapPin, Calendar, Users, Image, CheckSquare, MessageSquare, FileText, Clock, Camera, Upload, ImageIcon, Sparkles } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAppStore, STATUS_CONFIG, PRIORITY_CONFIG } from '@/store/app-store'
import { useToast } from '@/hooks/use-toast'

function getInitials(n: string) { return n.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) }

interface ApiPhoto {
  id: string; url: string; thumbnailUrl?: string; caption?: string; tags?: string
  uploadedBy: { id: string; name: string; avatar?: string }
  isApproved: boolean; isVisibleToClient: boolean; isUrgent: boolean; createdAt: string
}
interface ApiTask {
  id: string; title: string; status: string; priority: string
  assignee?: { id: string; name: string } | null; dueDate?: string | null; createdAt: string
}
interface ApiActivity {
  id: string; action: string; user: { id: string; name: string }; details?: string; createdAt: string
}

export default function ProjectDetailPage() {
  const { selectedProjectId, goBack, currentUser, isManagerOrAdmin, openUploadModal } = useAppStore()
  const { toast } = useToast()

  const [project, setProject] = useState<any>(null)
  const [photos, setPhotos] = useState<ApiPhoto[]>([])
  const [tasks, setTasks] = useState<ApiTask[]>([])
  const [activity, setActivity] = useState<ApiActivity[]>([])
  const [activeTab, setActiveTab] = useState('gallery')
  const [tagFilter, setTagFilter] = useState('ALL')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!selectedProjectId) return
    setLoading(true)
    Promise.allSettled([
      fetch(`/api/projects/${selectedProjectId}`).then(r => r.json()),
      fetch(`/api/photos?projectId=${selectedProjectId}`).then(r => r.json()),
      fetch(`/api/tasks?projectId=${selectedProjectId}`).then(r => r.json()),
      fetch(`/api/activity?projectId=${selectedProjectId}&limit=20`).then(r => r.json()),
    ]).then(([pRes, phRes, tRes, aRes]) => {
      if (pRes.status === 'fulfilled' && pRes.value?.project?.id) setProject(pRes.value.project)
      if (phRes.status === 'fulfilled' && Array.isArray(phRes.value?.photos)) {
        setPhotos(phRes.value.photos.map((p: any) => ({ ...p, uploadedBy: p.uploader })))
      }
      if (tRes.status === 'fulfilled' && Array.isArray(tRes.value)) setTasks(tRes.value)
      if (aRes.status === 'fulfilled' && Array.isArray(aRes.value)) setActivity(aRes.value)
      setLoading(false)
    })
  }, [selectedProjectId])

  if (!selectedProjectId || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F7F8FA' }}>
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#38C5B5', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  const getTags = (p: ApiPhoto) => {
    try { return JSON.parse(p.tags || '[]') } catch { return (p.tags || '').split(',').filter(Boolean) }
  }
  const getPhase = (p: ApiPhoto) => { const t = getTags(p); return t.includes('antes') ? 'antes' : t.includes('despues') ? 'despues' : null }
  const getLocal = (p: ApiPhoto) => { const t = getTags(p); const loc = t.find(t => t.startsWith('local:')); return loc ? loc.replace('local:', '') : null }
  const LOCAL_LABELS: Record<string, string> = { sala:'Sala', comedor:'Comedor', cocina:'Cocina', dormitorio:'Dormitorio', bano:'Baño', lobby:'Lobby', oficina:'Oficina', terraza:'Terraza', jardin:'Jardín', escaleras:'Escaleras', closet:'Closet', fachada:'Fachada', estacionamiento:'Estacionamiento', area_servicio:'Área Servicio', sala_tv:'Sala TV', bar:'Bar', gimnasio:'Gimnasio', otro:'Otro' }

  const allLocales = [...new Set(photos.map(p => getLocal(p)).filter(Boolean))]
  const beforePhotos = photos.filter(p => getPhase(p) === 'antes')
  const afterPhotos = photos.filter(p => getPhase(p) === 'despues')

  const filteredPhotos = tagFilter === 'ALL'
    ? photos
    : tagFilter === 'antes'
    ? beforePhotos
    : tagFilter === 'despues'
    ? afterPhotos
    : photos.filter(p => getLocal(p) === tagFilter)

  const completedTasks = tasks.filter(t => t.status === 'COMPLETED').length
  const taskProgress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0

  return (
    <div className="min-h-screen" style={{ background: '#F7F8FA' }}>
      {/* Header */}
      <div className="sticky top-0 z-30 border-b"
        style={{ background: 'rgba(247,248,250,0.9)', backdropFilter: 'blur(16px)', borderColor: '#E2E6EB' }}>
        <div className="max-w-7xl mx-auto px-4 lg:px-8 h-[72px] flex items-center gap-4">
          <button onClick={goBack}
            className="p-2.5 rounded-xl hover:bg-black/5 transition-colors">
            <ArrowLeft className="w-5 h-5" style={{ color: '#35414A' }} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-[20px] lg:text-[24px] font-bold tracking-[-0.02em] truncate" style={{ color: '#1A2332' }}>
              {project?.name || 'Cargando...'}
            </h1>
            <p className="text-[14px] font-medium" style={{ color: '#38C5B5' }}>
              {project?.clientName || ''}
            </p>
          </div>
          {isManagerOrAdmin() && (
            <Button onClick={() => openUploadModal(selectedProjectId || '')} className="h-10 px-5 rounded-xl text-[13px] font-semibold text-white border-0 gap-2"
              style={{ background: 'linear-gradient(135deg, #38C5B5, #2DA194)' }}>
              <Camera className="w-4 h-4" strokeWidth={2.5} />
              <span className="hidden sm:inline">Subir Fotos</span>
            </Button>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6">
        {/* Project info card */}
        <Card className="border-0 shadow-sm mb-6" style={{ background: '#FFFFFF' }}>
          <CardContent className="p-6">
            <div className="flex flex-wrap items-start gap-6 mb-5">
              <div className="flex-1 min-w-[250px] space-y-3">
                <div className="flex items-center gap-2 text-[14px]" style={{ color: '#5D7380' }}>
                  <MapPin className="w-4 h-4 shrink-0" style={{ color: '#ADB5B7' }} />
                  {project?.address}{project?.city ? `, ${project.city}` : ''}
                </div>
                <div className="flex items-center gap-2 text-[14px]" style={{ color: '#5D7380' }}>
                  <Calendar className="w-4 h-4 shrink-0" style={{ color: '#ADB5B7' }} />
                  {project?.startDate ? `Inicio: ${new Date(project.startDate).toLocaleDateString('es-MX')}` : 'Sin fecha de inicio'}
                  {project?.estimatedEnd && ` — Entrega: ${new Date(project.estimatedEnd).toLocaleDateString('es-MX')}`}
                </div>
              </div>
              <div className="flex gap-2">
                {STATUS_CONFIG[project?.status] && (
                  <Badge className="text-[12px] font-semibold px-3 py-1 rounded-lg border"
                    style={{ ...parseBadge(STATUS_CONFIG[project.status].color) }}>
                    {STATUS_CONFIG[project.status].label}
                  </Badge>
                )}
                {PRIORITY_CONFIG[project?.priority] && (
                  <Badge className="text-[12px] font-semibold px-3 py-1 rounded-lg border"
                    style={{ ...parseBadge(PRIORITY_CONFIG[project.priority].color) }}>
                    {PRIORITY_CONFIG[project.priority].label}
                  </Badge>
                )}
              </div>
            </div>
            {project?.description && (
              <p className="text-[15px] leading-relaxed mb-5" style={{ color: '#5D7380' }}>{project.description}</p>
            )}
            {/* Progress */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] font-semibold" style={{ color: '#35414A' }}>Progreso General</span>
                <span className="text-[20px] font-bold" style={{ color: '#38C5B5' }}>{project?.progress ?? 0}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: '#EDF0F4' }}>
                <motion.div initial={{ width: 0 }} animate={{ width: `${project?.progress ?? 0}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="h-full rounded-full" style={{ background: 'linear-gradient(90deg, #38C5B5, #2DA194)' }} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 h-auto gap-1 p-1 rounded-xl bg-white border" style={{ borderColor: '#E2E6EB' }}>
            {[
              { id: 'gallery', label: 'Galería', icon: Image, count: photos.length },
              { id: 'summary', label: 'Resumen Cliente', icon: FileText },
              { id: 'tasks', label: 'Tareas', icon: CheckSquare, count: tasks.length },
              { id: 'timeline', label: 'Línea de Tiempo', icon: Clock },
              { id: 'chat', label: 'Chat', icon: MessageSquare },
            ].map(tab => (
              <TabsTrigger key={tab.id} value={tab.id}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-semibold data-[state=active]:text-white data-[state=active]:shadow-sm transition-all"
                style={{ color: '#5D7380' }}
                onClick={() => setActiveTab(tab.id)}>
                <tab.icon className="w-4 h-4" strokeWidth={2} />
                <span className="hidden sm:inline">{tab.label}</span>
                {tab.count !== undefined && (
                  <span className="text-[11px] px-1.5 py-0.5 rounded-md font-bold"
                    style={{ background: tab.id === activeTab ? 'rgba(255,255,255,0.2)' : '#EDF0F4', color: tab.id === activeTab ? 'white' : '#5D7380' }}>
                    {tab.count}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Gallery Tab */}
          <TabsContent value="gallery">
            {/* Fase filters: ANTES / DESPUÉS / LOCALES */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-1 hide-scrollbar">
              {[{id:'ALL',label:'Todas',color:'#38C5B5'},{id:'antes',label:'ANTES',color:'#F0A030'},{id:'despues',label:'DESPUÉS',color:'#2DA194'}].map(f => (
                <button key={f.id} onClick={() => setTagFilter(f.id)}
                  className="px-3.5 py-2 rounded-lg text-[12px] font-bold tracking-wide whitespace-nowrap border transition-all"
                  style={{
                    background: tagFilter === f.id ? f.color : 'white',
                    color: tagFilter === f.id ? 'white' : '#5D7380',
                    borderColor: tagFilter === f.id ? f.color : '#E2E6EB',
                  }}>
                  {f.label}
                </button>
              ))}
              {allLocales.map(loc => (
                <button key={loc} onClick={() => setTagFilter(loc)}
                  className="px-3.5 py-2 rounded-lg text-[12px] font-semibold whitespace-nowrap border transition-all"
                  style={{
                    background: tagFilter === loc ? '#35414A' : 'white',
                    color: tagFilter === loc ? 'white' : '#5D7380',
                    borderColor: tagFilter === loc ? '#35414A' : '#E2E6EB',
                  }}>
                  {LOCAL_LABELS[loc] || loc}
                </button>
              ))}
            </div>
            {/* Photo grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredPhotos.map((photo, i) => {
                const phase = getPhase(photo)
                const local = getLocal(photo)
                return (
                <motion.div key={photo.id}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="relative group rounded-xl overflow-hidden border cursor-pointer aspect-[4/3]"
                  style={{ borderColor: '#E8EBF0' }}>
                  <img src={photo.thumbnailUrl || photo.url} alt={photo.caption || ''} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  {/* Phase badge - siempre visible */}
                  <div className="absolute top-2 left-2 flex flex-col gap-1">
                    {phase && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold text-white"
                        style={{ background: phase === 'antes' ? '#F0A030' : '#2DA194' }}>
                        {phase === 'antes' ? 'ANTES' : 'DESPUÉS'}
                      </span>
                    )}
                    {local && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold text-white"
                        style={{ background: 'rgba(26,35,50,0.7)', backdropFilter: 'blur(4px)' }}>
                        {LOCAL_LABELS[local] || local}
                      </span>
                    )}
                  </div>
                  {photo.isUrgent && (
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md text-[10px] font-bold text-white bg-red-500">URGENTE</div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 p-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-[11px] text-white font-medium truncate">{photo.caption}</p>
                    <p className="text-[10px] text-white/60">{photo.uploadedBy?.name}</p>
                  </div>
                </motion.div>
                )
              })}
            </div>
            {filteredPhotos.length === 0 && (
              <div className="text-center py-16">
                <Camera className="w-10 h-10 mx-auto mb-3" style={{ color: '#ADB5B7' }} />
                <p className="text-[15px] font-semibold" style={{ color: '#35414A' }}>Sin fotos</p>
              </div>
            )}
          </TabsContent>

          {/* Summary Tab - Client Presentation */}
          <TabsContent value="summary">
            <Card className="border-0 shadow-sm" style={{ background: '#FFFFFF' }}>
              <CardContent className="p-6 lg:p-8">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #38C5B5, #2DA194)' }}>
                    <FileText className="w-5 h-5 text-white" strokeWidth={1.8} />
                  </div>
                  <div>
                    <h3 className="text-[20px] font-bold" style={{ color: '#1A2332' }}>Resumen para Cliente</h3>
                    <p className="text-[13px]" style={{ color: '#5D7380' }}>{project?.clientName} — {project?.name}</p>
                  </div>
                </div>
                <div className="h-px my-5" style={{ background: '#E2E6EB' }} />
                {/* Progress summary */}
                <div className="mb-8">
                  <h4 className="text-[16px] font-bold mb-3" style={{ color: '#1A2332' }}>Avance del Proyecto</h4>
                  <div className="flex items-center gap-4 mb-3">
                    <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: '#EDF0F4' }}>
                      <div className="h-full rounded-full" style={{ width: `${project?.progress ?? 0}%`, background: 'linear-gradient(90deg, #38C5B5, #2DA194)' }} />
                    </div>
                    <span className="text-[22px] font-bold" style={{ color: '#38C5B5' }}>{project?.progress ?? 0}%</span>
                  </div>
                  <p className="text-[14px] leading-relaxed" style={{ color: '#5D7380' }}>
                    {project?.description || 'Proyecto en curso. Se documentan avances periódicamente con fotografías y reportes detallados de cada etapa del trabajo.'}
                  </p>
                </div>
                {/* Before / After comparison */}
                {beforePhotos.length > 0 && afterPhotos.length > 0 && (
                  <div className="mb-8">
                    <h4 className="text-[16px] font-bold mb-4" style={{ color: '#1A2332' }}>Antes / Después</h4>
                    {/* Group by local */}
                    {[...new Set([...beforePhotos, ...afterPhotos].map(p => getLocal(p)).filter(Boolean))].map(loc => {
                      const locBefore = beforePhotos.filter(p => getLocal(p) === loc)
                      const locAfter = afterPhotos.filter(p => getLocal(p) === loc)
                      if (locBefore.length === 0 && locAfter.length === 0) return null
                      return (
                        <div key={loc} className="mb-6">
                          <p className="text-[14px] font-bold mb-3" style={{ color: '#35414A' }}>{LOCAL_LABELS[loc] || loc}</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: '#F0A030' }}>ANTES</p>
                              <div className="space-y-3">
                                {locBefore.slice(0, 4).map(p => (
                                  <div key={p.id} className="rounded-xl overflow-hidden border aspect-video" style={{ borderColor: '#E2E6EB' }}>
                                    <img src={p.url} alt={p.caption || ''} className="w-full h-full object-cover" loading="lazy" />
                                  </div>
                                ))}
                                {locBefore.length === 0 && <p className="text-[13px] py-4" style={{ color: '#ADB5B7' }}>Sin foto "antes"</p>}
                              </div>
                            </div>
                            <div>
                              <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: '#2DA194' }}>DESPUÉS</p>
                              <div className="space-y-3">
                                {locAfter.slice(0, 4).map(p => (
                                  <div key={p.id} className="rounded-xl overflow-hidden border aspect-video" style={{ borderColor: '#E2E6EB' }}>
                                    <img src={p.url} alt={p.caption || ''} className="w-full h-full object-cover" loading="lazy" />
                                  </div>
                                ))}
                                {locAfter.length === 0 && <p className="text-[13px] py-4" style={{ color: '#ADB5B7' }}>Sin foto "después"</p>}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
                {/* Approved photos gallery */}
                <div>
                  <h4 className="text-[16px] font-bold mb-4" style={{ color: '#1A2332' }}>Galería Aprobada</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {photos.filter(p => p.isVisibleToClient && p.isApproved).map(p => (
                      <div key={p.id} className="rounded-xl overflow-hidden border aspect-[4/3]" style={{ borderColor: '#E8EBF0' }}>
                        <img src={p.thumbnailUrl || p.url} alt={p.caption || ''} className="w-full h-full object-cover" loading="lazy" />
                      </div>
                    ))}
                  </div>
                  {photos.filter(p => p.isVisibleToClient).length === 0 && (
                    <p className="text-[14px] text-center py-8" style={{ color: '#ADB5B7' }}>No hay fotos aprobadas para el cliente aún.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tasks Tab */}
          <TabsContent value="tasks">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
              {(['PENDING', 'IN_PROGRESS', 'COMPLETED'] as const).map(status => {
                const count = tasks.filter(t => t.status === status).length
                const cfg = STATUS_CONFIG[status]
                return (
                  <Card key={status} className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow" style={{ background: '#FFFFFF' }}>
                    <CardContent className="p-4">
                      <p className="text-[12px] font-semibold mb-1" style={{ color: '#5D7380' }}>{cfg?.label || status}</p>
                      <p className="text-[28px] font-bold" style={{ color: '#1A2332' }}>{count}</p>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
            <div className="space-y-2">
              {tasks.map(task => (
                <Card key={task.id} className="border-0 shadow-sm" style={{ background: '#FFFFFF' }}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: task.status === 'COMPLETED' ? '#2DA194' : task.status === 'IN_PROGRESS' ? '#F0A030' : '#ADB5B7' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold truncate" style={{ color: '#1A2332' }}>{task.title}</p>
                      <p className="text-[12px]" style={{ color: '#5D7380' }}>
                        {task.assignee?.name || 'Sin asignar'}
                        {task.dueDate && ` — ${new Date(task.dueDate).toLocaleDateString('es-MX')}`}
                      </p>
                    </div>
                    {PRIORITY_CONFIG[task.priority] && (
                      <Badge className="text-[11px] font-semibold px-2 py-0.5 rounded-md border shrink-0"
                        style={{ ...parseBadge(PRIORITY_CONFIG[task.priority].color) }}>
                        {PRIORITY_CONFIG[task.priority].label}
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
              {tasks.length === 0 && (
                <p className="text-[14px] text-center py-12" style={{ color: '#ADB5B7' }}>Sin tareas en este proyecto</p>
              )}
            </div>
          </TabsContent>

          {/* Timeline Tab */}
          <TabsContent value="timeline">
            <div className="relative pl-6">
              <div className="absolute left-[7px] top-2 bottom-2 w-px" style={{ background: '#E2E6EB' }} />
              <div className="space-y-6">
                {activity.map((act, i) => (
                  <div key={act.id} className="relative flex gap-4">
                    <div className="absolute left-[-20px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white z-10"
                      style={{ background: '#38C5B5' }} />
                    <Card className="flex-1 border-0 shadow-sm" style={{ background: '#FFFFFF' }}>
                      <CardContent className="p-3.5">
                        <p className="text-[13px]" style={{ color: '#35414A' }}>
                          <span className="font-bold">{act.user?.name}</span>{' '}
                          <span style={{ color: '#5D7380' }}>{act.details || act.action}</span>
                        </p>
                        <p className="text-[11px] mt-1" style={{ color: '#ADB5B7' }}>{new Date(act.createdAt).toLocaleString('es-MX')}</p>
                      </CardContent>
                    </Card>
                  </div>
                ))}
                {activity.length === 0 && (
                  <p className="text-[14px] py-12 text-center" style={{ color: '#ADB5B7' }}>Sin actividad registrada</p>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Chat Tab */}
          <TabsContent value="chat">
            <Card className="border-0 shadow-sm" style={{ background: '#FFFFFF' }}>
              <CardContent className="p-0 flex flex-col" style={{ height: '500px' }}>
                <div className="flex-1 p-4 space-y-3 overflow-y-auto">
                  <p className="text-[14px] text-center py-8" style={{ color: '#ADB5B7' }}>
                    El chat en tiempo real estará disponible próximamente.
                    Usa la sección de notas para comunicaciones internas.
                  </p>
                </div>
                <div className="p-3 border-t flex gap-2" style={{ borderColor: '#E2E6EB' }}>
                  <input type="text" placeholder="Escribe un mensaje..."
                    className="flex-1 h-10 px-4 rounded-xl text-[14px] border outline-none focus:border-[#38C5B5]/40"
                    style={{ borderColor: '#E2E6EB', color: '#1A2332' }} />
                  <button className="h-10 px-5 rounded-xl text-[13px] font-semibold text-white"
                    style={{ background: 'linear-gradient(135deg, #38C5B5, #2DA194)' }}>
                    Enviar
                  </button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Bottom padding for mobile nav */}
      <div className="h-20 lg:h-0" />
    </div>
  )
}

function parseBadge(cls: string) {
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