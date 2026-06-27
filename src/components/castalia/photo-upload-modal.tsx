'use client';

import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera, X, ImagePlus, ArrowRight, ArrowLeft, Check, Send, GripVertical, Pencil, Type, Eraser, Trash2,
} from 'lucide-react';
import { useAppStore } from '@/store/app-store';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';

type Fase = 'antes' | 'despues' | null;
type Step = 1 | 2;
type DrawTool = 'pen' | 'eraser' | null;

interface PhotoItem {
  id: string;
  dataUrl: string;
  file: File;
  note: string;
  place: string;
}

export default function PhotoUploadModal() {
  const { uploadModalOpen, uploadProjectId, closeUploadModal, currentUser } = useAppStore();
  const { toast } = useToast();

  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawImgRef = useRef<HTMLImageElement | null>(null);

  const [step, setStep] = useState<Step>(1);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [fase, setFase] = useState<Fase>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [editingPhotoId, setEditingPhotoId] = useState<string | null>(null);
  // Drawing state
  const [drawMode, setDrawMode] = useState(false);
  const [drawTool, setDrawTool] = useState<DrawTool>('pen');
  const [drawColor, setDrawColor] = useState('#ef4444');
  const [isDrawing, setIsDrawing] = useState(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  const addFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      const id = `p-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const dataUrl = URL.createObjectURL(file);
      setPhotos((prev) => [...prev, { id, dataUrl, file, note: '', place: '' }]);
    });
  }, []);

  const handleCamera = (e: React.ChangeEvent<HTMLInputElement>) => { addFiles(e.target.files); e.target.value = ''; };
  const handleGallery = (e: React.ChangeEvent<HTMLInputElement>) => { addFiles(e.target.files); e.target.value = ''; };

  const removePhoto = (id: string) => {
    setPhotos((prev) => {
      const p = prev.find(x => x.id === id);
      if (p) URL.revokeObjectURL(p.dataUrl);
      return prev.filter(x => x.id !== id);
    });
  };

  const updatePhoto = (id: string, data: Partial<PhotoItem>) => {
    setPhotos((prev) => prev.map(p => p.id === id ? { ...p, ...data } : p));
  };

  // Drag reorder
  const handleDragStart = (idx: number) => setDragIdx(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    setPhotos((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIdx, 1);
      next.splice(idx, 0, moved);
      return next;
    });
    setDragIdx(idx);
  };
  const handleDragEnd = () => setDragIdx(null);

  // Mobile touch reorder
  const [touchReorder, setTouchReorder] = useState<string | null>(null);
  const handleTouchMove = (e: React.TouchEvent, photoId: string) => {
    if (!touchReorder) return;
    const touch = e.touches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const targetId = el?.closest('[data-photo-id]')?.getAttribute('data-photo-id');
    if (targetId && targetId !== photoId) {
      setPhotos((prev) => {
        const arr = [...prev];
        const fromIdx = arr.findIndex(p => p.id === photoId);
        const toIdx = arr.findIndex(p => p.id === targetId);
        if (fromIdx < 0 || toIdx < 0) return prev;
        const [moved] = arr.splice(fromIdx, 1);
        arr.splice(toIdx, 0, moved);
        return arr;
      });
    }
  };

  // Drawing
  const openDraw = (photoId: string) => {
    setEditingPhotoId(photoId);
    setDrawMode(true);
    setDrawTool('pen');
  };

  const initDrawCanvas = (img: HTMLImageElement) => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
  };

  const handleDrawStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDrawing(true);
    const pos = getDrawPos(e);
    lastPos.current = pos;
  };

  const handleDrawMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !lastPos.current) return;
    e.preventDefault();
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const pos = getDrawPos(e);

    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);

    if (drawTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.lineWidth = 20;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = drawColor;
      ctx.lineWidth = 3;
    }
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    lastPos.current = pos;
  };

  const handleDrawEnd = () => { setIsDrawing(false); lastPos.current = null; };

  const getDrawPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = drawCanvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const saveDrawing = () => {
    const canvas = drawCanvasRef.current;
    if (!canvas || !editingPhotoId) { setDrawMode(false); return; }
    canvas.toBlob((blob) => {
      if (!blob) { setDrawMode(false); return; }
      const file = new File([blob], `draw-${Date.now()}.jpg`, { type: 'image/jpeg' });
      const dataUrl = URL.createObjectURL(file);
      const photo = photos.find(p => p.id === editingPhotoId);
      if (photo) URL.revokeObjectURL(photo.dataUrl);
      updatePhoto(editingPhotoId, { file, dataUrl });
      setDrawMode(false);
      setEditingPhotoId(null);
    }, 'image/jpeg', 0.92);
  };

  const resetForm = () => {
    setStep(1); setPhotos([]); setFase(null); setIsSubmitting(false);
    setDragIdx(null); setEditingPhotoId(null); setDrawMode(false);
    photos.forEach(p => URL.revokeObjectURL(p.dataUrl));
  };
  const handleClose = () => { closeUploadModal(); setTimeout(resetForm, 250); };

  const handleSubmit = async () => {
    if (photos.length === 0) return;
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      photos.forEach((p, i) => {
        formData.append('files', p.file);
        formData.append(`note_${i}`, p.note);
        formData.append(`place_${i}`, p.place);
      });
      formData.append('projectId', uploadProjectId || '');
      formData.append('fase', fase || '');
      if (currentUser?.id) formData.append('uploadedBy', currentUser.id);

      const res = await fetch('/api/photos', { method: 'POST', body: formData });
      if (!res.ok) throw new Error();
      toast({ title: 'Fotos guardadas', description: `${photos.length} foto(s) guardadas` });
      handleClose();
      window.location.reload();
    } catch {
      toast({ title: 'Error', description: 'No se guardaron las fotos', variant: 'destructive' });
    } finally { setIsSubmitting(false); }
  };

  const canSave = fase !== null;

  return (
    <Dialog open={uploadModalOpen} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-lg max-h-[94vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl">

        <input ref={cameraRef} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={handleCamera} />
        <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden" onChange={handleGallery} />

        {/* DRAW MODE FULLSCREEN */}
        {drawMode && editingPhotoId && (
          <div className="fixed inset-0 z-50 bg-black flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 bg-black/80">
              <span className="text-white text-sm font-semibold">Dibujar sobre foto</span>
              <div className="flex gap-2">
                {['#ef4444','#f97316','#eab308','#22c55e','#38C5B5','#3b82f6','#8b5cf6','#ffffff'].map(c => (
                  <button key={c} onClick={() => { setDrawTool('pen'); setDrawColor(c); }}
                    className="h-7 w-7 rounded-full border-2 border-transparent" style={{ background: c }}
                  />
                ))}
                <button onClick={() => setDrawTool('eraser')} className="h-7 w-7 rounded-full border border-white/40 flex items-center justify-center bg-white/10">
                  <Eraser className="h-3.5 w-3.5 text-white" />
                </button>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setDrawMode(false); setEditingPhotoId(null); }} className="text-white">Cancelar</Button>
                <Button size="sm" onClick={saveDrawing} className="bg-[#38C5B5] text-white">Guardar</Button>
              </div>
            </div>
            <div className="flex-1 flex items-center justify-center overflow-hidden">
              <canvas
                ref={drawCanvasRef}
                className="max-w-full max-h-full object-contain"
                onMouseDown={handleDrawStart} onMouseMove={handleDrawMove} onMouseUp={handleDrawEnd} onMouseLeave={handleDrawEnd}
                onTouchStart={handleDrawStart} onTouchMove={handleDrawMove} onTouchEnd={handleDrawEnd}
              />
            </div>
            {/* Hidden img to load into canvas */}
            {editingPhotoId && (() => {
              const photo = photos.find(p => p.id === editingPhotoId);
              if (!photo) return null;
              return (
                <img src={photo.dataUrl} alt="" className="hidden" onLoad={(e) => { drawImgRef.current = e.currentTarget; initDrawCanvas(e.currentTarget); }} />
              );
            })()}
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            {step === 1 ? `${photos.length} foto(s)` : 'Clasificar'}
          </DialogTitle>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={handleClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Step bar */}
        <div className="px-5 pb-2 flex gap-1">
          <div className={`h-1 flex-1 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-muted'}`} />
          <div className={`h-1 flex-1 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
        </div>

        <div className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait">

            {/* STEP 1: CAPTURE */}
            {step === 1 && (
              <motion.div key="s1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col">
                <ScrollArea className="flex-1 px-5">
                  <div className="pb-4 space-y-4 pt-2">
                    {/* Camera button */}
                    <button onClick={() => cameraRef.current?.click()}
                      className="w-full flex items-center gap-4 rounded-xl border-2 border-dashed p-5 transition-all active:scale-[0.98]"
                      style={{ borderColor: '#38C5B540', background: '#38C5B508' }}>
                      <div className="h-12 w-12 rounded-full flex items-center justify-center" style={{ background: '#38C5B520' }}>
                        <Camera className="h-6 w-6 text-primary" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold">Tomar Foto</p>
                        <p className="text-xs text-muted-foreground">Abre la cámara directamente</p>
                      </div>
                    </button>

                    {/* Gallery button */}
                    <button onClick={() => galleryRef.current?.click()}
                      className="w-full flex items-center gap-4 rounded-xl border p-4 transition-all active:scale-[0.98]"
                      style={{ borderColor: '#E2E6EB' }}>
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        <ImagePlus className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-semibold">Elegir de Galería</p>
                        <p className="text-xs text-muted-foreground">Seleccionar varias fotos</p>
                      </div>
                    </button>

                    {/* Photo list - reorderable */}
                    {photos.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground">Mantén presionado para reordenar</p>
                        {photos.map((photo, idx) => (
                          <motion.div
                            key={photo.id}
                            data-photo-id={photo.id}
                            layout
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                            draggable
                            onDragStart={() => handleDragStart(idx)}
                            onDragOver={(e) => handleDragOver(e, idx)}
                            onDragEnd={handleDragEnd}
                            onTouchStart={() => setTouchReorder(photo.id)}
                            onTouchMove={(e) => handleTouchMove(e, photo.id)}
                            onTouchEnd={() => setTouchReorder(null)}
                            className="flex items-center gap-2 p-2 rounded-lg border bg-card"
                            style={{ borderColor: '#E8EBF0' }}
                          >
                            <GripVertical className="h-4 w-4 text-muted-foreground/50 shrink-0 cursor-grab" />
                            <div className="h-12 w-12 rounded-lg overflow-hidden border shrink-0" style={{ borderColor: '#E2E6EB' }}>
                              <img src={photo.dataUrl} alt="" className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1 min-w-0 space-y-1">
                              <Input
                                placeholder="Nombre del lugar..."
                                value={photo.place}
                                onChange={(e) => updatePhoto(photo.id, { place: e.target.value })}
                                className="h-7 text-xs rounded-lg"
                              />
                              <Input
                                placeholder="Nota..."
                                value={photo.note}
                                onChange={(e) => updatePhoto(photo.id, { note: e.target.value })}
                                className="h-7 text-xs rounded-lg"
                              />
                            </div>
                            <button onClick={() => openDraw(photo.id)} className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                            </button>
                            <button onClick={() => removePhoto(photo.id)} className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 hover:bg-red-50">
                              <Trash2 className="h-3.5 w-3.5 text-red-400" />
                            </button>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                </ScrollArea>

                <div className="px-5 py-3 border-t flex items-center justify-between gap-2" style={{ borderColor: '#E2E6EB' }}>
                  <Button variant="ghost" onClick={handleClose} className="text-sm">Cancelar</Button>
                  <Button onClick={() => setStep(2)} disabled={photos.length === 0}
                    className="gap-2 h-10 px-5 text-sm font-semibold text-white rounded-lg"
                    style={{ background: 'linear-gradient(135deg, #38C5B5, #2DA194)' }}>
                    Siguiente <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* STEP 2: CLASSIFY */}
            {step === 2 && (
              <motion.div key="s2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col">
                <ScrollArea className="flex-1 px-5">
                  <div className="pb-4 space-y-5 pt-2">
                    {/* Mini previews */}
                    <div className="flex gap-1.5 overflow-x-auto pb-1">
                      {photos.slice(0, 8).map(p => (
                        <div key={p.id} className="h-12 w-12 rounded-lg overflow-hidden border shrink-0" style={{ borderColor: '#E2E6EB' }}>
                          <img src={p.dataUrl} alt="" className="w-full h-full object-cover" />
                        </div>
                      ))}
                      {photos.length > 8 && <div className="h-12 w-12 rounded-lg border bg-muted flex items-center justify-center shrink-0 text-xs font-bold text-muted-foreground">+{photos.length - 8}</div>}
                    </div>

                    {/* FASE */}
                    <div>
                      <Label className="text-sm font-semibold block mb-3">Fase de la foto</Label>
                      <div className="grid grid-cols-2 gap-3">
                        {([['antes', 'ANTES', '#F0A030'], ['despues', 'DESPUÉS', '#2DA194']] as const).map(([val, label, color]) => (
                          <button key={val} onClick={() => setFase(fase === val ? null : val)}
                            className={`relative flex flex-col items-center gap-2 p-5 rounded-xl border-2 transition-all ${fase === val ? '' : 'border-[#E2E6EB] bg-white'}`}
                            style={fase === val ? { borderColor: color, background: color + '15' } : {}}>
                            <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ background: fase === val ? color : color + '15', color: fase === val ? 'white' : color }}>
                              <Type className="h-5 w-5" />
                            </div>
                            <span className="text-sm font-bold" style={{ color: fase === val ? color : '#1A2332' }}>{label}</span>
                            {fase === val && <div className="absolute top-2 right-2 h-5 w-5 rounded-full flex items-center justify-center" style={{ background: color }}><Check className="h-3 w-3 text-white" strokeWidth={3} /></div>}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </ScrollArea>

                <div className="px-5 py-3 border-t flex items-center justify-between gap-2" style={{ borderColor: '#E2E6EB' }}>
                  <Button variant="ghost" onClick={() => setStep(1)} className="gap-1 text-sm"><ArrowLeft className="h-4 w-4" /> Fotos</Button>
                  <Button onClick={handleSubmit} disabled={!canSave || isSubmitting}
                    className="gap-2 h-10 px-5 text-sm font-semibold text-white rounded-lg"
                    style={{ background: canSave ? 'linear-gradient(135deg, #38C5B5, #2DA194)' : '#CBD5E1' }}>
                    {isSubmitting ? 'Guardando...' : <><Check className="h-4 w-4" /> Guardar</>}
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