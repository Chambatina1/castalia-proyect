'use client'

import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, MapPin, Calendar, Image, CheckSquare, MessageSquare, FileText, Clock, Camera, X, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Pencil, Trash2, Eraser, Download, Share2, Copy, CheckCircle, ImagePlus, Link2, GripVertical, Save, StickyNote, Plus, FolderOpen, Folder, ChevronRight as ChevronRightIcon } from 'lucide-react'
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
  subProductId?: string | null
}
interface ApiTask {
  id: string; title: string; status: string; priority: string
  assignee?: { id: string; name: string } | null; dueDate?: string | null; createdAt: string
}
interface ApiActivity {
  id: string; action: string; user: { id: string; name: string }; details?: string; createdAt: string
}
interface SubProduct {
  id: string; name: string; sortOrder: number; _count: { photos: number }
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

  // Photo upload
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)
  const [pendingPhase, setPendingPhase] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  // Selection mode
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Share link
  const [shareLink, setShareLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Notes
  const [showNoteEditor, setShowNoteEditor] = useState(false)
  const [projectNote, setProjectNote] = useState('')
  const [savingNote, setSavingNote] = useState(false)

  // Photo note
  const [notePhotoId, setNotePhotoId] = useState<string | null>(null)
  const [notePhotoText, setNotePhotoText] = useState('')

  // Reorder photos
  const [reorderMode, setReorderMode] = useState(false)
  const [localPhotos, setLocalPhotos] = useState<ApiPhoto[]>([])

  // SubProducts
  const [subProducts, setSubProducts] = useState<SubProduct[]>([])
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null)
  const [newSubName, setNewSubName] = useState('')
  const [showNewSub, setShowNewSub] = useState(false)
  const [renamingSubId, setRenamingSubId] = useState<string | null>(null)
  const [renameSubValue, setRenameSubValue] = useState('')
  const [assigningSubPhotoId, setAssigningSubPhotoId] = useState<string | null>(null)

  const getTags = (p: ApiPhoto) => { try { return JSON.parse(p.tags || '[]') } catch { return (p.tags || '').split(',').filter(Boolean) } }
  const getPhase = (p: ApiPhoto) => { const t = getTags(p); return t.includes('antes') ? 'antes' : t.includes('despues') ? 'despues' : null }
  const getLocal = (p: ApiPhoto) => { const t = getTags(p); const loc = t.find(t => t.startsWith('local:')); return loc ? loc.replace('local:', '') : null }

  const allLocales = [...new Set(photos.map(p => getLocal(p)).filter(Boolean))]
  const beforePhotos = photos.filter(p => getPhase(p) === 'antes')
  const afterPhotos = photos.filter(p => getPhase(p) === 'despues')

  const filteredPhotos = useMemo(() => {
    let result = photos
    // If inside a subproduct, only show its photos
    if (selectedSubId) {
      result = result.filter(p => p.subProductId === selectedSubId)
    }
    // Tag filter (ANTES/DESPUÉS) only applies within subproduct or when no sub selected
    if (!selectedSubId) {
      if (tagFilter === 'antes') result = beforePhotos
      else if (tagFilter === 'despues') result = afterPhotos
      else if (tagFilter !== 'ALL') result = photos.filter(p => getLocal(p) === tagFilter)
    }
    return result
  }, [photos, tagFilter, selectedSubId, beforePhotos, afterPhotos])

  const selectedSub = subProducts.find(s => s.id === selectedSubId) || null
  // Get cover photo for each subproduct
  const subCoverMap = useMemo(() => {
    const map = new Map<string, ApiPhoto>()
    for (const p of photos) {
      if (p.subProductId && !map.has(p.subProductId)) map.set(p.subProductId, p)
    }
    return map
  }, [photos])

  const loadPhotos = useCallback(async () => {
    if (!selectedProjectId) return
    const phRes = await fetch(`/api/photos?projectId=${selectedProjectId}`).then(r => r.json())
    if (Array.isArray(phRes?.photos)) setPhotos(phRes.photos.map((p: any) => ({ ...p, uploadedBy: p.uploader, subProductId: p.subProductId })))
  }, [selectedProjectId])

  const loadSubProducts = useCallback(async () => {
    if (!selectedProjectId) return
    const res = await fetch(`/api/subproducts?projectId=${selectedProjectId}`).then(r => r.json())
    if (Array.isArray(res?.subProducts)) setSubProducts(res.subProducts)
  }, [selectedProjectId])

  // ─── SubProduct CRUD ───
  const createSubProduct = async () => {
    if (!selectedProjectId || !newSubName.trim()) return
    try {
      const res = await fetch('/api/subproducts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId: selectedProjectId, name: newSubName.trim() }) })
      if (!res.ok) { const e = await res.json(); toast({ title: e.error || 'Error', variant: 'destructive' }); return }
      const { subProduct } = await res.json()
      setSubProducts(prev => [...prev, { ...subProduct, _count: { photos: 0 } }])
      setNewSubName(''); setShowNewSub(false)
      toast({ title: `"${subProduct.name}" creado` })
    } catch { toast({ title: 'Error al crear', variant: 'destructive' }) }
  }
  const renameSubProduct = async (id: string) => {
    if (!renameSubValue.trim()) return
    try {
      await fetch('/api/subproducts', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, name: renameSubValue.trim() }) })
      setSubProducts(prev => prev.map(s => s.id === id ? { ...s, name: renameSubValue.trim() } : s))
      setRenamingSubId(null)
      toast({ title: 'Subproducto renombrado' })
    } catch { toast({ title: 'Error', variant: 'destructive' }) }
  }
  const deleteSubProduct = async (id: string) => {
    try {
      await fetch(`/api/subproducts?id=${id}`, { method: 'DELETE' })
      setSubProducts(prev => prev.filter(s => s.id !== id))
      if (selectedSubId === id) setSelectedSubId(null)
      toast({ title: 'Subproducto eliminado' })
    } catch { toast({ title: 'Error', variant: 'destructive' }) }
  }
  const moveSubProduct = async (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir
    if (newIdx < 0 || newIdx >= subProducts.length) return
    const arr = [...subProducts]
    ;[arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]]
    setSubProducts(arr)
    try {
      await fetch('/api/subproducts', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: arr.map((s, i) => ({ id: s.id, sortOrder: i })) }) })
    } catch { toast({ title: 'Error al reordenar', variant: 'destructive' }) }
  }
  const assignPhotoToSub = async (photoId: string, subProductId: string | null) => {
    try {
      await fetch(`/api/photos/${photoId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subProductId }) })
      setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, subProductId } : p))
      setAssigningSubPhotoId(null)
      // Refresh subproduct counts
      loadSubProducts()
      toast({ title: subProductId ? 'Foto asignada' : 'Foto desasignada' })
    } catch { toast({ title: 'Error', variant: 'destructive' }) }
  }

  useEffect(() => {
    if (!selectedProjectId) return
    setLoading(true)
    setSelectedSubId(null)
    setTagFilter('ALL')
    Promise.allSettled([
      fetch(`/api/projects/${selectedProjectId}`).then(r => r.json()),
      fetch(`/api/photos?projectId=${selectedProjectId}`).then(r => r.json()),
      fetch(`/api/tasks?projectId=${selectedProjectId}`).then(r => r.json()),
      fetch(`/api/activity?projectId=${selectedProjectId}&limit=20`).then(r => r.json()),
      fetch(`/api/subproducts?projectId=${selectedProjectId}`).then(r => r.json()),
    ]).then(([pRes, phRes, tRes, aRes, sRes]) => {
      if (pRes.status === 'fulfilled' && pRes.value?.project?.id) setProject(pRes.value.project)
      if (phRes.status === 'fulfilled' && Array.isArray(phRes.value?.photos)) {
        setPhotos(phRes.value.photos.map((p: any) => ({ ...p, uploadedBy: p.uploader, subProductId: p.subProductId })))
      }
      if (tRes.status === 'fulfilled' && Array.isArray(tRes.value)) setTasks(tRes.value)
      if (aRes.status === 'fulfilled' && Array.isArray(aRes.value)) setActivity(aRes.value)
      if (sRes.status === 'fulfilled' && Array.isArray(sRes.value?.subProducts)) setSubProducts(sRes.value.subProducts)
      setLoading(false)
    })
  }, [selectedProjectId])

  // Close lightbox on escape
  const photoCountRef = useRef(filteredPhotos.length)
  photoCountRef.current = filteredPhotos.length
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setLightboxIdx(null); setDrawMode(false); setSelectMode(false); setSelectedIds(new Set()) }
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

  // ─── Photo Upload by Phase ───
  const handlePhaseUpload = async (files: FileList, fase: string) => {
    if (!files.length || !selectedProjectId || !pendingPhase) return
    setUploading(true)
    try {
      const fd = new FormData()
      for (let i = 0; i < files.length; i++) fd.append('files', files[i])
      fd.append('projectId', selectedProjectId)
      fd.append('uploadedBy', currentUser?.id || '')
      fd.append('fase', fase)
      fd.append('tags', JSON.stringify([fase]))

      const res = await fetch('/api/photos', { method: 'POST', body: fd })
      if (!res.ok) throw new Error()
      toast({ title: `${files.length} foto(s) subida(s)`, description: fase === 'antes' ? 'ANTES' : 'DESPUÉS' })
      await loadPhotos()
    } catch {
      toast({ title: 'Error al subir fotos', variant: 'destructive' })
    } finally {
      setUploading(false)
      setPendingPhase(null)
    }
  }

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && pendingPhase) handlePhaseUpload(e.target.files, pendingPhase)
    e.target.value = ''
  }

  // ─── Download ───
  const downloadPhoto = async (photo: ApiPhoto) => {
    try {
      const res = await fetch(photo.url)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `castalia-${photo.id}.${photo.url.split('.').pop() || 'jpg'}`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast({ title: 'Error al descargar', variant: 'destructive' })
    }
  }

  const downloadSelected = async () => {
    const selected = filteredPhotos.filter(p => selectedIds.has(p.id))
    for (const photo of selected) {
      await downloadPhoto(photo)
      await new Promise(r => setTimeout(r, 300))
    }
    toast({ title: `${selected.length} foto(s) descargada(s)` })
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  // ─── Share Link ───
  const generateShareLink = async () => {
    if (!selectedProjectId || !currentUser) return
    try {
      const res = await fetch('/api/shares', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: selectedProjectId, createdBy: currentUser.id }),
      })
      if (!res.ok) throw new Error()
      const { share } = await res.json()
      const link = `${window.location.origin}/upload?token=${share.token}`
      setShareLink(link)
      navigator.clipboard.writeText(link).then(() => {
        setCopied(true)
        toast({ title: 'Link copiado', description: 'Envialo a tu trabajador' })
        setTimeout(() => setCopied(false), 2000)
      })
    } catch {
      toast({ title: 'Error al generar link', variant: 'destructive' })
    }
  }

  // ─── Project Note ───
  const openNoteEditor = () => { setProjectNote(project?.description || ''); setShowNoteEditor(true) }
  const saveProjectNote = async () => {
    if (!selectedProjectId) return
    setSavingNote(true)
    try {
      await fetch(`/api/projects/${selectedProjectId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ description: projectNote }) })
      setProject(prev => ({ ...prev, description: projectNote }))
      setShowNoteEditor(false)
      toast({ title: 'Nota guardada' })
    } catch { toast({ title: 'Error', variant: 'destructive' }) }
    finally { setSavingNote(false) }
  }

  // ─── Photo Note ───
  const openPhotoNote = (photo: ApiPhoto) => { setNotePhotoId(photo.id); setNotePhotoText(photo.caption || '') }
  const savePhotoNote = async () => {
    if (!notePhotoId) return
    try {
      await fetch(`/api/photos/${notePhotoId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ caption: notePhotoText }) })
      setPhotos(prev => prev.map(p => p.id === notePhotoId ? { ...p, caption: notePhotoText } : p))
      setNotePhotoId(null)
      toast({ title: 'Nota de foto guardada' })
    } catch { toast({ title: 'Error', variant: 'destructive' }) }
  }

  // ─── Reorder Photos ───
  const startReorder = () => { setReorderMode(true); setLocalPhotos([...filteredPhotos]) }
  const savePhotoOrder = async () => {
    try {
      const items = localPhotos.map((p, i) => ({ id: p.id, sortOrder: i }))
      await fetch('/api/photos/reorder', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items }) })
      setPhotos(prev => {
        const map = new Map(prev.map(p => [p.id, p]))
        return localPhotos.map(lp => ({ ...map.get(lp.id)! }))
      })
      setReorderMode(false)
      toast({ title: 'Orden guardado' })
    } catch { toast({ title: 'Error', variant: 'destructive' }) }
  }
  const movePhoto = (idx: number, dir: -1 | 1) => {
    const arr = [...localPhotos]
    const newIdx = idx + dir
    if (newIdx < 0 || newIdx >= arr.length) return
    ;[arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]]
    setLocalPhotos(arr)
  }

  // ─── Draw handlers ───
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

  const handleDrawStart = (e: React.MouseEvent | React.TouchEvent) => { e.preventDefault(); setIsDrawing(true); const pos = getDrawPos(e); lastDrawPos.current = pos }
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

  // Hidden file inputs
  const fileInputs = (
    <>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFileChange} />
      <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} multiple />
    </>
  )

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
      {fileInputs}

      {/* Header */}
      <div className="sticky top-0 z-30 border-b" style={{ background: 'rgba(247,248,250,0.9)', backdropFilter: 'blur(16px)', borderColor: '#E2E6EB' }}>
        <div className="max-w-7xl mx-auto px-4 lg:px-8 h-[72px] flex items-center gap-3">
          <button onClick={goBack} className="p-2.5 rounded-xl hover:bg-black/5 transition-colors shrink-0">
            <ArrowLeft className="w-5 h-5" style={{ color: '#35414A' }} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-[18px] lg:text-[22px] font-bold tracking-[-0.02em] truncate" style={{ color: '#1A2332' }}>
              {project?.name || 'Cargando...'}
            </h1>
          </div>
          <button onClick={generateShareLink} className="h-9 px-3 rounded-lg border flex items-center gap-1.5 text-[12px] font-semibold shrink-0"
            style={{ borderColor: '#E2E6EB', color: '#5D7380' }}>
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Compartir</span>
          </button>
          <button onClick={openNoteEditor} className="h-9 px-3 rounded-lg border flex items-center gap-1.5 text-[12px] font-semibold shrink-0"
            style={{ borderColor: '#E2E6EB', color: '#F0A030' }}>
            <StickyNote className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Nota</span>
          </button>
        </div>
      </div>

      {/* Share link banner */}
      <AnimatePresence>
        {shareLink && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-b" style={{ borderColor: '#E2E6EB', background: '#F0FDFA' }}>
            <div className="max-w-7xl mx-auto px-4 lg:px-8 py-3 flex items-center gap-3">
              <Link2 className="w-4 h-4 shrink-0" style={{ color: '#2DA194' }} />
              <p className="text-[12px] truncate flex-1" style={{ color: '#115E59' }}>{shareLink}</p>
              <button onClick={() => { navigator.clipboard.writeText(shareLink); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
                className="h-7 px-2.5 rounded-md text-[11px] font-bold text-white shrink-0 flex items-center gap-1"
                style={{ background: copied ? '#2DA194' : '#38C5B5' }}>
                {copied ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copiado' : 'Copiar'}
              </button>
              <button onClick={() => setShareLink(null)} className="p-1"><X className="w-3.5 h-3.5" style={{ color: '#5D7380' }} /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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

        {/* Quick Phase Upload Buttons */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button onClick={() => { setPendingPhase('antes'); cameraRef.current?.click() }} disabled={uploading}
            className="rounded-2xl p-4 text-center border-2 transition-all disabled:opacity-50 active:scale-[0.97]"
            style={{ borderColor: '#F0A030', background: 'linear-gradient(135deg, #FFF7ED, #FFEDD5)' }}>
            <div className="flex items-center justify-center gap-2 mb-0.5">
              <Camera className="w-5 h-5" style={{ color: '#F0A030' }} />
              <span className="text-[15px] font-bold" style={{ color: '#92400E' }}>ANTES</span>
            </div>
            <p className="text-[11px]" style={{ color: '#B45309' }}>Tomar foto o elegir de galería</p>
          </button>

          <button onClick={() => { setPendingPhase('despues'); cameraRef.current?.click() }} disabled={uploading}
            className="rounded-2xl p-4 text-center border-2 transition-all disabled:opacity-50 active:scale-[0.97]"
            style={{ borderColor: '#2DA194', background: 'linear-gradient(135deg, #F0FDFA, #CCFBF1)' }}>
            <div className="flex items-center justify-center gap-2 mb-0.5">
              <Camera className="w-5 h-5" style={{ color: '#2DA194' }} />
              <span className="text-[15px] font-bold" style={{ color: '#115E59' }}>DESPUÉS</span>
            </div>
            <p className="text-[11px]" style={{ color: '#0F766E' }}>Tomar foto o elegir de galería</p>
          </button>
        </div>

        {/* Gallery upload buttons (secondary) */}
        <div className="flex gap-2 mb-4">
          <button onClick={() => { setPendingPhase('antes'); galleryRef.current?.click() }} disabled={uploading}
            className="flex-1 h-9 rounded-lg text-[12px] font-semibold border flex items-center justify-center gap-1.5 disabled:opacity-50"
            style={{ borderColor: '#F0A030', color: '#92400E', background: '#FFFBF5' }}>
            <ImagePlus className="w-3.5 h-3.5" /> Galería ANTES
          </button>
          <button onClick={() => { setPendingPhase('despues'); galleryRef.current?.click() }} disabled={uploading}
            className="flex-1 h-9 rounded-lg text-[12px] font-semibold border flex items-center justify-center gap-1.5 disabled:opacity-50"
            style={{ borderColor: '#2DA194', color: '#115E59', background: '#F7FDFC' }}>
            <ImagePlus className="w-3.5 h-3.5" /> Galería DESPUÉS
          </button>
          {selectMode && (
            <button onClick={selectedIds.size > 0 ? downloadSelected : () => { setSelectMode(false); setSelectedIds(new Set()) }}
              className="h-9 px-4 rounded-lg text-[12px] font-bold text-white flex items-center gap-1.5 shrink-0"
              style={{ background: selectedIds.size > 0 ? '#38C5B5' : '#6B7280' }}>
              <Download className="w-3.5 h-3.5" />
              {selectedIds.size > 0 ? `Descargar ${selectedIds.size}` : 'Cancelar'}
            </button>
          )}
        </div>

        {/* ─── SubProductos Section ─── */}
        <div className="mb-6 rounded-xl border overflow-hidden" style={{ borderColor: '#E2E6EB', background: '#FFFFFF' }}>
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: '#EDF0F4' }}>
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4" style={{ color: '#38C5B5' }} />
              <span className="text-[13px] font-bold" style={{ color: '#1A2332' }}>Subproductos</span>
              {subProducts.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-md font-bold" style={{ background: '#F0FDFA', color: '#38C5B5' }}>{subProducts.length}</span>
              )}
            </div>
            <button onClick={() => setShowNewSub(!showNewSub)} className="flex items-center gap-1 h-7 px-2.5 rounded-lg text-[11px] font-semibold border transition-colors"
              style={{ borderColor: '#E2E6EB', color: '#38C5B5', background: showNewSub ? '#F0FDFA' : 'white' }}>
              <Plus className="w-3 h-3" /> Nuevo
            </button>
          </div>

          {/* New subproduct input */}
          <AnimatePresence>
            {showNewSub && (
              <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden border-b" style={{ borderColor: '#EDF0F4' }}>
                <div className="flex gap-2 px-4 py-3">
                  <input value={newSubName} onChange={e => setNewSubName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createSubProduct()}
                    placeholder="Nombre del subproducto..."
                    className="flex-1 h-9 px-3 rounded-lg border text-[13px] focus:outline-none focus:border-[#38C5B5]/50"
                    style={{ borderColor: '#E2E6EB', color: '#1A2332' }} autoFocus />
                  <button onClick={createSubProduct} disabled={!newSubName.trim()}
                    className="h-9 px-4 rounded-lg text-[12px] font-bold text-white disabled:opacity-40"
                    style={{ background: '#38C5B5' }}>Crear</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Subproduct list */}
          <div className="max-h-[300px] overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
            {/* "Todas" filter option */}
            <div onClick={() => setSubFilter(null)} className="flex items-center gap-2.5 px-4 py-2.5 cursor-pointer transition-colors"
              style={{ background: subFilter === null ? '#F0FDFA' : 'transparent' }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: subFilter === null ? '#38C5B5' : '#F3F4F6' }}>
                <Image className="w-3.5 h-3.5" style={{ color: subFilter === null ? 'white' : '#9CA3AF' }} />
              </div>
              <span className="text-[12px] font-semibold flex-1" style={{ color: subFilter === null ? '#115E59' : '#35414A' }}>Todas las fotos</span>
              <span className="text-[11px] font-mono" style={{ color: '#ADB5B7' }}>{photos.length}</span>
            </div>

            {subProducts.map((sub, idx) => (
              <div key={sub.id} className="flex items-center gap-1 px-2 py-1.5 group/sub">
                {/* Reorder arrows */}
                <div className="flex flex-col gap-px shrink-0 opacity-0 group-hover/sub:opacity-100 transition-opacity">
                  <button onClick={(e) => { e.stopPropagation(); moveSubProduct(idx, -1) }} disabled={idx === 0}
                    className="w-5 h-5 flex items-center justify-center rounded hover:bg-black/10 disabled:opacity-20">
                    <ChevronUp className="w-3 h-3" style={{ color: '#5D7380' }} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); moveSubProduct(idx, 1) }} disabled={idx === subProducts.length - 1}
                    className="w-5 h-5 flex items-center justify-center rounded hover:bg-black/10 disabled:opacity-20">
                    <ChevronDown className="w-3 h-3" style={{ color: '#5D7380' }} />
                  </button>
                </div>
                {/* Name row */}
                {renamingSubId === sub.id ? (
                  <input value={renameSubValue} onChange={e => setRenameSubValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') renameSubProduct(sub.id); if (e.key === 'Escape') setRenamingSubId(null) }}
                    onBlur={() => renameSubProduct(sub.id)}
                    className="flex-1 min-w-0 h-7 px-2 rounded-md border text-[12px] font-semibold focus:outline-none"
                    style={{ borderColor: '#38C5B5', color: '#1A2332' }} autoFocus />
                ) : (
                  <div onClick={() => setSubFilter(subFilter === sub.id ? null : sub.id)}
                    className="flex items-center gap-2 flex-1 min-w-0 px-2 py-1 rounded-lg cursor-pointer transition-colors"
                    style={{ background: subFilter === sub.id ? '#F0FDFA' : 'transparent' }}>
                    <Folder className="w-4 h-4 shrink-0" style={{ color: subFilter === sub.id ? '#38C5B5' : '#9CA3AF' }} />
                    <span className="text-[12px] font-semibold truncate" style={{ color: subFilter === sub.id ? '#115E59' : '#35414A' }}>{sub.name}</span>
                    <span className="text-[10px] font-mono shrink-0" style={{ color: '#ADB5B7' }}>{sub._count.photos}</span>
                  </div>
                )}
                {/* Actions */}
                <button onClick={(e) => { e.stopPropagation(); setRenamingSubId(sub.id); setRenameSubValue(sub.name) }}
                  className="w-6 h-6 rounded flex items-center justify-center opacity-0 group-hover/sub:opacity-100 hover:bg-black/10 transition-opacity shrink-0">
                  <Pencil className="w-3 h-3" style={{ color: '#5D7380' }} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); deleteSubProduct(sub.id) }}
                  className="w-6 h-6 rounded flex items-center justify-center opacity-0 group-hover/sub:opacity-100 hover:bg-red-50 transition-opacity shrink-0">
                  <Trash2 className="w-3 h-3" style={{ color: '#E12E2E' }} />
                </button>
              </div>
            ))}

            {subProducts.length === 0 && !showNewSub && (
              <div className="px-4 py-4 text-center">
                <Folder className="w-6 h-6 mx-auto mb-1.5" style={{ color: '#D1D5DB' }} />
                <p className="text-[11px]" style={{ color: '#ADB5B7' }}>Crea subproductos para organizar las fotos</p>
              </div>
            )}
          </div>

          {/* Active sub filter indicator */}
          {subFilter && (
            <div className="flex items-center justify-between px-4 py-2 border-t" style={{ borderColor: '#EDF0F4', background: '#F0FDFA' }}>
              <span className="text-[11px] font-semibold" style={{ color: '#115E59' }}>
                Filtrando: {subProducts.find(s => s.id === subFilter)?.name}
              </span>
              <button onClick={() => setSubFilter(null)} className="text-[11px] font-semibold" style={{ color: '#5D7380' }}>
                <X className="w-3.5 h-3.5 inline" /> Quitar filtro
              </button>
            </div>
          )}
        </div>

        {/* Uploading indicator */}
        {uploading && (
          <div className="flex items-center justify-center gap-2 mb-4 p-3 rounded-xl" style={{ background: '#F0FDFA', border: '1px solid #99F6E4' }}>
            <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#38C5B5', borderTopColor: 'transparent' }} />
            <span className="text-sm font-semibold" style={{ color: '#115E59' }}>Subiendo fotos...</span>
          </div>
        )}

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
            {/* Select mode toggle */}
            <button onClick={reorderMode ? savePhotoOrder : () => { setSelectMode(!selectMode); setSelectedIds(new Set()) }}
              className="ml-auto px-3 py-2 rounded-lg text-[12px] font-semibold transition-all"
              style={{ color: (selectMode || reorderMode) ? '#38C5B5' : '#ADB5B7', background: (selectMode || reorderMode) ? '#F0FDFA' : 'transparent' }}>
              {reorderMode ? 'Guardar orden' : selectMode ? 'Seleccionar' : 'Ordenar'}
            </button>
          </TabsList>

          {/* Gallery Tab */}
          <TabsContent value="gallery">
            {/* Filters + Reorder banner */}
            {reorderMode && (
              <div className="flex items-center justify-between p-3 rounded-xl mb-4" style={{ background: '#F0FDFA', border: '1px solid #99F6E4' }}>
                <span className="text-[12px] font-semibold" style={{ color: '#115E59' }}>Modo reordenar — usa las flechas en cada foto</span>
                <button onClick={() => setReorderMode(false)} className="text-[12px] font-semibold" style={{ color: '#5D7380' }}>Cancelar</button>
              </div>
            )}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
              {[{ id: 'ALL', label: 'Todas', color: '#38C5B5' }, { id: 'antes', label: 'ANTES', color: '#F0A030' }, { id: 'despues', label: 'DESPUÉS', color: '#2DA194' }].map(f => (
                <button key={f.id} onClick={() => setTagFilter(f.id)} className="px-3.5 py-2 rounded-lg text-[12px] font-bold tracking-wide whitespace-nowrap border transition-all"
                  style={{ background: tagFilter === f.id ? f.color : 'white', color: tagFilter === f.id ? 'white' : '#5D7380', borderColor: tagFilter === f.id ? f.color : '#E2E6EB' }}>
                  {f.label}
                </button>
              ))}
            </div>

            {/* Photo grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {(reorderMode ? localPhotos : filteredPhotos).map((photo, i) => {
                const phase = getPhase(photo)
                const isSelected = selectedIds.has(photo.id)
                const photoDate = new Date(photo.createdAt).toLocaleString('es-MX', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                return (
                  <motion.div key={photo.id} layout={reorderMode} initial={reorderMode ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reorderMode ? 0 : i * 0.03 }}
                    className="relative group rounded-xl overflow-hidden border bg-white"
                    style={{ borderColor: reorderMode ? '#38C5B5' : isSelected ? '#38C5B5' : '#E8EBF0' }}>
                    {/* Reorder arrows */}
                    {reorderMode && (
                      <div className="absolute top-1/2 -translate-y-1/2 -right-2 z-10 flex flex-col gap-0.5">
                        <button onClick={(e) => { e.stopPropagation(); movePhoto(i, -1) }} disabled={i === 0}
                          className="h-6 w-6 rounded-full bg-white border shadow-sm flex items-center justify-center disabled:opacity-30"
                          style={{ borderColor: '#E2E6EB' }}><ChevronUp className="w-3.5 h-3.5" style={{ color: '#35414A' }} /></button>
                        <button onClick={(e) => { e.stopPropagation(); movePhoto(i, 1) }} disabled={i === localPhotos.length - 1}
                          className="h-6 w-6 rounded-full bg-white border shadow-sm flex items-center justify-center disabled:opacity-30"
                          style={{ borderColor: '#E2E6EB' }}><ChevronDown className="w-3.5 h-3.5" style={{ color: '#35414A' }} /></button>
                      </div>
                    )}
                    {/* Image */}
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <img src={photo.thumbnailUrl || photo.url} alt={photo.caption || ''} className="w-full h-full object-cover cursor-pointer" loading="lazy"
                        onClick={() => reorderMode ? null : selectMode ? toggleSelect(photo.id) : setLightboxIdx(i)} />
                      {/* Phase badge */}
                      {phase && (
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-bold text-white pointer-events-none"
                          style={{ background: phase === 'antes' ? '#F0A030' : '#2DA194' }}>{phase === 'antes' ? 'ANTES' : 'DESPUÉS'}</span>
                      )}
                      {/* Action buttons */}
                      {!reorderMode && (
                        <div className="absolute top-2 right-2 flex gap-1">
                          <button onClick={(e) => { e.stopPropagation(); setAssigningSubPhotoId(photo.id) }}
                            className="h-7 w-7 rounded-lg flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
                            title="Asignar a subproducto">
                            <Folder className="w-3.5 h-3.5 text-white" />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); downloadPhoto(photo) }}
                            className="h-7 w-7 rounded-lg flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                            <Download className="w-3.5 h-3.5 text-white" />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); openPhotoNote(photo) }}
                            className="h-7 w-7 rounded-lg flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                            <StickyNote className="w-3.5 h-3.5 text-white" />
                          </button>
                        </div>
                      )}
                      {/* Select checkbox */}
                      {selectMode && !reorderMode && (
                        <div className="absolute top-2 right-2" onClick={(e) => { e.stopPropagation(); toggleSelect(photo.id) }}>
                          <div className="h-6 w-6 rounded-md border-2 flex items-center justify-center transition-all"
                            style={{ borderColor: isSelected ? '#38C5B5' : 'rgba(255,255,255,0.6)', background: isSelected ? '#38C5B5' : 'rgba(0,0,0,0.3)' }}>
                            {isSelected && <CheckCircle className="w-4 h-4 text-white" />}
                          </div>
                        </div>
                      )}
                    </div>
                    {/* Date + caption BELOW the photo */}
                    <div className="px-2.5 py-2">
                      <p className="text-[11px] font-semibold" style={{ color: '#1A2332' }}>{photoDate}</p>
                      {photo.caption && <p className="text-[10px] mt-0.5 truncate" style={{ color: '#5D7380' }}>{photo.caption}</p>}
                    </div>
                  </motion.div>
                )
              })}
            </div>
            {filteredPhotos.length === 0 && (
              <div className="text-center py-16">
                <Camera className="w-10 h-10 mx-auto mb-3" style={{ color: '#ADB5B7' }} />
                <p className="text-[15px] font-semibold" style={{ color: '#35414A' }}>Sin fotos</p>
                <p className="text-[13px] mt-1" style={{ color: '#ADB5B7' }}>Toca ANTES o DESPUÉS para comenzar</p>
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

      {/* ═══ Project Note Modal ═══ */}
      {showNoteEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowNoteEditor(false)} />
          <div className="relative w-[360px] bg-white rounded-2xl overflow-hidden shadow-xl">
            <div className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#FFF7ED' }}>
                  <StickyNote className="w-5 h-5" style={{ color: '#F0A030' }} />
                </div>
                <h3 className="text-[17px] font-bold" style={{ color: '#1A2332' }}>Notas del proyecto</h3>
              </div>
              <textarea
                value={projectNote}
                onChange={e => setProjectNote(e.target.value)}
                autoFocus
                rows={6}
                className="w-full text-[14px] rounded-xl border px-4 py-3 resize-none focus:outline-none focus:border-[#F0A030]/40"
                style={{ borderColor: '#E2E6EB', color: '#1A2332' }}
                placeholder="Escribe indicaciones, observaciones, detalles del proyecto..."
              />
            </div>
            <div className="flex border-t" style={{ borderColor: '#E8EBF0' }}>
              <button onClick={() => setShowNoteEditor(false)} disabled={savingNote}
                className="flex-1 h-12 text-[14px] font-semibold border-r" style={{ color: '#5D7380', borderColor: '#E8EBF0' }}>Cancelar</button>
              <button onClick={saveProjectNote} disabled={savingNote}
                className="flex-1 h-12 text-[14px] font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: '#F0A030' }}>
                {savingNote ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Photo Note Modal ═══ */}
      {notePhotoId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setNotePhotoId(null)} />
          <div className="relative w-[340px] bg-white rounded-2xl overflow-hidden shadow-xl">
            <div className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#F0FDFA' }}>
                  <StickyNote className="w-5 h-5" style={{ color: '#38C5B5' }} />
                </div>
                <h3 className="text-[17px] font-bold" style={{ color: '#1A2332' }}>Nota de foto</h3>
              </div>
              <textarea
                value={notePhotoText}
                onChange={e => setNotePhotoText(e.target.value)}
                autoFocus
                rows={3}
                className="w-full text-[14px] rounded-xl border px-4 py-3 resize-none focus:outline-none focus:border-[#38C5B5]/40"
                style={{ borderColor: '#E2E6EB', color: '#1A2332' }}
                placeholder="Indicaciones de esta foto..."
              />
            </div>
            <div className="flex border-t" style={{ borderColor: '#E8EBF0' }}>
              <button onClick={() => setNotePhotoId(null)}
                className="flex-1 h-12 text-[14px] font-semibold border-r" style={{ color: '#5D7380', borderColor: '#E8EBF0' }}>Cancelar</button>
              <button onClick={savePhotoNote}
                className="flex-1 h-12 text-[14px] font-semibold text-white flex items-center justify-center gap-2"
                style={{ background: '#38C5B5' }}>
                <Save className="w-4 h-4" /> Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Assign Photo to SubProduct Modal ═══ */}
      {assigningSubPhotoId && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setAssigningSubPhotoId(null)} />
          <div className="relative w-full sm:w-[340px] bg-white rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-xl max-h-[70vh] flex flex-col">
            <div className="p-5 pb-3 shrink-0">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#F0FDFA' }}>
                  <Folder className="w-5 h-5" style={{ color: '#38C5B5' }} />
                </div>
                <h3 className="text-[17px] font-bold" style={{ color: '#1A2332' }}>Asignar a subproducto</h3>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-5 pb-2">
              <button onClick={() => assignPhotoToSub(assigningSubPhotoId, null)}
                className="w-full flex items-center gap-3 p-3 rounded-xl mb-1 border transition-colors text-left"
                style={{ borderColor: '#E2E6EB', background: '#FAFAFA' }}>
                <Image className="w-4 h-4 shrink-0" style={{ color: '#9CA3AF' }} />
                <span className="text-[13px] font-medium" style={{ color: '#5D7380' }}>Sin subproducto</span>
              </button>
              {subProducts.map(sub => (
                <button key={sub.id} onClick={() => assignPhotoToSub(assigningSubPhotoId, sub.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl mb-1 border transition-colors text-left"
                  style={{ borderColor: photos.find(p => p.id === assigningSubPhotoId)?.subProductId === sub.id ? '#38C5B5' : '#E2E6EB', background: photos.find(p => p.id === assigningSubPhotoId)?.subProductId === sub.id ? '#F0FDFA' : 'white' }}>
                  <Folder className="w-4 h-4 shrink-0" style={{ color: '#38C5B5' }} />
                  <span className="text-[13px] font-semibold flex-1 truncate" style={{ color: '#1A2332' }}>{sub.name}</span>
                  <span className="text-[10px] font-mono" style={{ color: '#ADB5B7' }}>{sub._count.photos}</span>
                </button>
              ))}
            </div>
            <div className="p-4 pt-2 border-t shrink-0" style={{ borderColor: '#E8EBF0' }}>
              <button onClick={() => setAssigningSubPhotoId(null)} className="w-full h-11 text-[14px] font-semibold rounded-xl" style={{ color: '#5D7380' }}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ FULLSCREEN LIGHTBOX ═══ */}
      <AnimatePresence>
        {lightboxIdx !== null && currentLightboxPhoto && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 bg-black/80 z-10">
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-semibold truncate">{currentLightboxPhoto.caption || 'Foto'}</p>
                <p className="text-white/50 text-xs">{lightboxIdx + 1} / {filteredPhotos.length}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => downloadPhoto(currentLightboxPhoto)} className="h-9 w-9 rounded-full flex items-center justify-center bg-white/15" title="Descargar">
                  <Download className="h-4 w-4 text-white" />
                </button>
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

            {drawMode && (
              <div className="flex items-center gap-2 px-4 py-2 bg-black/80 z-10">
                {['#ef4444', '#f97316', '#eab308', '#22c55e', '#38C5B5', '#3b82f6', '#8b5cf6', '#ffffff'].map(c => (
                  <button key={c} onClick={() => setDrawColor(c)} className="h-7 w-7 rounded-full border-2 transition-transform" style={{ background: c, borderColor: drawColor === c ? 'white' : 'transparent', transform: drawColor === c ? 'scale(1.2)' : 'scale(1)' }} />
                ))}
                <button onClick={() => initDrawCanvas()} className="ml-2 h-7 w-7 rounded-full bg-white/15 flex items-center justify-center"><Eraser className="h-3.5 w-3.5 text-white" /></button>
              </div>
            )}

            <div className="flex-1 relative flex items-center justify-center overflow-hidden">
              {drawMode ? (
                <canvas ref={drawCanvasRef} className="max-w-full max-h-full object-contain"
                  onMouseDown={handleDrawStart} onMouseMove={handleDrawMove} onMouseUp={handleDrawEnd} onMouseLeave={handleDrawEnd}
                  onTouchStart={handleDrawStart} onTouchMove={handleDrawMove} onTouchEnd={handleDrawEnd} />
              ) : (
                <img src={currentLightboxPhoto.url} alt="" className="max-w-full max-h-full object-contain" />
              )}
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