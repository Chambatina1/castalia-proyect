'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Plus,
  MapPin,
  Building2,
  User,
  FileText,
  Calendar,
  Flag,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAppStore } from '@/store/app-store';
import { useToast } from '@/hooks/use-toast';

interface CreateProjectModalProps {
  open: boolean;
  onClose: () => void;
}

export default function CreateProjectModal({ open, onClose }: CreateProjectModalProps) {
  const { currentUser } = useAppStore();
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [clientName, setClientName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setName('');
    setClientName('');
    setAddress('');
    setCity('');
    setState('');
    setDescription('');
    setPriority('MEDIUM');
    setIsSubmitting(false);
  };

  const handleClose = () => {
    onClose();
    setTimeout(resetForm, 250);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !clientName.trim() || !address.trim()) {
      toast({ title: 'Campos requeridos', description: 'Nombre, cliente y dirección son obligatorios', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          clientName: clientName.trim(),
          address: address.trim(),
          city: city.trim() || undefined,
          state: state.trim() || undefined,
          description: description.trim() || undefined,
          priority,
          status: 'ACTIVE',
          creatorId: currentUser?.id,
        }),
      });
      if (!res.ok) throw new Error('Error al crear proyecto');
      toast({ title: 'Proyecto creado', description: name });
      handleClose();
      // Reload projects
      window.location.reload();
    } catch {
      toast({ title: 'Error', description: 'No se pudo crear el proyecto', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <div>
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #38C5B5, #2DA194)' }}>
                <Plus className="h-4 w-4 text-white" strokeWidth={2.5} />
              </div>
              Nuevo Proyecto
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-0.5">Completa los datos del proyecto</p>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={handleClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 pb-6">
          <div className="space-y-4 pt-2">
            {/* Nombre del Proyecto */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                Nombre del Proyecto *
              </Label>
              <Input
                placeholder="Ej: Remodelación Residencia Playa"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11 text-sm rounded-xl"
                required
              />
            </div>

            {/* Cliente */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                Cliente *
              </Label>
              <Input
                placeholder="Nombre del cliente"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="h-11 text-sm rounded-xl"
                required
              />
            </div>

            {/* Dirección */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                Dirección *
              </Label>
              <Input
                placeholder="Dirección del proyecto"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="h-11 text-sm rounded-xl"
                required
              />
            </div>

            {/* Ciudad y Estado */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Ciudad</Label>
                <Input
                  placeholder="Ciudad"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="h-11 text-sm rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Estado</Label>
                <Input
                  placeholder="Estado"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="h-11 text-sm rounded-xl"
                />
              </div>
            </div>

            {/* Prioridad */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Flag className="h-4 w-4 text-muted-foreground" />
                Prioridad
              </Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="h-11 text-sm rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Baja</SelectItem>
                  <SelectItem value="MEDIUM">Media</SelectItem>
                  <SelectItem value="HIGH">Alta</SelectItem>
                  <SelectItem value="URGENT">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Descripción */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Descripción (opcional)
              </Label>
              <Textarea
                placeholder="Describe el proyecto..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="text-sm rounded-xl min-h-[80px] resize-none"
                rows={3}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-5">
            <Button type="button" variant="ghost" onClick={handleClose} className="text-sm rounded-lg">
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !name.trim() || !clientName.trim() || !address.trim()}
              className="gap-2 h-10 px-6 text-sm font-semibold rounded-lg text-white"
              style={{ background: 'linear-gradient(135deg, #38C5B5, #2DA194)', boxShadow: '0 1px 8px rgba(56,197,181,0.2)' }}
            >
              {isSubmitting ? (
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                  <Calendar className="h-4 w-4" />
                </motion.div>
              ) : (
                <Plus className="h-4 w-4" strokeWidth={2.5} />
              )}
              Crear Proyecto
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}