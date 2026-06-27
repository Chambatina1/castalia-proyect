'use client';

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Calendar,
  User,
  Tag,
  Info,
  Minus,
  MoveRight,
  Circle,
  Type,
  Pencil,
  MessageSquare,
  Check,
  XCircle,
  Eye,
  Trash2,
  RotateCcw,
} from 'lucide-react';
import { useAppStore, type Photo, type Annotation } from '@/store/app-store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

type AnnotationTool = 'arrow' | 'circle' | 'text' | 'freedraw' | 'comment' | null;

const ANNOTATION_COLORS = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#06b6d4',
  '#8b5cf6',
  '#ec4899',
  '#ffffff',
];

interface PhotoComment {
  id: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  createdAt: string;
}

interface PhotoLightboxProps {
  photos: Photo[];
}

export default function PhotoLightbox({ photos }: PhotoLightboxProps) {
  const {
    lightboxOpen,
    lightboxPhotoId,
    closeLightbox,
    lightboxAnnotations,
    setAnnotation,
    currentUser,
  } = useAppStore();
  const { toast } = useToast();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [infoOpen, setInfoOpen] = useState(false);
  const [activeTool, setActiveTool] = useState<AnnotationTool>(null);
  const [annotationColor, setAnnotationColor] = useState('#ef4444');
  const [textAnnotation, setTextAnnotation] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [textPosition, setTextPosition] = useState({ x: 0, y: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [currentPoints, setCurrentPoints] = useState<{ x: number; y: number }[]>([]);
  const [comments, setComments] = useState<PhotoComment[]>([]);
  const [newComment, setNewComment] = useState('');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentPhoto = photos[currentIndex];
  const isManager = currentUser?.role === 'manager';

  const navigateNext = () => {
    setCurrentIndex((prev) => (prev + 1) % photos.length);
  };

  const navigatePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  // Sync index when photoId changes
  useEffect(() => {
    if (lightboxPhotoId) {
      const idx = photos.findIndex((p) => p.id === lightboxPhotoId);
      if (idx >= 0) setCurrentIndex(idx);
    }
  }, [lightboxPhotoId, photos]);

  // Reset state when photo changes
  useEffect(() => {
    setActiveTool(null);
    setShowTextInput(false);
    setIsDrawing(false);
    setCurrentPoints([]);
    setDrawStart(null);
    setNewComment('');
  }, [currentIndex]);

  // Keyboard navigation
  useEffect(() => {
    if (!lightboxOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          navigatePrev();
          break;
        case 'ArrowRight':
          e.preventDefault();
          navigateNext();
          break;
        case 'Escape':
          e.preventDefault();
          closeLightbox();
          break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [lightboxOpen, currentIndex, photos.length]);

  const drawAnnotation = (ctx: CanvasRenderingContext2D, ann: Annotation) => {
    ctx.strokeStyle = ann.color;
    ctx.fillStyle = ann.color;
    ctx.lineWidth = 2;

    if (ann.type === 'arrow' && ann.points.length >= 2) {
      drawArrow(ctx, ann.points[0], ann.points[1], ann.color);
    } else if (ann.type === 'circle' && ann.points.length >= 2) {
      const radius = Math.sqrt(
        Math.pow(ann.points[1].x - ann.points[0].x, 2) +
          Math.pow(ann.points[1].y - ann.points[0].y, 2)
      );
      ctx.beginPath();
      ctx.arc(ann.points[0].x, ann.points[0].y, radius, 0, Math.PI * 2);
      ctx.stroke();
    } else if (ann.type === 'text' && ann.text && ann.points[0]) {
      const fontSize = 16;
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(ann.points[0].x - 2, ann.points[0].y - fontSize, ctx.measureText(ann.text).width + 8, fontSize + 6);
      ctx.fillStyle = ann.color;
      ctx.fillText(ann.text, ann.points[0].x + 2, ann.points[0].y);
    } else if (ann.type === 'freedraw' && ann.points.length > 1) {
      ctx.beginPath();
      ctx.moveTo(ann.points[0].x, ann.points[0].y);
      for (let i = 1; i < ann.points.length; i++) {
        ctx.lineTo(ann.points[i].x, ann.points[i].y);
      }
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  };

  const drawArrow = (
    ctx: CanvasRenderingContext2D,
    from: { x: number; y: number },
    to: { x: number; y: number },
    color: string
  ) => {
    const headLen = 12;
    const angle = Math.atan2(to.y - from.y, to.x - from.x);

    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(to.x - headLen * Math.cos(angle - Math.PI / 6), to.y - headLen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(to.x - headLen * Math.cos(angle + Math.PI / 6), to.y - headLen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  };

  const getCanvasCoords = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0]?.clientX ?? 0 : e.clientX;
      const clientY = 'touches' in e ? e.touches[0]?.clientY ?? 0 : e.clientY;
      return {
        x: clientX - rect.left,
        y: clientY - rect.top,
      };
    },
    []
  );

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (!activeTool || activeTool === 'comment') return;
    const pos = getCanvasCoords(e);

    if (activeTool === 'text') {
      setTextPosition(pos);
      setShowTextInput(true);
      return;
    }

    setIsDrawing(true);
    setDrawStart(pos);
    setCurrentPoints([pos]);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing) return;
    const pos = getCanvasCoords(e);
    setCurrentPoints((prev) => [...prev, pos]);
  };

  const handleCanvasMouseUp = () => {
    if (!isDrawing || !drawStart || !currentPhoto) {
      setIsDrawing(false);
      return;
    }

    const lastPoint = currentPoints[currentPoints.length - 1] || drawStart;
    const newAnnotation: Annotation = {
      type: activeTool as Annotation['type'],
      color: annotationColor,
      points: activeTool === 'freedraw' ? currentPoints : [drawStart, lastPoint],
      text: undefined,
    };

    const existing = lightboxAnnotations.get(currentPhoto.id) || [];
    setAnnotation(currentPhoto.id, [...existing, newAnnotation]);

    setIsDrawing(false);
    setDrawStart(null);
    setCurrentPoints([]);
  };

  const handleTextSubmit = () => {
    if (!textAnnotation.trim() || !currentPhoto) return;
    const newAnnotation: Annotation = {
      type: 'text',
      color: annotationColor,
      points: [textPosition],
      text: textAnnotation.trim(),
    };
    const existing = lightboxAnnotations.get(currentPhoto.id) || [];
    setAnnotation(currentPhoto.id, [...existing, newAnnotation]);
    setTextAnnotation('');
    setShowTextInput(false);
  };

  const clearAnnotations = () => {
    if (currentPhoto) setAnnotation(currentPhoto.id, []);
  };

  // Redraw canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Match canvas to displayed image size
    const rect = img.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw saved annotations for this photo
    const savedAnnotations = lightboxAnnotations.get(currentPhoto?.id || '') || [];
    savedAnnotations.forEach((ann) => drawAnnotation(ctx, ann));

    // Draw current in-progress annotation
    if (isDrawing && drawStart && activeTool === 'arrow' && currentPoints.length >= 2) {
      drawArrow(ctx, drawStart, currentPoints[currentPoints.length - 1], annotationColor);
    }
    if (isDrawing && drawStart && activeTool === 'circle' && currentPoints.length >= 2) {
      const last = currentPoints[currentPoints.length - 1];
      const radius = Math.sqrt(
        Math.pow(last.x - drawStart.x, 2) + Math.pow(last.y - drawStart.y, 2)
      );
      ctx.beginPath();
      ctx.arc(drawStart.x, drawStart.y, radius, 0, Math.PI * 2);
      ctx.strokeStyle = annotationColor;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    if (isDrawing && activeTool === 'freedraw' && currentPoints.length > 1) {
      ctx.beginPath();
      ctx.moveTo(currentPoints[0].x, currentPoints[0].y);
      for (let i = 1; i < currentPoints.length; i++) {
        ctx.lineTo(currentPoints[i].x, currentPoints[i].y);
      }
      ctx.strokeStyle = annotationColor;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    }
  }, [currentPhoto, isDrawing, drawStart, currentPoints, activeTool, annotationColor, lightboxAnnotations, currentIndex]);

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    setComments((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        authorName: currentUser?.name || 'You',
        authorAvatar: currentUser?.avatar,
        content: newComment.trim(),
        createdAt: new Date().toISOString(),
      },
    ]);
    setNewComment('');
  };

  if (!currentPhoto) return null;

  const tools: { id: AnnotationTool; icon: React.ReactNode; label: string }[] = [
    { id: 'arrow', icon: <MoveRight className="size-4" />, label: 'Arrow' },
    { id: 'circle', icon: <Circle className="size-4" />, label: 'Circle' },
    { id: 'text', icon: <Type className="size-4" />, label: 'Text' },
    { id: 'freedraw', icon: <Pencil className="size-4" />, label: 'Free Draw' },
    { id: 'comment', icon: <MessageSquare className="size-4" />, label: 'Comment' },
  ];

  return (
    <AnimatePresence>
      {lightboxOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/95 flex"
        >
          {/* Close Button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 z-50 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-colors"
          >
            <X className="size-5" />
          </button>

          {/* Navigation Arrows */}
          {photos.length > 1 && (
            <>
              <button
                onClick={navigatePrev}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-50 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-colors"
              >
                <ChevronLeft className="size-6" />
              </button>
              <button
                onClick={navigateNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-50 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-colors"
              >
                <ChevronRight className="size-6" />
              </button>
            </>
          )}

          {/* Main Image Area */}
          <div className="flex-1 flex items-center justify-center relative" ref={containerRef}>
            <div className="relative max-w-full max-h-full p-4">
              <img
                ref={imageRef}
                src={currentPhoto.url}
                alt={currentPhoto.caption || 'Project photo'}
                className="max-w-full max-h-[calc(100vh-180px)] object-contain rounded-lg"
                draggable={false}
              />
              <canvas
                ref={canvasRef}
                className={cn(
                  'absolute top-0 left-0 pointer-events-none',
                  activeTool && activeTool !== 'comment' && 'pointer-events-auto cursor-crosshair'
                )}
                style={{ width: '100%', height: '100%' }}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={() => {
                  if (isDrawing) handleCanvasMouseUp();
                }}
              />

              {/* Text Input Overlay */}
              {showTextInput && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute bg-background border rounded-lg shadow-lg p-3 z-50 flex gap-2"
                  style={{
                    left: textPosition.x,
                    top: textPosition.y,
                  }}
                >
                  <Input
                    value={textAnnotation}
                    onChange={(e) => setTextAnnotation(e.target.value)}
                    placeholder="Type annotation..."
                    className="w-48 h-8 text-sm"
                    onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit()}
                    autoFocus
                  />
                  <Button size="icon" className="size-8" onClick={handleTextSubmit}>
                    <Check className="size-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    className="size-8"
                    onClick={() => setShowTextInput(false)}
                  >
                    <X className="size-4" />
                  </Button>
                </motion.div>
              )}
            </div>

            {/* Photo Counter */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white text-sm px-3 py-1 rounded-full">
              {currentIndex + 1} / {photos.length}
            </div>
          </div>

          {/* Right Side Panel */}
          <motion.div
            initial={{ x: 400 }}
            animate={{ x: infoOpen ? 0 : 400 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-[380px] bg-background border-l flex flex-col h-full shrink-0 absolute right-0 top-0 bottom-0 z-40"
          >
            {/* Panel Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold text-sm">Photo Details</h3>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => setInfoOpen(false)}
              >
                <Minus className="size-4" />
              </Button>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4">
                {/* Caption */}
                {currentPhoto.caption && (
                  <p className="text-sm">{currentPhoto.caption}</p>
                )}

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5">
                  {currentPhoto.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="capitalize text-xs">
                      <Tag className="size-3 mr-1" />
                      {tag}
                    </Badge>
                  ))}
                </div>

                {/* Metadata */}
                <div className="space-y-2.5 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="size-4 shrink-0" />
                    <span>{currentPhoto.uploaderName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="size-4 shrink-0" />
                    <span>{new Date(currentPhoto.createdAt).toLocaleDateString()}</span>
                  </div>
                  {currentPhoto.locationAddress && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="size-4 shrink-0" />
                      <span>{currentPhoto.locationAddress}</span>
                    </div>
                  )}
                </div>

                {currentPhoto.isUrgent && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="size-3" />
                    Urgent Problem
                  </Badge>
                )}

                <Separator />

                {/* Manager Actions */}
                {isManager && (
                  <div className="space-y-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Manager Actions
                    </p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1 gap-1.5">
                        <Check className="size-3.5" />
                        Approve
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1 gap-1.5 text-destructive hover:text-destructive">
                        <XCircle className="size-3.5" />
                        Reject
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm flex items-center gap-1.5">
                        <Eye className="size-3.5" />
                        Mark for Client
                      </Label>
                      <Switch
                        checked={currentPhoto.visibleToClient}
                        onCheckedChange={() => {
                          toast({
                            title: 'Visibility updated',
                            description: currentPhoto.visibleToClient
                              ? 'Photo hidden from client'
                              : 'Photo marked for client',
                          });
                        }}
                      />
                    </div>
                  </div>
                )}

                <Separator />

                {/* Comments Section */}
                <div>
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-1.5">
                    <MessageSquare className="size-4" />
                    Comments ({comments.length})
                  </h4>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {comments.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-4">
                        No comments yet
                      </p>
                    )}
                    {comments.map((c) => (
                      <div key={c.id} className="flex gap-2">
                        <div className="size-7 rounded-full bg-muted shrink-0 flex items-center justify-center text-xs font-medium">
                          {c.authorName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2">
                            <span className="text-xs font-medium">{c.authorName}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(c.createdAt).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-sm mt-0.5">{c.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Input
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a comment..."
                      className="h-8 text-sm"
                      onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                    />
                    <Button size="icon" className="size-8 shrink-0" onClick={handleAddComment}>
                      <Send className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </motion.div>

          {/* Annotation Toolbar */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 bg-black/70 backdrop-blur-sm rounded-xl px-2 py-1.5">
            {/* Toggle info panel */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn('size-9 text-white hover:bg-white/20', infoOpen && 'bg-white/20')}
                  onClick={() => setInfoOpen(!infoOpen)}
                >
                  <Info className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Photo Info</TooltipContent>
            </Tooltip>

            <div className="w-px h-6 bg-white/20 mx-1" />

            {/* Annotation tools */}
            {tools.map((tool) => (
              <Tooltip key={tool.id}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      'size-9 text-white hover:bg-white/20',
                      activeTool === tool.id && 'bg-white/30 ring-1 ring-white/40'
                    )}
                    onClick={() =>
                      setActiveTool(activeTool === tool.id ? null : tool.id)
                    }
                  >
                    {tool.icon}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{tool.label}</TooltipContent>
              </Tooltip>
            ))}

            <div className="w-px h-6 bg-white/20 mx-1" />

            {/* Color picker */}
            <div className="flex items-center gap-1 px-1">
              {ANNOTATION_COLORS.map((color) => (
                <button
                  key={color}
                  className={cn(
                    'w-5 h-5 rounded-full border-2 transition-transform',
                    annotationColor === color ? 'scale-125 border-white' : 'border-transparent'
                  )}
                  style={{ backgroundColor: color }}
                  onClick={() => setAnnotationColor(color)}
                />
              ))}
            </div>

            <div className="w-px h-6 bg-white/20 mx-1" />

            {/* Clear */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-9 text-white hover:bg-white/20"
                  onClick={clearAnnotations}
                >
                  <RotateCcw className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Clear Annotations</TooltipContent>
            </Tooltip>
          </div>

          {/* Comment mode indicator */}
          {activeTool === 'comment' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-background border rounded-lg px-4 py-2 shadow-lg text-sm"
            >
              Comment mode active — use the panel on the right to add comments
              <Button
                variant="ghost"
                size="icon"
                className="size-6 ml-2"
                onClick={() => setInfoOpen(true)}
              >
                <ChevronRight className="size-3" />
              </Button>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Label({
  className,
  children,
  ...props
}: React.ComponentProps<'label'>) {
  return (
    <label className={className} {...props}>
      {children}
    </label>
  );
}

function Send({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z" />
      <path d="m21.854 2.147-10.94 10.939" />
    </svg>
  );
}