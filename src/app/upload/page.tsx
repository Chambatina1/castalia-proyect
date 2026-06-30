'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, ImagePlus, Check, X, Loader2, ArrowLeft, Folder, ChevronDown, AlertCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Category {
  id: string
  name: string
  photoCount: number
}

interface ProjectInfo {
  projectId: string
  projectName: string
  clientName?: string
  categories?: Category[]
}

export default function UploadPage() {
  const { toast } = useToast()
  const [token, setToken] = useState('')
  const [project, setProject] = useState<ProjectInfo | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)
  const [workerName, setWorkerName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [recentUploads, setRecentUploads] = useState<{ phase: string; category: string; count: number; time: string }[]>([])
  const [validated, setValidated] = useState(false)
  const [validating, setValidating] = useState(false)
  const [pendingPhase, setPendingPhase] = useState<'antes' | 'despues' | null>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)

  // Get token from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const t = params.get('token')
    if (t) {
      setToken(t)
      validateToken(t)
    }
  }, [])

  const validateToken = async (t: string) => {
    setValidating(true)
    try {
      const res = await fetch(`/api/upload-token?token=${t}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setProject(data)
      setCategories(data.categories || [])
      setValidated(true)
      localStorage.setItem('castalia-upload-token', t)
      localStorage.setItem('castalia-upload-project', JSON.stringify(data))
    } catch {
      toast({ title: 'Link inválido', description: 'Este enlace no es válido o expiró', variant: 'destructive' })
    } finally {
      setValidating(false)
    }
  }

  const handleSubmit = () => {
    if (!token.trim()) return
    validateToken(token.trim())
  }

  const handleFiles = async (files: FileList, fase: string) => {
    if (!files.length || !project || !pendingPhase) return
    setUploading(true)
    try {
      const fd = new FormData()
      for (let i = 0; i < files.length; i++) fd.append('files', files[i])
      fd.append('token', token)
      fd.append('fase', fase)
      if (workerName.trim()) fd.append('workerName', workerName.trim())
      if (selectedCategory) fd.append('subProductId', selectedCategory)

      const res = await fetch('/api/upload-token', { method: 'POST', body: fd })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Error al subir')
      }

      const data = await res.json()
      const catName = categories.find(c => c.id === selectedCategory)?.name || 'General'
      toast({ title: `${data.count} foto(s) subida(s)`, description: `${fase === 'antes' ? 'ANTES' : 'DESPUÉS'} — ${catName}` })

      setRecentUploads(prev => [{
        phase: fase === 'antes' ? 'ANTES' : 'DESPUÉS',
        category: catName,
        count: data.count,
        time: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
      }, ...prev].slice(0, 10))
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'No se pudo subir', variant: 'destructive' })
    } finally {
      setUploading(false)
      setPendingPhase(null)
    }
  }

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && pendingPhase) handleFiles(e.target.files, pendingPhase)
    e.target.value = ''
  }

  // ─── Not validated: show token input ───
  if (!validated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#0A0E14' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
          <div className="flex items-center gap-3 mb-8 justify-center">
            <div className="w-11 h-11 rounded-xl overflow-hidden">
              <img src="/logo-sidebar.png" alt="Castalia" className="w-11 h-11 object-contain" />
            </div>
            <div>
              <h1 className="text-[18px] font-bold text-white">CASTALIA PROYECT</h1>
            </div>
          </div>
          <div className="rounded-2xl border p-6" style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(24px)' }}>
            <h2 className="text-[18px] font-bold text-white mb-1">Subir Fotos</h2>
            <p className="text-[13px] mb-5" style={{ color: '#5D7380' }}>Ingresa el link que te enviaron</p>
            <input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Pega el link aquí..."
              className="w-full h-11 text-sm rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-[#4A5568] px-4 mb-3 focus:outline-none focus:border-[#38C5B5]/40"
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
            <button onClick={handleSubmit} disabled={validating || !token.trim()}
              className="w-full h-11 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #38C5B5, #2DA194)' }}>
              {validating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowLeft className="w-4 h-4 rotate-180" />}
              {validating ? 'Verificando...' : 'Entrar'}
            </button>
          </div>
        </motion.div>
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFileChange} />
        <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} multiple />
      </div>
    )
  }

  const selectedCatName = categories.find(c => c.id === selectedCategory)?.name || null

  // ─── Validated: show upload UI ───
  return (
    <div className="min-h-screen" style={{ background: '#F7F8FA' }}>
      {/* Hidden inputs */}
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFileChange} />
      <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} multiple />

      {/* Header */}
      <div className="sticky top-0 z-30 border-b bg-white/90" style={{ borderColor: '#E2E6EB', backdropFilter: 'blur(16px)' }}>
        <div className="max-w-lg mx-auto px-4 h-[64px] flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0">
            <img src="/logo-sidebar.png" alt="Castalia" className="w-9 h-9 object-contain" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-[16px] font-bold truncate" style={{ color: '#1A2332' }}>{project?.projectName}</h1>
            {project?.clientName && <p className="text-[12px]" style={{ color: '#5D7380' }}>{project.clientName}</p>}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* Worker name */}
        <div>
          <label className="text-[12px] font-semibold uppercase tracking-wider block mb-1.5" style={{ color: '#5D7380' }}>Tu nombre</label>
          <input
            value={workerName}
            onChange={(e) => setWorkerName(e.target.value)}
            placeholder="Opcional — para identificar quién tomó las fotos"
            className="w-full h-10 text-sm rounded-xl bg-white border px-3 focus:outline-none focus:border-[#38C5B5]/40"
            style={{ borderColor: '#E2E6EB', color: '#1A2332' }}
          />
        </div>

        {/* Category selector */}
        <div>
          <label className="text-[12px] font-semibold uppercase tracking-wider block mb-1.5" style={{ color: '#5D7380' }}>
            Categoría
          </label>
          {categories.length > 0 ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                className="w-full h-11 px-3 rounded-xl bg-white border flex items-center justify-between gap-2 focus:outline-none"
                style={{ borderColor: selectedCategory ? '#38C5B5' : '#E2E6EB' }}>
                <div className="flex items-center gap-2 min-w-0">
                  <Folder className="w-4 h-4 shrink-0" style={{ color: selectedCategory ? '#38C5B5' : '#ADB5B7' }} />
                  <span className="text-sm truncate" style={{ color: selectedCatName ? '#1A2332' : '#ADB5B7' }}>
                    {selectedCatName || 'Seleccionar categoría...'}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 shrink-0" style={{ color: '#ADB5B7', transform: showCategoryDropdown ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </button>
              <AnimatePresence>
                {showCategoryDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="absolute top-full left-0 right-0 mt-1 rounded-xl border bg-white shadow-lg z-20 overflow-hidden"
                    style={{ borderColor: '#E2E6EB', maxHeight: '200px', overflowY: 'auto' }}>
                    <button
                      type="button"
                      onClick={() => { setSelectedCategory(null); setShowCategoryDropdown(false) }}
                      className="w-full px-3 py-3 text-left text-sm flex items-center gap-2 border-b"
                      style={{ color: '#5D7380', borderColor: '#F3F4F6' }}>
                      <Folder className="w-4 h-4" style={{ color: '#ADB5B7' }} />
                      Sin categoría (General)
                    </button>
                    {categories.map(cat => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => { setSelectedCategory(cat.id); setShowCategoryDropdown(false) }}
                        className="w-full px-3 py-3 text-left text-sm flex items-center justify-between gap-2 border-b last:border-0"
                        style={{ color: '#1A2332', borderColor: '#F3F4F6' }}>
                        <div className="flex items-center gap-2 min-w-0">
                          <Folder className="w-4 h-4 shrink-0" style={{ color: '#38C5B5' }} />
                          <span className="truncate">{cat.name}</span>
                        </div>
                        <span className="text-[11px] shrink-0 px-1.5 py-0.5 rounded" style={{ background: '#F0FDFA', color: '#2DA194' }}>
                          {cat.photoCount}
                        </span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: '#FFF7ED', border: '1px solid #FED7AA' }}>
              <AlertCircle className="w-4 h-4 shrink-0" style={{ color: '#F0A030' }} />
              <p className="text-[12px]" style={{ color: '#92400E' }}>No hay categorías creadas. Las fotos se guardarán en General.</p>
            </div>
          )}
        </div>

        {/* Phase buttons */}
        <div>
          <label className="text-[12px] font-semibold uppercase tracking-wider block mb-2" style={{ color: '#5D7380' }}>
            Tomar foto
          </label>
          <div className="grid grid-cols-2 gap-3">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => { setPendingPhase('antes'); cameraRef.current?.click() }}
              disabled={uploading}
              className="rounded-2xl p-5 text-center border-2 transition-all disabled:opacity-50"
              style={{ borderColor: '#F0A030', background: 'linear-gradient(135deg, #FFF7ED, #FFEDD5)' }}>
              <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: '#F0A030' }}>
                <Camera className="w-5 h-5 text-white" />
              </div>
              <p className="text-[15px] font-bold" style={{ color: '#92400E' }}>ANTES</p>
              <p className="text-[11px] mt-0.5" style={{ color: '#B45309' }}>Cámara</p>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => { setPendingPhase('despues'); cameraRef.current?.click() }}
              disabled={uploading}
              className="rounded-2xl p-5 text-center border-2 transition-all disabled:opacity-50"
              style={{ borderColor: '#2DA194', background: 'linear-gradient(135deg, #F0FDFA, #CCFBF1)' }}>
              <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #38C5B5, #2DA194)' }}>
                <Camera className="w-5 h-5 text-white" />
              </div>
              <p className="text-[15px] font-bold" style={{ color: '#115E59' }}>DESPUÉS</p>
              <p className="text-[11px] mt-0.5" style={{ color: '#0F766E' }}>Cámara</p>
            </motion.button>
          </div>
        </div>

        {/* Gallery buttons */}
        <div>
          <label className="text-[12px] font-semibold uppercase tracking-wider block mb-2" style={{ color: '#5D7380' }}>
            Elegir de galería
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => { setPendingPhase('antes'); galleryRef.current?.click() }}
              disabled={uploading}
              className="h-11 rounded-xl text-[13px] font-semibold border flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ borderColor: '#F0A030', color: '#92400E' }}>
              <ImagePlus className="w-4 h-4" />
              Galería ANTES
            </button>
            <button
              onClick={() => { setPendingPhase('despues'); galleryRef.current?.click() }}
              disabled={uploading}
              className="h-11 rounded-xl text-[13px] font-semibold border flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ borderColor: '#2DA194', color: '#115E59' }}>
              <ImagePlus className="w-4 h-4" />
              Galería DESPUÉS
            </button>
          </div>
        </div>

        {/* Selected category indicator */}
        {selectedCatName && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: '#F0FDFA', border: '1px solid #99F6E4' }}>
            <Folder className="w-4 h-4" style={{ color: '#38C5B5' }} />
            <span className="text-[12px] font-semibold" style={{ color: '#115E59' }}>
              Fotos se guardarán en: <strong>{selectedCatName}</strong>
            </span>
          </div>
        )}

        {/* Uploading indicator */}
        {uploading && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-center gap-3 p-4 rounded-xl" style={{ background: '#F0FDFA', border: '1px solid #99F6E4' }}>
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#38C5B5' }} />
            <span className="text-sm font-semibold" style={{ color: '#115E59' }}>Subiendo fotos...</span>
          </motion.div>
        )}

        {/* Recent uploads */}
        {recentUploads.length > 0 && (
          <div>
            <h3 className="text-[12px] font-semibold uppercase tracking-wider mb-3" style={{ color: '#5D7380' }}>Subidas recientes</h3>
            <div className="space-y-2">
              {recentUploads.map((u, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-between p-3 rounded-xl bg-white border" style={{ borderColor: '#E8EBF0' }}>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: u.phase === 'ANTES' ? '#FFF7ED' : '#F0FDFA' }}>
                      <Check className="w-4 h-4" style={{ color: u.phase === 'ANTES' ? '#F0A030' : '#2DA194' }} />
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold" style={{ color: '#1A2332' }}>{u.count} foto(s) — {u.phase}</p>
                      <p className="text-[11px]" style={{ color: '#ADB5B7' }}>{u.category} · {u.time}</p>
                    </div>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded-md font-bold text-white" style={{ background: u.phase === 'ANTES' ? '#F0A030' : '#2DA194' }}>
                    {u.phase}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="h-8" />
    </div>
  )
}