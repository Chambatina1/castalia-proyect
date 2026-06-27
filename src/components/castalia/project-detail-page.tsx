'use client'

import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, MapPin, Calendar, Image, CheckSquare, MessageSquare, FileText, Clock, Camera, X, ChevronLeft, ChevronRight, Pencil, Trash2, Eraser } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAppStore, STATUS_CONFIG, PRIORITY_CONFIG } from '@/store/app-store'
import { useToast } from '@/hooks/use-toast'

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

  // Fullscreen lightbox
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)
  const [showInfo, setShowInfo] = useState(false)

  // Draw on lightbox
  const [drawMode, setDrawMode] = useState(false)
  const [drawColor, setDrawColor] = useState('#ef4444')
  const [isDrawing, setIsDrawing] = useState(false)
  const drawCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const lastDrawPos = useRef<{ x: number; y: number } | null>(null)
  const drawImgLoaded = useRef(false)

  const getTags = (p: ApiPhoto) => {
    try { return JSON.parse(p.tags || '[]') } catch { return (p.tags || '').split(',').filter(Boolean) }
  }
  const getPhase = (p: ApiPhoto) => { const t = getTags(p); return t.includes('antes') ? 'antes' : t.includes('despues') ? 'despues' : null }
  const getLocal = (p: ApiPhoto) => { const t = getTags(p); const loc = t.find(t => t.startsWith('local:')); return loc ? loc.replace('local:', '') : null }

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

  // Close lightbox on escape
  const photoCountRef = useRef(filteredPhotos.length)
  photoCountRef.current = filteredPhotos.length
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setLightboxIdx(null); setDrawMode(false); }
      if (lightboxIdx !== null) {
        const count = photoCountRef.current
        if (count > 0) {
          if (e.key === 'ArrowRight') setLightboxIdx((lightboxIdx + 1) % count)
          if (e.key === 'ArrowLeft') setLightboxIdx((lightboxIdx - 1 + count) % count)
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [lightboxIdx])

  const completedTasks = tasks.filter(t => t.status === 'COMPLETED').length
  const taskProgress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0

  // Draw handlers for lightbox
  const initDrawCanvas = useCallback(() => {
    const canvas = drawCanvasRef.current
    if (!canvas || lightboxIdx === null) return
    const photo = filteredPhotos[lightboxIdx]
    if (!photo) return
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      canvas.getContext('2d')!.drawImage(img, 0, 0)
      drawImgLoaded.current = true
    }
    img.src = photo.url
  }, [lightboxIdx, filteredPhotos])

  const getDrawPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = drawCanvasRef.current
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width; const scaleY = canvas.height / rect.height
    if ('touches' in e) return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY }
  }

  const handleDrawStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault(); setIsDrawing(true)
    const pos = getDrawPos(e); lastDrawPos.current = pos
  }
  const handleDrawMove = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = drawCanvasRef.current
    if (!isDrawing || !lastDrawPos.current || !canvas) return
    e.preventDefault()
    const ctx = canvas.getContext('2d')!
    const pos = getDrawPos(e)
    ctx.beginPath(); ctx.moveTo(lastDrawPos.current.x, lastDrawPos.current.y); ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = drawColor; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke()
    lastDrawPos.current = pos
  }
  const handleDrawEnd = () => { setIsDrawing(false); lastDrawPos.current = null }

  const deletePhoto = async (photoId: string) => {
    try {
      await fetch(`/api/photos/${photoId}`, { method: 'DELETE' })
      setPhotos(prev => prev.filter(p => p.id !== photoId))
      setLightboxIdx(null)
      toast({ title: 'Foto eliminada' })
    } catch { toast({ title: 'Error al eliminar', variant: 'destructive' }) }
  }

  if (!selectedProjectId || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F7F8FA' }}>
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#38C5B5', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  const currentLightboxPhoto = lightboxIdx !== null ? filteredPhotos[lightboxIdx] : null

  return (
    <div className="min-h-screen" style={{ background: '#F7F8FA' }}>
      {/* Header */}
      <div className="sticky top-0 z-30 border-b" style={{ background: 'rgba(247,248,250,0.9)', backdropFilter: 'blur(16px)', borderColor: '#E2E6EB' }}>
        <div className="max-w-7xl mx-auto px-4 lg:px-8 h-[72px] flex items-center gap-4">
          <button onClick={goBack} className="p-2.5 rounded-xl hover:bg-black/5 transition-colors">
            <ArrowLeft className="w-5 h-5" style={{ color: '#35414A' }} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-[20px] lg:text-[24px] font-bold tracking-[-0.02em] truncate" style={{ color: '#1A2332' }}>
              {project?.name || 'Cargando...'}
            </h1>
          </div>
          {currentUser && (
            <Button onClick={() => openUploadModal(selectedProjectId || '')} className="h-10 px-5 rounded-xl text-[13px] font-semibold text-white border-0 gap-2"
              style={{ background: 'linear-gradient(135deg, #38C5B5, #2DA194)' }}>
              <Camera className="w-4 h-4" strokeWidth={2.5} />
              <span className="hidden sm:inline">Subir Fotos</span>
            </Button>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6">
        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] font-semibold" style={{ color: '#35414A' }}>Progreso</span>
            <span className="text-[20px] font-bold" style={{ color: '#38C5B5' }}>{project?.progress ?? 0}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: '#EDF0F4' }}>
            <motion.div initial={{ width: 0 }} animate={{ width: `${project?.progress ?? 0}%` }} transition={{ duration: 0.8 }} className="h-full rounded-full" style={{ background: 'linear-gradient(90deg, #38C5B5, #2DA194)' }} />
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 h-auto gap-1 p-1 rounded-xl bg-white border" style={{ borderColor: '#E2E6EB' }}>
            {[
              { id: 'gallery', label: 'Fotos', icon: Image, count: photos.length },
              { id: 'tasks', label: 'Tareas', icon: CheckSquare, count: tasks.length },
              { id: 'timeline', label: 'Actividad', icon: Clock },
            ].map(tab => (
              <TabsTrigger key={tab.id} value={tab.id}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-semibold data-[state=active]:text-white data-[state=active]:shadow-sm transition-all"
                style={{ color: '#5D7380' }} onClick={() => setActiveTab(tab.id)}>
                <tab.icon className="w-4 h-4" strokeWidth={2} />
                <span className="hidden sm:inline">{tab.label}</span>
                {tab.count !== undefined && (
                  <span className="text-[11px] px-1.5 py-0.5 rounded-md font-bold" style={{ background: tab.id === activeTab ? 'rgba(255,255,255,0.2)' : '#EDF0F4', color: tab.id === activeTab ? 'white' : '#5D7380' }}>
                    {tab.count}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Gallery Tab */}
          <TabsContent value="gallery">
            {/* Filters */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
              {[{ id: 'ALL', label: 'Todas', color: '#38C5B5' }, { id: 'antes', label: 'ANTES', color: '#F0A030' }, { id: 'despues', label: 'DESPUÉS', color: '#2DA194' }].map(f => (
                <button key={f.id} onClick={() => setTagFilter(f.id)} className="px-3.5 py-2 rounded-lg text-[12px] font-bold tracking-wide whitespace-nowrap border transition-all"
                  style={{ background: tagFilter === f.id ? f.color : 'white', color: tagFilter === f.id ? 'white' : '#5D7380', borderColor: tagFilter === f.id ? f.color : '#E2E6EB' }}>
                  {f.label}
                </button>
              ))}
              {allLocales.map(loc => (
                <button key={loc} onClick={() => setTagFilter(loc)} className="px-3.5 py-2 rounded-lg text-[12px] font-semibold whitespace-nowrap border transition-all"
                  style={{ background: tagFilter === loc ? '#35414A' : 'white', color: tagFilter === loc ? 'white' : '#5D7380', borderColor: tagFilter === loc ? '#35414A' : '#E2E6EB' }}>
                  {loc}
                </button>
              ))}
            </div>

            {/* Photo grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredPhotos.map((photo, i) => {
                const phase = getPhase(photo)
                const local = getLocal(photo)
                return (
                  <motion.div key={photo.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                    onClick={() => setLightboxIdx(i)}
                    className="relative group rounded-xl overflow-hidden border cursor-pointer aspect-[4/3]" style={{ borderColor: '#E8EBF0' }}>
                    <img src={photo.thumbnailUrl || photo.url} alt={photo.caption || ''} className="w-full h-full object-cover" loading="lazy" />
                    <div className="absolute top-2 left-2 flex flex-col gap-1">
                      {phase && <span className="px-2 py-0.5 rounded-md text-[10px] font-bold text-white" style={{ background: phase === 'antes' ? '#F0A030' : '#2DA194' }}>{phase === 'antes' ? 'ANTES' : 'DESPUÉS'}</span>}
                      {local && <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold text-white" style={{ background: 'rgba(26,35,50,0.7)' }}>{local}</span>}
                    </div>
                    {photo.caption && <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent"><p className="text-[11px] text-white font-medium truncate">{photo.caption}</p></div>}
                  </motion.div>
                )
              })}
            </div>
            {filteredPhotos.length === 0 && (
              <div className="text-center py-16">
                <Camera className="w-10 h-10 mx-auto mb-3" style={{ color: '#ADB5B7' }} />
                <p className="text-[15px] font-semibold" style={{ color: '#35414A' }}>Sin fotos</p>
                <p className="text-[13px] mt-1" style={{ color: '#ADB5B7' }}>Toca &quot;Subir Fotos&quot; para comenzar</p>
              </div>
            )}
          </TabsContent>

          {/* Tasks Tab */}
          <TabsContent value="tasks">
            <div className="space-y-2">
              {tasks.map(task => (
                <Card key={task.id} className="border-0 shadow-sm" style={{ background: '#FFFFFF' }}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: task.status === 'COMPLETED' ? '#2DA194' : task.status === 'IN_PROGRESS' ? '#F0A030' : '#ADB5B7' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold truncate" style={{ color: '#1A2332' }}>{task.title}</p>
                      <p className="text-[12px]" style={{ color: '#5D7380' }}>{task.assignee?.name || 'Sin asignar'}{task.dueDate && ` — ${new Date(task.dueDate).toLocaleDateString('es-MX')}`}</p>
                    </div>
                    {PRIORITY_CONFIG[task.priority] && <Badge className="text-[11px] font-semibold px-2 py-0.5 rounded-md border shrink-0" style={{ ...parseBadge(PRIORITY_CONFIG[task.priority].color) }}>{PRIORITY_CONFIG[task.priority].label}</Badge>}
                  </CardContent>
                </Card>
              ))}
              {tasks.length === 0 && <p className="text-[14px] text-center py-12" style={{ color: '#ADB5B7' }}>Sin tareas</p>}
            </div>
          </TabsContent>

          {/* Timeline Tab */}
          <TabsContent value="timeline">
            <div className="relative pl-6">
              <div className="absolute left-[7px] top-2 bottom-2 w-px" style={{ background: '#E2E6EB' }} />
              <div className="space-y-6">
                {activity.map((act) => (
                  <div key={act.id} className="relative flex gap-4">
                    <div className="absolute left-[-20px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white z-10" style={{ background: '#38C5B5' }} />
                    <Card className="flex-1 border-0 shadow-sm" style={{ background: '#FFFFFF' }}>
                      <CardContent className="p-3.5">
                        <p className="text-[13px]" style={{ color: '#35414A' }}><span className="font-bold">{act.user?.name}</span>{' '}<span style={{ color: '#5D7380' }}>{act.details || act.action}</span></p>
                        <p className="text-[11px] mt-1" style={{ color: '#ADB5B7' }}>{new Date(act.createdAt).toLocaleString('es-MX')}</p>
                      </CardContent>
                    </Card>
                  </div>
                ))}
                {activity.length === 0 && <p className="text-[14px] py-12 text-center" style={{ color: '#ADB5B7' }}>Sin actividad</p>}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <div className="h-20 lg:h-0" />

      {/* ═══ FULLSCREEN LIGHTBOX ═══ */}
      <AnimatePresence>
        {lightboxIdx !== null && currentLightboxPhoto && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black flex flex-col">
            {/* Top bar */}
            <div className="flex items-center justify-between px-4 py-3 bg-black/80 z-10">
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-semibold truncate">{currentLightboxPhoto.caption || 'Foto'}</p>
                <p className="text-white/50 text-xs">{lightboxIdx + 1} / {filteredPhotos.length}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { setDrawMode(!drawMode); if (!drawMode) setTimeout(initDrawCanvas, 50) }} className="h-9 w-9 rounded-full flex items-center justify-center" style={{ background: drawMode ? '#38C5B5' : 'rgba(255,255,255,0.15)' }}>
                  <Pencil className="h-4 w-4 text-white" />
                </button>
                <button onClick={() => setShowInfo(!showInfo)} className="h-9 w-9 rounded-full flex items-center justify-center bg-white/15">
                  <FileText className="h-4 w-4 text-white" />
                </button>
                <button onClick={() => deletePhoto(currentLightboxPhoto.id)} className="h-9 w-9 rounded-full flex items-center justify-center bg-red-500/80">
                  <Trash2 className="h-4 w-4 text-white" />
                </button>
                <button onClick={() => { setLightboxIdx(null); setDrawMode(false); }} className="h-9 w-9 rounded-full flex items-center justify-center bg-white/15">
                  <X className="h-4 w-4 text-white" />
                </button>
              </div>
            </div>

            {/* Draw toolbar */}
            {drawMode && (
              <div className="flex items-center gap-2 px-4 py-2 bg-black/80 z-10">
                {['#ef4444', '#f97316', '#eab308', '#22c55e', '#38C5B5', '#3b82f6', '#8b5cf6', '#ffffff'].map(c => (
                  <button key={c} onClick={() => setDrawColor(c)} className="h-7 w-7 rounded-full border-2 transition-transform" style={{ background: c, borderColor: drawColor === c ? 'white' : 'transparent', transform: drawColor === c ? 'scale(1.2)' : 'scale(1)' }} />
                ))}
                <button onClick={() => initDrawCanvas()} className="ml-2 h-7 w-7 rounded-full bg-white/15 flex items-center justify-center"><Eraser className="h-3.5 w-3.5 text-white" /></button>
              </div>
            )}

            {/* Image / Canvas */}
            <div className="flex-1 relative flex items-center justify-center overflow-hidden">
              {drawMode ? (
                <canvas ref={drawCanvasRef} className="max-w-full max-h-full object-contain"
                  onMouseDown={handleDrawStart} onMouseMove={handleDrawMove} onMouseUp={handleDrawEnd} onMouseLeave={handleDrawEnd}
                  onTouchStart={handleDrawStart} onTouchMove={handleDrawMove} onTouchEnd={handleDrawEnd} />
              ) : (
                <img src={currentLightboxPhoto.url} alt="" className="max-w-full max-h-full object-contain" />
              )}

              {/* Nav arrows */}
              {!drawMode && (
                <>
                  <button onClick={() => setLightboxIdx((lightboxIdx - 1 + filteredPhotos.length) % filteredPhotos.length)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-black/50 flex items-center justify-center">
                    <ChevronLeft className="h-6 w-6 text-white" />
                  </button>
                  <button onClick={() => setLightboxIdx((lightboxIdx + 1) % filteredPhotos.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-black/50 flex items-center justify-center">
                    <ChevronRight className="h-6 w-6 text-white" />
                  </button>
                </>
              )}
            </div>

            {/* Info panel */}
            <AnimatePresence>
              {showInfo && (
                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="bg-black/90 overflow-hidden">
                  <div className="p-4 space-y-2">
                    <p className="text-white text-sm"><span className="font-bold">Subido por:</span> {currentLightboxPhoto.uploadedBy?.name}</p>
                    <p className="text-white text-sm"><span className="font-bold">Fecha:</span> {new Date(currentLightboxPhoto.createdAt).toLocaleString('es-MX')}</p>
                    {currentLightboxPhoto.caption && <p className="text-white text-sm"><span className="font-bold">Nota:</span> {currentLightboxPhoto.caption}</p>}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
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
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}