'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, CheckSquare, AlertCircle, Clock, CheckCircle2, Eye, Search } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAppStore, STATUS_CONFIG, PRIORITY_CONFIG } from '@/store/app-store'
import { useToast } from '@/hooks/use-toast'

interface ApiTask {
  id: string; title: string; description?: string; status: string; priority: string
  projectId: string; project?: { id: string; name: string }
  assignee?: { id: string; name: string } | null
  dueDate?: string | null; createdAt: string
}

export default function TasksPage() {
  const { goBack, isManagerOrAdmin } = useAppStore()
  const { toast } = useToast()
  const [tasks, setTasks] = useState<ApiTask[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [projectFilter, setProjectFilter] = useState('ALL')
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/api/tasks').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setTasks(data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const projects = [...new Set(tasks.map(t => t.project?.name).filter(Boolean))]
  const filtered = tasks.filter(t => {
    if (statusFilter !== 'ALL' && t.status !== statusFilter) return false
    if (projectFilter !== 'ALL' && t.project?.name !== projectFilter) return false
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const statusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED': return <CheckCircle2 className="w-4 h-4" style={{ color: '#2DA194' }} />
      case 'IN_PROGRESS': return <Clock className="w-4 h-4" style={{ color: '#F0A030' }} />
      case 'NEEDS_REVIEW': return <Eye className="w-4 h-4" style={{ color: '#E12E2E' }} />
      default: return <AlertCircle className="w-4 h-4" style={{ color: '#ADB5B7' }} />
    }
  }

  return (
    <div className="min-h-screen" style={{ background: '#F7F8FA' }}>
      {/* Header */}
      <div className="sticky top-0 z-30 border-b" style={{ background: 'rgba(247,248,250,0.9)', backdropFilter: 'blur(16px)', borderColor: '#E2E6EB' }}>
        <div className="max-w-6xl mx-auto px-4 lg:px-8 h-[72px] flex items-center gap-4">
          <button onClick={goBack} className="p-2.5 rounded-xl hover:bg-black/5 transition-colors">
            <ArrowLeft className="w-5 h-5" style={{ color: '#35414A' }} />
          </button>
          <div className="flex-1">
            <h1 className="text-[22px] font-bold tracking-[-0.02em]" style={{ color: '#1A2332' }}>Tareas</h1>
            <p className="text-[13px]" style={{ color: '#5D7380' }}>{filtered.length} tarea{filtered.length !== 1 ? 's' : ''}</p>
          </div>
          {isManagerOrAdmin() && (
            <Button className="h-10 px-5 rounded-xl text-[13px] font-semibold text-white border-0 gap-2"
              style={{ background: 'linear-gradient(135deg, #38C5B5, #2DA194)' }}>
              <CheckSquare className="w-4 h-4" strokeWidth={2.5} />
              Nueva Tarea
            </Button>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 lg:px-8 py-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#ADB5B7' }} />
            <Input placeholder="Buscar tarea..." value={search} onChange={e => setSearch(e.target.value)}
              className="h-10 pl-10 rounded-xl text-[13px] border-[#E2E6EB] bg-white" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px] h-10 rounded-xl text-[13px] border-[#E2E6EB] bg-white">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos</SelectItem>
              <SelectItem value="PENDING">Pendiente</SelectItem>
              <SelectItem value="IN_PROGRESS">En Progreso</SelectItem>
              <SelectItem value="COMPLETED">Completado</SelectItem>
              <SelectItem value="NEEDS_REVIEW">Revisión</SelectItem>
            </SelectContent>
          </Select>
          {projects.length > 1 && (
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="w-[200px] h-10 rounded-xl text-[13px] border-[#E2E6EB] bg-white">
                <SelectValue placeholder="Proyecto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos los proyectos</SelectItem>
                {projects.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Task list */}
        <div className="space-y-2">
          {filtered.map((task, i) => (
            <motion.div key={task.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer" style={{ background: '#FFFFFF' }}>
                <CardContent className="p-4 flex items-center gap-4">
                  {statusIcon(task.status)}
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-semibold truncate" style={{ color: '#1A2332' }}>{task.title}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      {task.project && (
                        <span className="text-[12px] font-medium" style={{ color: '#38C5B5' }}>{task.project.name}</span>
                      )}
                      {task.assignee && (
                        <span className="text-[12px]" style={{ color: '#5D7380' }}>{task.assignee.name}</span>
                      )}
                      {task.dueDate && (
                        <span className="text-[12px]" style={{ color: '#ADB5B7' }}>
                          {new Date(task.dueDate).toLocaleDateString('es-MX')}
                        </span>
                      )}
                    </div>
                  </div>
                  {PRIORITY_CONFIG[task.priority] && (
                    <Badge className="text-[11px] font-semibold px-2.5 py-1 rounded-lg border shrink-0"
                      style={{ ...parseBadge(PRIORITY_CONFIG[task.priority].color) }}>
                      {PRIORITY_CONFIG[task.priority].label}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
          {filtered.length === 0 && !loading && (
            <div className="text-center py-16">
              <CheckSquare className="w-10 h-10 mx-auto mb-3" style={{ color: '#ADB5B7' }} />
              <p className="text-[16px] font-semibold" style={{ color: '#35414A' }}>Sin tareas encontradas</p>
            </div>
          )}
        </div>
      </div>
      <div className="h-20 lg:h-0" />
    </div>
  )
}

function parseBadge(cls: string) {
  const bgMatch = cls.match(/bg-(.+?)(?:\s|$)/)
  const textMatch = cls.match(/text-(.+?)(?:\s|$)/)
  const borderMatch = cls.match(/border-(.+?)(?:\s|$)/)
  return {
    background: bgMatch?.[1]?.startsWith('[#') ? hexToRgba(bgMatch[1].slice(1, -1), 0.12) : undefined,
    color: textMatch?.[1]?.startsWith('[#') ? textMatch[1].slice(1, -1) : undefined,
    borderColor: borderMatch?.[1]?.startsWith('[#') ? hexToRgba(borderMatch[1].slice(1, -1), 0.25) : undefined,
  }
}
function hexToRgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}