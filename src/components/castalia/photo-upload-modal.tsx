'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera,
  X,
  ImagePlus,
  ArrowRight,
  ArrowLeft,
  Check,
  MapPin,
  Send,
  ImageIcon,
  RotateCcw,
  FlipHorizontal2,
  Zap,
  Sparkles,
  Hammer,
  Sofa,
  BedDouble,
  ChefHat,
  Bath,
  DoorOpen,
  Trees,
  Stairs,
  Shirt,
  Building2,
  Lamp,
  Briefcase,
  Home,
} from 'lucide-react';
import { useAppStore } from '@/store/app-store';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';

/* ═══════════════════════════════════════════════════════════════
   LOCALES PREDETERMINADOS
   ═══════════════════════════════════════════════════════════════ */

const LOCALES = [
  { id: 'sala',              label: 'Sala',               icon: Sofa },
  { id: 'comedor',           label: 'Comedor',            icon: ChefHat },
  { id: 'cocina',            label: 'Cocina',             icon: ChefHat },
  { id: 'dormitorio',        label: 'Dormitorio',         icon: BedDouble },
  { id: 'bano',              label: 'Baño',               icon: Bath },
  { id: 'lobby',             label: 'Lobby / Entrada',    icon: DoorOpen },
  { id: 'oficina',           label: 'Oficina',            icon: Briefcase },
  { id: 'terraza',           label: 'Terraza',            icon: Trees },
  { id: 'jardin',            label: 'Jardín',             icon: Trees },
  { id: 'escaleras',         label: 'Escaleras',          icon: Stairs },
  { id: 'closet',            label: 'Closet / Vestidor',  icon: Shirt },
  { id: 'fachada',           label: 'Fachada',            icon: Building2 },
  { id: 'estacionamiento',   label: 'Estacionamiento',   icon: Home },
  { id: 'area_servicio',     label: 'Área de Servicio',   icon: Hammer },
  { id: 'sala_tv',           label: 'Sala de TV',         icon: Lamp },
  { id: 'bar',               label: 'Bar',                icon: Sparkles },
  { id: 'gimnasio',          label: 'Gimnasio',           icon: Home },
  { id: 'otro',              label: 'Otro',               icon: Home },
] as const;

/* ═══════════════════════════════════════════════════════════════ */

type FaseFoto = 'antes' | 'despues' | null;
type Step = 1 | 2;

type ViewMode = 'menu' | 'camera' | 'gallery';

interface CapturedPhoto {
  dataUrl: string;
  blob: Blob;
  file: File;
}

