'use client'

import { useEffect, useState, useRef, useCallback, Suspense } from 'react'
import { Camera, ImagePlus, Upload, CheckCircle, AlertCircle, Loader2, ArrowLeft, X, ChevronDown } from 'lucide-react'
import { useSearchParams } from 'next/navigation'

interface ProjectInfo {
  projectId: string
  projectName: string
  clientName: string | null
}

function UploadContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''

  const [project, setProject] = useState<ProjectInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [workerName, setWorkerName] = useState('')
  const [fase, setFase] = useState<'antes' | 'despues' | ''>('')
  const [showFaseDropdown, setShowFaseDropdown] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploaded, setUploaded] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadError, setUploadError] = useState('')

  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)

  // Validate token on mount
  useEffect(() => {
    if (!token) { setError('Link inválido: no se encontró token'); setLoading(false); return }
    fetch(`/api/upload-token?token=${token}`)
      .then(r => {
        if (!r.ok) return r.json().then(e => { throw new Error(e.error || 'Link inválido') })
        return r.json()
      })
      .then(data => { setProject(data); setLoading(false) })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [token])

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return
    const newFiles = Array.from(files).filter(f => f.type.startsWith('image/'))
    setSelectedFiles(prev => [...prev, ...newFiles])
    // Generate previews
    newFiles.forEach(file => {
      const reader = new FileReader()
      reader.onload = () => setPreviews(prev => [...prev, reader.result as string])
      reader.readAsDataURL(file)
    })
  }, [])

  const removeFile = (idx: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== idx))
    setPreviews(prev => prev.filter((_, i) => i !== idx))
  }

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return
    setUploading(true)
    setUploadError('')

    try {
      const formData = new FormData()
      formData.append('token', token)
      if (fase) formData.append('fase', fase)
      if (workerName.trim()) formData.append('workerName', workerName.trim())
      selectedFiles.forEach(f => formData.append('files', f))

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90))
      }, 300)

      const res = await fetch('/api/upload-token', {
        method: 'POST',
        body: formData,
      })

      clearInterval(progressInterval)

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Error del servidor (${res.status})`)
      }

      setUploadProgress(100)
      setTimeout(() => { setUploaded(true); setUploading(false) }, 500)
    } catch (err: any) {
      setUploadError(err.message || 'Error al subir las fotos')
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const handleReset = () => {
    setSelectedFiles([])
    setPreviews([])
    setUploaded(false)
    setUploadProgress(0)
    setUploadError('')
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F8FAFB' }}>
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" style={{ color: '#38C5B5' }} />
          <p className="text-sm font-semibold" style={{ color: '#5D7380' }}>Verificando link...</p>
        </div>
      </div>
    )
  }

  // Error state (invalid/expired link)
  if (error || !project) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#F8FAFB' }}>
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: '#FEF2F2' }}>
            <AlertCircle className="w-8 h-8" style={{ color: '#EF4444' }} />
          </div>
          <h1 className="text-xl font-bold mb-2" style={{ color: '#1A2332' }}>Link no válido</h1>
          <p className="text-sm mb-6" style={{ color: '#5D7380' }}>{error || 'Este enlace ha expirado o no existe.'}</p>
          <p className="text-xs" style={{ color: '#ADB5B7' }}>Solicita un nuevo enlace al administrador del proyecto.</p>
        </div>
      </div>
    )
  }

  // Success state
  if (uploaded) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#F8FAFB' }}>
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: '#ECFDF5' }}>
            <CheckCircle className="w-10 h-10" style={{ color: '#10B981' }} />
          </div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: '#1A2332' }}>Fotos subidas</h1>
          <p className="text-sm mb-1" style={{ color: '#5D7380' }}>{selectedFiles.length} foto(s) guardada(s) correctamente</p>
          <p className="text-sm mb-6" style={{ color: '#38C5B5', fontWeight: 600 }}>{project.projectName}</p>
          <button onClick={handleReset}
            className="h-12 px-8 rounded-xl text-sm font-bold text-white active:opacity-80"
            style={{ background: '#38C5B5' }}>
            Subir más fotos
          </button>
        </div>
      </div>
    )
  }

  // Main upload form
  return (
    <div className="min-h-screen" style={{ background: '#F8FAFB' }}>
      {/* Header */}
      <div className="sticky top-0 z-20 px-4 py-3 border-b" style={{ background: 'white', borderColor: '#E2E6EB' }}>
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#F0FDFA' }}>
            <Upload className="w-5 h-5" style={{ color: '#38C5B5' }} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-[15px] font-bold truncate" style={{ color: '#1A2332' }}>Subir Fotos</h1>
            <p className="text-[12px] truncate" style={{ color: '#5D7380' }}>{project.projectName}</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Worker name */}
        <div>
          <label className="block text-[12px] font-semibold mb-1.5" style={{ color: '#5D7380' }}>
            Tu nombre (opcional)
          </label>
          <input
            value={workerName}
            onChange={e => setWorkerName(e.target.value)}
            placeholder="Ej: Juan Pérez"
            className="w-full h-11 px-4 rounded-xl border text-[14px] focus:outline-none transition-colors"
            style={{ borderColor: '#E2E6EB', background: 'white', color: '#1A2332' }}
          />
        </div>

        {/* Phase selector */}
        <div className="relative">
          <label className="block text-[12px] font-semibold mb-1.5" style={{ color: '#5D7380' }}>
            Fase
          </label>
          <button
            onClick={() => setShowFaseDropdown(!showFaseDropdown)}
            className="w-full h-11 px-4 rounded-xl border text-[14px] text-left flex items-center justify-between focus:outline-none"
            style={{ borderColor: '#E2E6EB', background: 'white', color: fase ? '#1A2332' : '#ADB5B7' }}
          >
            {fase === 'antes' ? 'ANTES' : fase === 'despues' ? 'DESPUÉS' : 'Seleccionar fase...'}
            <ChevronDown className="w-4 h-4" style={{ color: '#ADB5B7' }} />
          </button>
          {showFaseDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 rounded-xl border bg-white shadow-lg z-10 overflow-hidden">
              <button onClick={() => { setFase('antes'); setShowFaseDropdown(false) }}
                className="w-full px-4 py-3 text-left text-[14px] font-semibold active:bg-gray-50" style={{ color: '#1A2332' }}>
                ANTES
              </button>
              <button onClick={() => { setFase('despues'); setShowFaseDropdown(false) }}
                className="w-full px-4 py-3 text-left text-[14px] font-semibold active:bg-gray-50 border-t" style={{ color: '#1A2332', borderColor: '#E2E6EB' }}>
                DESPUÉS
              </button>
            </div>
          )}
        </div>

        {/* Photo previews */}
        {previews.length > 0 && (
          <div>
            <label className="block text-[12px] font-semibold mb-2" style={{ color: '#5D7380' }}>
              {previews.length} foto(s) seleccionada(s)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {previews.map((src, idx) => (
                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border" style={{ borderColor: '#E2E6EB' }}>
                  <img src={src} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => removeFile(idx)}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center">
                    <X className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload buttons (camera + gallery) */}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => cameraRef.current?.click()}
            className="h-14 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 active:bg-gray-50"
            style={{ borderColor: '#38C5B5', color: '#38C5B5' }}>
            <Camera className="w-5 h-5" />
            <span className="text-[12px] font-bold">Cámara</span>
          </button>
          <button onClick={() => galleryRef.current?.click()}
            className="h-14 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 active:bg-gray-50"
            style={{ borderColor: '#38C5B5', color: '#38C5B5' }}>
            <ImagePlus className="w-5 h-5" />
            <span className="text-[12px] font-bold">Galería</span>
          </button>
        </div>

        {/* Hidden file inputs */}
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
          onChange={e => handleFileSelect(e.target.files)} />
        <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden"
          onChange={e => handleFileSelect(e.target.files)} />

        {/* Upload error */}
        {uploadError && (
          <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
            <AlertCircle className="w-4 h-4 shrink-0" style={{ color: '#EF4444' }} />
            <p className="text-[13px]" style={{ color: '#991B1B' }}>{uploadError}</p>
          </div>
        )}

        {/* Upload progress */}
        {uploading && (
          <div className="p-4 rounded-xl" style={{ background: '#F0FDFA', border: '1px solid #99F6E4' }}>
            <div className="flex items-center gap-3 mb-2">
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#38C5B5' }} />
              <span className="text-[13px] font-semibold" style={{ color: '#115E59' }}>Subiendo {selectedFiles.length} foto(s)...</span>
            </div>
            <div className="w-full h-2 rounded-full" style={{ background: '#CCFBF1' }}>
              <div className="h-2 rounded-full transition-all duration-300" style={{ background: '#38C5B5', width: `${uploadProgress}%` }} />
            </div>
          </div>
        )}

        {/* Upload button */}
        {selectedFiles.length > 0 && !uploading && (
          <button onClick={handleUpload}
            className="w-full h-14 rounded-xl text-[15px] font-bold text-white active:opacity-80 transition-opacity"
            style={{ background: '#38C5B5' }}>
            Subir {selectedFiles.length} foto(s)
          </button>
        )}

        {/* Footer hint */}
        <p className="text-center text-[11px] pt-4 pb-8" style={{ color: '#ADB5B7' }}>
          Castalia Proyect — Documentación visual
        </p>
      </div>
    </div>
  )
}

export default function UploadPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F8FAFB' }}>
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" style={{ color: '#38C5B5' }} />
          <p className="text-sm font-semibold" style={{ color: '#5D7380' }}>Cargando...</p>
        </div>
      </div>
    }>
      <UploadContent />
    </Suspense>
  )
}
