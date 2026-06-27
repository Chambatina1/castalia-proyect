'use client';

import { useState, useRef } from 'react';
import { X, Plus, Camera } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
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

  const handleClose = () => { onClose(); setTimeout(reset, 250); };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setCoverFile(f);
    setCoverPreview(URL.createObjectURL(f));
    e.target.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: 'Nombre requerido', description: 'Escribe un nombre para el proyecto', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Create project first (no cover yet)
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), creatorId: currentUser?.id }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'No se pudo crear el proyecto');
      }
      const project = await res.json();

      // 2. Upload cover photo now that we have the projectId
      if (coverFile && project?.id) {
        try {
          const fd = new FormData();
          fd.append('files', coverFile);
          fd.append('projectId', project.id);
          fd.append('uploadedBy', currentUser?.id || '');
          fd.append('caption', 'Portada');
          fd.append('tags', '[]');

          const photoRes = await fetch('/api/photos', { method: 'POST', body: fd });
          if (photoRes.ok) {
            const photoData = await photoRes.json();
            const coverUrl = photoData.photos?.[0]?.url;
            if (coverUrl) {
              // Update project with cover image
              await fetch(`/api/projects/${project.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ coverImage: coverUrl }),
              });
            }
          }
        } catch {
          // Cover upload failed but project was created — not critical
        }
      }

      toast({ title: 'Proyecto creado', description: name });
      handleClose();
      onCreated?.();
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'No se pudo crear', variant: 'destructive' });
    } finally { setIsSubmitting(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-sm p-0 gap-0 overflow-hidden rounded-2xl">
        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />

        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #38C5B5, #2DA194)' }}>
              <Plus className="h-4 w-4 text-white" strokeWidth={2.5} />
            </div>
            Nuevo Proyecto
          </DialogTitle>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={handleClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-5">
          {/* Cover photo */}
          <div
            onClick={() => fileRef.current?.click()}
            className="w-full aspect-video rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-all hover:border-primary/70"
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
          <div className="space-y-2">
            <label className="text-sm font-semibold">Nombre del proyecto *</label>
            <Input
              placeholder="Ej: Residencia Playa del Carmen"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11 text-sm rounded-xl"
              autoFocus
              required
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={handleClose} className="text-sm rounded-lg">Cancelar</Button>
            <Button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="gap-2 h-10 px-6 text-sm font-semibold rounded-lg text-white"
              style={{ background: 'linear-gradient(135deg, #38C5B5, #2DA194)' }}
            >
              {isSubmitting ? (
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Plus className="h-4 w-4" strokeWidth={2.5} />
              )}
              {isSubmitting ? 'Creando...' : 'Crear'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}