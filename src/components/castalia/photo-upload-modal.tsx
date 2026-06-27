'use client';

import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  X,
  Image as ImageIcon,
  Video,
  MapPin,
  Crosshair,
  AlertTriangle,
  Eye,
  Send,
  FileImage,
  Trash2,
  Plus,
} from 'lucide-react';
import { useAppStore } from '@/store/app-store';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

const AVAILABLE_TAGS = [
  'before',
  'during',
  'after',
  'problem',
  'progress',
  'detail',
  'document',
  'material',
  'safety',
  'equipment',
  'completion',
  'invoice',
];

const CATEGORIES = [
  'General',
  'Progress',
  'Problem / Issue',
  'Material Delivery',
  'Safety',
  'Equipment',
  'Completion',
  'Documentation',
  'Other',
];

interface FilePreview {
  file: File;
  preview: string;
  type: 'image' | 'video';
}

export default function PhotoUploadModal() {
  const { uploadModalOpen, uploadProjectId, closeUploadModal } = useAppStore();
  const { toast } = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<FilePreview[]>([]);
  const [caption, setCaption] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [category, setCategory] = useState('General');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [visibleToClient, setVisibleToClient] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = useCallback(() => {
    setFiles([]);
    setCaption('');
    setSelectedTags([]);
    setCategory('General');
    setLatitude('');
    setLongitude('');
    setLocationAddress('');
    setIsUrgent(false);
    setVisibleToClient(true);
    setIsSubmitting(false);
  }, []);

  const handleClose = () => {
    closeUploadModal();
    setTimeout(resetForm, 200);
  };

  const handleFiles = useCallback((newFiles: FileList | null) => {
    if (!newFiles) return;
    const validFiles = Array.from(newFiles).filter(
      (f) => f.type.startsWith('image/') || f.type.startsWith('video/')
    );
    const previews: FilePreview[] = validFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      type: file.type.startsWith('video/') ? 'video' : 'image',
    }));
    setFiles((prev) => [...prev, ...previews]);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const removeFile = (index: number) => {
    setFiles((prev) => {
      const newFiles = [...prev];
      URL.revokeObjectURL(newFiles[index].preview);
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: 'Error', description: 'Geolocation is not supported.', variant: 'destructive' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(6));
        setLongitude(position.coords.longitude.toFixed(6));
        toast({ title: 'Location acquired', description: 'GPS coordinates captured.' });
      },
      (error) => {
        toast({ title: 'Location error', description: error.message, variant: 'destructive' });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = async () => {
    if (files.length === 0) {
      toast({ title: 'No files', description: 'Please select at least one file.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      files.forEach((f) => formData.append('files', f.file));
      formData.append('projectId', uploadProjectId || '');
      formData.append('caption', caption);
      formData.append('tags', JSON.stringify(selectedTags));
      formData.append('category', category);
      formData.append('latitude', latitude);
      formData.append('longitude', longitude);
      formData.append('locationAddress', locationAddress);
      formData.append('isUrgent', String(isUrgent));
      formData.append('visibleToClient', String(visibleToClient));

      const res = await fetch('/api/photos', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Upload failed');

      toast({ title: 'Upload complete', description: `${files.length} file(s) uploaded successfully.` });
      handleClose();
    } catch {
      toast({ title: 'Upload failed', description: 'Something went wrong. Please try again.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={uploadModalOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="size-5" />
            Upload Photos
          </DialogTitle>
          <DialogDescription>
            Add photos to the project gallery with tags and location data.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-5 py-2">
            {/* Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`
                relative cursor-pointer border-2 border-dashed rounded-xl p-8 text-center transition-all
                ${isDragging
                  ? 'border-primary bg-primary/5 scale-[1.01]'
                  : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
                }
              `}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*"
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
              <motion.div
                animate={isDragging ? { scale: 1.05 } : { scale: 1 }}
                className="flex flex-col items-center gap-3"
              >
                <div className="rounded-full bg-muted p-4">
                  <Upload className="size-8 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">Drop files here or click to browse</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Supports images and videos
                  </p>
                </div>
              </motion.div>
            </div>

            {/* File Previews */}
            <AnimatePresence>
              {files.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <Label className="text-sm font-medium mb-2 block">
                    Selected Files ({files.length})
                  </Label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {files.map((f, i) => (
                      <motion.div
                        key={i}
                        layout
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="relative group aspect-square rounded-lg overflow-hidden border bg-muted"
                      >
                        {f.type === 'image' ? (
                          <img
                            src={f.preview}
                            alt={f.file.name}
                            className="object-cover size-full"
                          />
                        ) : (
                          <video
                            src={f.preview}
                            className="object-cover size-full"
                            muted
                          />
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Button
                            variant="destructive"
                            size="icon"
                            className="size-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFile(i);
                            }}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                        <div className="absolute bottom-1 left-1 right-1 flex items-center gap-1">
                          <Badge variant="secondary" className="text-[10px] px-1 py-0">
                            {f.type === 'image' ? (
                              <><ImageIcon className="size-3 mr-0.5" />IMG</>
                            ) : (
                              <><Video className="size-3 mr-0.5" />VID</>
                            )}
                          </Badge>
                          <span className="text-[10px] text-white truncate drop-shadow">
                            {f.file.name}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <Separator />

            {/* Caption */}
            <div className="space-y-2">
              <Label htmlFor="caption">Caption</Label>
              <Textarea
                id="caption"
                placeholder="Describe what's in the photo..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={2}
              />
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_TAGS.map((tag) => (
                  <Badge
                    key={tag}
                    variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                    className="cursor-pointer select-none capitalize"
                    onClick={() => toggleTag(tag)}
                  >
                    {selectedTags.includes(tag) && <X className="size-3 mr-1" />}
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <Badge
                    key={cat}
                    variant={category === cat ? 'default' : 'outline'}
                    className="cursor-pointer select-none"
                    onClick={() => setCategory(cat)}
                  >
                    {category === cat && <X className="size-3 mr-1" />}
                    {cat}
                  </Badge>
                ))}
              </div>
            </div>

            <Separator />

            {/* GPS Location */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <MapPin className="size-4" />
                  Location
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={getCurrentLocation}
                  className="gap-1.5"
                >
                  <Crosshair className="size-3.5" />
                  Get Current Location
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="latitude" className="text-xs text-muted-foreground">
                    Latitude
                  </Label>
                  <Input
                    id="latitude"
                    placeholder="e.g. 40.712800"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="longitude" className="text-xs text-muted-foreground">
                    Longitude
                  </Label>
                  <Input
                    id="longitude"
                    placeholder="e.g. -74.006000"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="address" className="text-xs text-muted-foreground">
                  Address
                </Label>
                <Input
                  id="address"
                  placeholder="Enter address manually..."
                  value={locationAddress}
                  onChange={(e) => setLocationAddress(e.target.value)}
                />
              </div>
            </div>

            <Separator />

            {/* Toggles */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="urgent-toggle" className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="size-4" />
                  Mark as Urgent
                </Label>
                <Switch
                  id="urgent-toggle"
                  checked={isUrgent}
                  onCheckedChange={setIsUrgent}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="visible-toggle" className="flex items-center gap-2">
                  <Eye className="size-4" />
                  Visible to Client
                </Label>
                <Switch
                  id="visible-toggle"
                  checked={visibleToClient}
                  onCheckedChange={setVisibleToClient}
                />
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || files.length === 0}
            className="gap-2"
          >
            {isSubmitting ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              >
                <FileImage className="size-4" />
              </motion.div>
            ) : (
              <Send className="size-4" />
            )}
            {isSubmitting ? 'Uploading...' : `Upload ${files.length > 0 ? `${files.length} File(s)` : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}