export default function PhotoUploadModal() {
  const { uploadModalOpen, uploadProjectId, closeUploadModal, currentUser } = useAppStore();
  const { toast } = useToast();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── State ──
  const [step, setStep] = useState<Step>(1);
  const [viewMode, setViewMode] = useState<ViewMode>('menu');
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState('');
  const [fase, setFase] = useState<FaseFoto>(null);
  const [local, setLocal] = useState<string>('');
  const [localSearch, setLocalSearch] = useState('');
  const [showLocalPicker, setShowLocalPicker] = useState(false);
  const [caption, setCaption] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [flashVisible, setFlashVisible] = useState(false);

  // ── Camera control ──
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async (facing: 'environment' | 'user') => {
    stopCamera();
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setViewMode('camera');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'No se pudo acceder a la cámara';
      setCameraError(msg);
      // Fallback to file input on desktop
      fileInputRef.current?.click();
    }
  }, [stopCamera]);

  // Cleanup camera on unmount / dialog close
  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  const toggleCamera = () => {
    const next = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(next);
    startCamera(next);
  };

  // ── Capture photo from live camera ──
  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    // Flash effect
    setFlashVisible(true);
    setTimeout(() => setFlashVisible(false), 150);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      const file = new File([blob], `foto-${Date.now()}.jpg`, { type: 'image/jpeg' });
      setPhotos((prev) => [...prev, { dataUrl, blob, file }]);
      setViewMode('menu');
      stopCamera();
    }, 'image/jpeg', 0.85);
  }, [stopCamera]);

  // ── Gallery handling ──
  const handleGalleryFiles = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      const dataUrl = URL.createObjectURL(file);
      setPhotos((prev) => [...prev, { dataUrl, blob: file, file }]);
    });
    e.target.value = '';
  }, []);

  const removePhoto = (index: number) => {
    setPhotos((prev) => {
      const next = [...prev];
      URL.revokeObjectURL(next[index].dataUrl);
      next.splice(index, 1);
      return next;
    });
  };

  const filteredLocales = LOCALES.filter((l) =>
    l.label.toLowerCase().includes(localSearch.toLowerCase())
  );
  const selectedLocalObj = LOCALES.find((l) => l.id === local);

  // ── Reset ──
  const resetForm = useCallback(() => {
    setStep(1);
    setViewMode('menu');
    setPhotos([]);
    setFase(null);
    setLocal('');
    setLocalSearch('');
    setShowLocalPicker(false);
    setCaption('');
    setIsUrgent(false);
    setIsSubmitting(false);
    setCameraError('');
    stopCamera();
  }, [stopCamera]);

  const handleClose = () => {
    stopCamera();
    closeUploadModal();
    setTimeout(resetForm, 200);
  };

  // ── Submit ──
  const handleSubmit = async () => {
    if (photos.length === 0) return;
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      photos.forEach((p) => formData.append('files', p.file));
      formData.append('projectId', uploadProjectId || '');
      formData.append('caption', caption);
      formData.append('tags', JSON.stringify([
        ...(fase ? [fase] : []),
        local ? `local:${local}` : [],
      ]));
      formData.append('isUrgent', String(isUrgent));
      if (currentUser?.id) formData.append('uploadedBy', currentUser.id);

      const res = await fetch('/api/photos', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload failed');

      toast({
        title: 'Fotos guardadas',
        description: `${photos.length} foto(s) como ${fase === 'antes' ? 'ANTES' : fase === 'despues' ? 'DESPUÉS' : 'General'} — ${selectedLocalObj?.label || 'Sin local'}`,
      });
      handleClose();
    } catch {
      toast({ title: 'Error', description: 'No se pudieron guardar las fotos', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceed = photos.length > 0;
  const canSave = fase !== null && local !== '';

  return (
    <Dialog open={uploadModalOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-lg max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl">
        {/* ── Hidden canvas for capture ── */}
        <canvas ref={canvasRef} className="hidden" />
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={handleGalleryFiles}
        />

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <div>
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <Camera className="h-5 w-5 text-primary" />
              {viewMode === 'camera'
                ? 'Cámara'
                : step === 1
                  ? 'Tomar Foto'
                  : 'Clasificar Fotos'}
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-0.5">
              {viewMode === 'camera'
                ? 'Apunta y toma la foto'
                : step === 1
                  ? `${photos.length} foto(s) capturada(s)`
                  : 'Indica la fase y el local'}
            </p>
          </div>
          {viewMode === 'camera' ? (
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-white" onClick={() => { stopCamera(); setViewMode('menu'); }}>
              <X className="h-4 w-4" />
            </Button>
          ) : (
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* ── Step Indicator (hide in camera view) ── */}
        {viewMode !== 'camera' && (
          <div className="px-6 pb-3">
            <div className="flex items-center gap-2">
              <div className={`h-1 flex-1 rounded-full transition-colors duration-300 ${step >= 1 ? 'bg-primary' : 'bg-muted'}`} />
              <div className={`h-1 flex-1 rounded-full transition-colors duration-300 ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
            </div>
          </div>
        )}

        <div className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait">
            {/* ═══════════════════ CAMERA VIEWFINDER ═══════════════════ */}
            {viewMode === 'camera' && (
              <motion.div
                key="camera"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col bg-black"
              >
                {/* Camera error */}
                {cameraError && (
                  <div className="flex-1 flex items-center justify-center text-white/70 text-sm p-6 text-center">
                    {cameraError}
                  </div>
                )}

                {/* Video feed */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="flex-1 object-cover w-full"
                  style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
                />

                {/* Flash overlay */}
                <AnimatePresence>
                  {flashVisible && (
                    <motion.div
                      initial={{ opacity: 0.8 }}
                      animate={{ opacity: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="absolute inset-0 bg-white z-30 pointer-events-none"
                    />
                  )}
                </AnimatePresence>

                {/* Camera controls overlay */}
                <div className="relative bg-black/80 px-6 py-5 flex items-center justify-between">
                  {/* Switch camera */}
                  <button
                    onClick={toggleCamera}
                    className="h-11 w-11 rounded-full bg-white/15 flex items-center justify-center active:scale-90 transition-transform"
                  >
                    <RotateCcw className="h-5 w-5 text-white" />
                  </button>

                  {/* Capture button */}
                  <button
                    onClick={capturePhoto}
                    className="h-[72px] w-[72px] rounded-full border-4 border-white/80 bg-white/20 flex items-center justify-center active:scale-90 transition-transform"
                  >
                    <div className="h-[56px] w-[56px] rounded-full bg-white" />
                  </button>

                  {/* Close camera */}
                  <button
                    onClick={() => { stopCamera(); setViewMode('menu'); }}
                    className="h-11 w-11 rounded-full bg-white/15 flex items-center justify-center active:scale-90 transition-transform"
                  >
                    <X className="h-5 w-5 text-white" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ═══════════════════ STEP 1: TAKE / SELECT PHOTOS ═══════════════════ */}
            {viewMode !== 'camera' && step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="h-full flex flex-col"
              >
                <ScrollArea className="flex-1 px-6">
                  <div className="pb-6 space-y-5">
                    {/* Big Camera Button — PRIMARY ACTION */}
                    <button
                      onClick={() => startCamera(facingMode)}
                      className="w-full flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 p-8 transition-all hover:border-primary/70 hover:bg-primary/10 active:scale-[0.98]"
                    >
                      <div className="h-16 w-16 rounded-full bg-primary/15 flex items-center justify-center">
                        <Camera className="h-8 w-8 text-primary" />
                      </div>
                      <span className="text-base font-bold text-foreground">Tomar Foto</span>
                      <span className="text-xs text-muted-foreground">Abre la cámara y captura directamente</span>
                    </button>

                    {/* Divider */}
                    <div className="flex items-center gap-3">
                      <div className="h-px flex-1 bg-border" />
                      <span className="text-xs text-muted-foreground font-medium">o selecciona de galería</span>
                      <div className="h-px flex-1 bg-border" />
                    </div>

                    {/* Gallery button */}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full flex items-center justify-center gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:bg-muted/50 active:scale-[0.98]"
                    >
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        <ImagePlus className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <span className="text-sm font-semibold text-foreground">Elegir de Galería</span>
                    </button>

                    {/* Photo previews */}
                    {photos.length > 0 && (
                      <div className="space-y-3">
                        <Label className="text-sm font-semibold text-foreground">
                          {photos.length} foto(s) lista(s)
                        </Label>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                          <AnimatePresence>
                            {photos.map((p, i) => (
                              <motion.div
                                key={i}
                                layout
                                initial={{ opacity: 0, scale: 0.85 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.85 }}
                                className="relative group aspect-square rounded-xl overflow-hidden border bg-muted"
                              >
                                <img src={p.dataUrl} alt="" className="object-cover w-full h-full" />
                                <button
                                  onClick={() => removePhoto(i)}
                                  className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </motion.div>
                            ))}
                          </AnimatePresence>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>

                {/* Footer Step 1 */}
                <div className="px-6 py-4 border-t bg-card/80 backdrop-blur-sm flex items-center justify-between gap-3">
                  <Button variant="ghost" onClick={handleClose} className="text-sm rounded-lg">
                    Cancelar
                  </Button>
                  <Button
                    onClick={() => setStep(2)}
                    disabled={!canProceed}
                    className="btn-castalia gap-2 h-10 px-5 text-sm font-semibold rounded-lg"
                  >
                    Clasificar
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ═══════════════════ STEP 2: CLASSIFY ═══════════════════ */}
            {viewMode !== 'camera' && step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full flex flex-col"
              >
                <ScrollArea className="flex-1 px-6">
                  <div className="pb-6 space-y-6">
                    {/* Mini preview strip */}
                    <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
                      {photos.slice(0, 5).map((p, i) => (
                        <div key={i} className="h-14 w-14 rounded-lg overflow-hidden border shrink-0">
                          <img src={p.dataUrl} alt="" className="object-cover w-full h-full" />
                        </div>
                      ))}
                      {photos.length > 5 && (
                        <div className="h-14 w-14 rounded-lg border bg-muted flex items-center justify-center shrink-0">
                          <span className="text-xs font-semibold text-muted-foreground">+{photos.length - 5}</span>
                        </div>
                      )}
                    </div>

                    {/* ── FASE: ANTES / DESPUÉS ── */}
                    <div>
                      <Label className="text-base font-semibold text-foreground block mb-3">Fase de la foto</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => setFase(fase === 'antes' ? null : 'antes')}
                          className={`relative flex flex-col items-center justify-center gap-2 p-5 rounded-xl border-2 transition-all duration-200 ${
                            fase === 'antes'
                              ? 'border-amber-500 bg-amber-500/10 shadow-md shadow-amber-500/10'
                              : 'border-border bg-card hover:border-amber-500/40 hover:bg-amber-500/5'
                          }`}
                        >
                          <div className={`h-11 w-11 rounded-full flex items-center justify-center transition-colors ${
                            fase === 'antes' ? 'bg-amber-500 text-white' : 'bg-amber-500/10 text-amber-600'
                          }`}>
                            <ImageIcon className="h-5 w-5" />
                          </div>
                          <span className={`text-sm font-bold tracking-wide ${fase === 'antes' ? 'text-amber-700' : 'text-foreground'}`}>
                            ANTES
                          </span>
                          {fase === 'antes' && (
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute top-2 right-2 h-5 w-5 rounded-full bg-amber-500 flex items-center justify-center">
                              <Check className="h-3 w-3 text-white" strokeWidth={3} />
                            </motion.div>
                          )}
                        </button>

                        <button
                          onClick={() => setFase(fase === 'despues' ? null : 'despues')}
                          className={`relative flex flex-col items-center justify-center gap-2 p-5 rounded-xl border-2 transition-all duration-200 ${
                            fase === 'despues'
                              ? 'border-emerald-500 bg-emerald-500/10 shadow-md shadow-emerald-500/10'
                              : 'border-border bg-card hover:border-emerald-500/40 hover:bg-emerald-500/5'
                          }`}
                        >
                          <div className={`h-11 w-11 rounded-full flex items-center justify-center transition-colors ${
                            fase === 'despues' ? 'bg-emerald-500 text-white' : 'bg-emerald-500/10 text-emerald-600'
                          }`}>
                            <Sparkles className="h-5 w-5" />
                          </div>
                          <span className={`text-sm font-bold tracking-wide ${fase === 'despues' ? 'text-emerald-700' : 'text-foreground'}`}>
                            DESPUÉS
                          </span>
                          {fase === 'despues' && (
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute top-2 right-2 h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center">
                              <Check className="h-3 w-3 text-white" strokeWidth={3} />
                            </motion.div>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* ── NOMBRE DEL LOCAL ── */}
                    <div>
                      <Label className="text-base font-semibold text-foreground block mb-3">Local / Estancia</Label>

                      {local && selectedLocalObj && (
                        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-3">
                          <div className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-primary/10 border border-primary/20">
                            {(() => { const Icon = selectedLocalObj.icon; return <Icon className="h-5 w-5 text-primary" />; })()}
                            <span className="text-sm font-semibold text-foreground">{selectedLocalObj.label}</span>
                            <button onClick={() => setLocal('')} className="h-5 w-5 rounded-full bg-muted flex items-center justify-center hover:bg-destructive/10 transition-colors">
                              <X className="h-3 w-3 text-muted-foreground" />
                            </button>
                          </div>
                        </motion.div>
                      )}

                      <div className="relative">
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Buscar local..."
                            value={localSearch}
                            onChange={(e) => { setLocalSearch(e.target.value); setShowLocalPicker(true); }}
                            onFocus={() => setShowLocalPicker(true)}
                            className="pl-9 h-11 text-sm rounded-xl"
                          />
                        </div>

                        <AnimatePresence>
                          {showLocalPicker && (
                            <motion.div
                              initial={{ opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -4 }}
                              className="absolute z-50 top-full left-0 right-0 mt-1.5 bg-card border rounded-xl shadow-lg max-h-64 overflow-hidden"
                            >
                              <ScrollArea className="max-h-64">
                                <div className="p-2 grid grid-cols-2 gap-1">
                                  {filteredLocales.map((loc) => {
                                    const Icon = loc.icon;
                                    const isSelected = local === loc.id;
                                    return (
                                      <button
                                        key={loc.id}
                                        onClick={() => { setLocal(loc.id); setShowLocalPicker(false); setLocalSearch(''); }}
                                        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-colors ${
                                          isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                                        }`}
                                      >
                                        <Icon className="h-4 w-4 shrink-0" />
                                        <span className="text-sm font-medium truncate">{loc.label}</span>
                                        {isSelected && <Check className="h-3.5 w-3.5 ml-auto shrink-0" />}
                                      </button>
                                    );
                                  })}
                                </div>
                              </ScrollArea>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* ── Caption ── */}
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground block mb-2">Notas (opcional)</Label>
                      <Input
                        placeholder="Agrega una nota..."
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        className="h-10 text-sm rounded-xl"
                      />
                    </div>

                    {/* ── Urgent toggle ── */}
                    <label className="flex items-center gap-3 cursor-pointer">
                      <div
                        className={`h-5 w-9 rounded-full p-0.5 transition-colors duration-200 ${isUrgent ? 'bg-red-500' : 'bg-muted'}`}
                        onClick={() => setIsUrgent(!isUrgent)}
                      >
                        <motion.div
                          className="h-4 w-4 rounded-full bg-white shadow-sm"
                          animate={{ x: isUrgent ? 16 : 0 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        />
                      </div>
                      <span className="text-sm font-medium text-red-600">Marcar como urgente</span>
                    </label>
                  </div>
                </ScrollArea>

                {/* Footer Step 2 */}
                <div className="px-6 py-4 border-t bg-card/80 backdrop-blur-sm flex items-center justify-between gap-3">
                  <Button
                    variant="ghost"
                    onClick={() => setStep(1)}
                    className="gap-2 text-sm rounded-lg"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Fotos
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={!canSave || isSubmitting}
                    className="btn-castalia gap-2 h-10 px-5 text-sm font-semibold rounded-lg min-w-[140px]"
                  >
                    {isSubmitting ? (
                      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                        <Send className="h-4 w-4" />
                      </motion.div>
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    {isSubmitting ? 'Guardando...' : 'Guardar'}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}