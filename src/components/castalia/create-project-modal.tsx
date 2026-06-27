'use client';

import { useState, useRef } from 'react';
import { X, Plus, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAppStore } from '@/store/app-store';
import { useToast } from '@/hooks/use-toast';

interface Props { open: boolean; onClose: () => void; onCreated?: () => void }

export default function CreateProjectModal({ open, onClose, onCreated }: Props) {
  const { currentUser } = useAppStore();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reset = () => { setName(''); setCoverPreview(null); setCoverFile(null); setIsSubmitting(false); };

  const handleClose = () => { onClose(); setTimeout(reset, 300); };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setCoverFile(f);
    setCoverPreview(URL.createObjectURL(f));
    e.target.value = '';
  };

  const handleCreate = async () => {
    const projectName = name.trim();
    if (!projectName) {
      toast({ title: 'Nombre requerido' });
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Create project
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: projectName, creatorId: currentUser?.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error del servidor');

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
      const msg = err instanceof Error ? err.message : 'No se pudo crear';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
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
        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />

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

        {/* Body */}
        <div className="px-5 pb-6 space-y-4">
          {/* Cover */}
          <div
            onClick={() => fileRef.current?.click()}
            className="w-full aspect-video rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer"
            style={{ borderColor: coverPreview ? 'transparent' : '#E2E6EB', background: coverPreview ? '#000' : '#F7F8FA' }}
          >
            {coverPreview ? (
              <img src={coverPreview} alt="Portada" className="w-full h-full object-cover rounded-xl" />
            ) : (
              <>
                <Camera className="h-8 w-8" style={{ color: '#ADB5B7' }} />
                <span className="text-sm font-medium" style={{ color: '#5D7380' }}>Foto de portada (opcional)</span>
                <span className="text-xs" style={{ color: '#ADB5B7' }}>Toca para tomar foto o elegir</span>
              </>
            )}
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold" style={{ color: '#1A2332' }}>Nombre del proyecto *</label>
            <Input
              placeholder="Ej: Residencia Playa del Carmen"
              value={name}
              onChange={(e) => setName(e.target.value)}
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