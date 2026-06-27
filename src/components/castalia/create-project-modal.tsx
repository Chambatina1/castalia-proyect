'use client';

import { useState, useRef } from 'react';
import { X, Plus, Camera, AlertCircle, ImagePlus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useAppStore } from '@/store/app-store';
import { useToast } from '@/hooks/use-toast';

interface Props { open: boolean; onClose: () => void; onCreated?: () => void }

export default function CreateProjectModal({ open, onClose, onCreated }: Props) {
  const { currentUser } = useAppStore();
  const { toast } = useToast();
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const reset = () => { setName(''); setCoverPreview(null); setCoverFile(null); setIsSubmitting(false); setErrorMsg(null); };

  const handleClose = () => { onClose(); setTimeout(reset, 300); };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setCoverFile(f);
    setCoverPreview(URL.createObjectURL(f));
    e.target.value = '';
  };

  const removeCover = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCoverFile(null);
    setCoverPreview(null);
  };

  const handleCreate = async () => {
    const projectName = name.trim();
    if (!projectName) {
      setErrorMsg('Escribe un nombre para el proyecto');
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      // 1. Create project
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: projectName, creatorId: currentUser?.id }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const msg = errData.error || 'Error del servidor';
        setErrorMsg(msg);
        throw new Error(msg);
      }

      const data = await res.json();

      // 2. Upload cover if selected
      if (coverFile && data.id) {
        try {
          const fd = new FormData();
          fd.append('files', coverFile);
          fd.append('projectId', data.id);
          fd.append('uploadedBy', currentUser?.id || '');
          fd.append('caption', 'Portada');
          fd.append('tags', '[]');
          const photoRes = await fetch('/api/photos', { method: 'POST', body: fd });
          if (photoRes.ok) {
            const photoData = await photoRes.json();
            const url = photoData.photos?.[0]?.url;
            if (url) {
              await fetch(`/api/projects/${data.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ coverImage: url }),
              });
            }
          }
        } catch { /* cover is optional */ }
      }

      toast({ title: 'Proyecto creado', description: projectName });
      handleClose();
      onCreated?.();
    } catch (err) {
      if (!errorMsg) {
        const msg = err instanceof Error ? err.message : 'No se pudo crear el proyecto';
        setErrorMsg(msg);
      }
      toast({ title: 'Error', description: errorMsg || 'No se pudo crear', variant: 'destructive' });
      console.error('Create project error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* Panel */}
      <div
        className="relative w-full sm:max-w-sm bg-white sm:rounded-2xl rounded-t-2xl overflow-hidden animate-in slide-in-from-bottom sm:slide-in-from-bottom-4 duration-200"
        style={{ maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Hidden file inputs — camera (capture) vs gallery (no capture) */}
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
        <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={handleFile} multiple />

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #38C5B5, #2DA194)' }}>
              <Plus className="h-4 w-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-lg font-bold" style={{ color: '#1A2332' }}>Nuevo Proyecto</span>
          </div>
          <button onClick={handleClose} className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-gray-100">
            <X className="h-4 w-4" style={{ color: '#5D7380' }} />
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mx-5 mb-2 flex items-start gap-2.5 p-3 rounded-xl bg-red-50 border border-red-200">
            <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
            <p className="text-[13px] text-red-700 leading-relaxed">{errorMsg}</p>
          </div>
        )}

        {/* Body */}
        <div className="px-5 pb-6 space-y-4">
          {/* Cover */}
          <div className="w-full aspect-video rounded-xl border-2 border-dashed overflow-hidden relative"
            style={{ borderColor: coverPreview ? 'transparent' : '#E2E6EB', background: coverPreview ? '#000' : '#F7F8FA' }}>
            {coverPreview ? (
              <>
                <img src={coverPreview} alt="Portada" className="w-full h-full object-cover" />
                {/* Remove button */}
                <button onClick={removeCover}
                  className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm">
                  <X className="h-3.5 w-3.5 text-white" />
                </button>
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                <Camera className="h-7 w-7 mb-1" style={{ color: '#ADB5B7' }} />
                <span className="text-sm font-medium" style={{ color: '#5D7380' }}>Foto de portada</span>
                <span className="text-[11px] mb-3" style={{ color: '#ADB5B7' }}>(opcional)</span>
                <div className="flex gap-2">
                  <button type="button" onClick={() => cameraRef.current?.click()}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-semibold text-white"
                    style={{ background: 'linear-gradient(135deg, #38C5B5, #2DA194)' }}>
                    <Camera className="w-3.5 h-3.5" />
                    Cámara
                  </button>
                  <button type="button" onClick={() => galleryRef.current?.click()}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-semibold border"
                    style={{ borderColor: '#E2E6EB', color: '#5D7380' }}>
                    <ImagePlus className="w-3.5 h-3.5" />
                    Galería
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold" style={{ color: '#1A2332' }}>Nombre del proyecto *</label>
            <Input
              placeholder="Ej: Residencia Playa del Carmen"
              value={name}
              onChange={(e) => { setName(e.target.value); setErrorMsg(null); }}
              className="h-11 text-sm rounded-xl"
              autoFocus
            />
          </div>

          {/* Create button */}
          <button
            onClick={handleCreate}
            disabled={isSubmitting || !name.trim()}
            className="w-full h-11 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #38C5B5, #2DA194)' }}
          >
            {isSubmitting ? (
              <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Plus className="h-4 w-4" strokeWidth={2.5} />
            )}
            {isSubmitting ? 'Creando...' : 'Crear Proyecto'}
          </button>
        </div>
      </div>
    </div>
  );
}