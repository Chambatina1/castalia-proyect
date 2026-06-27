'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { FileBarChart, Plus, Filter, Eye, Send, Trash2, FileText, Download } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAppStore, REPORT_TYPE_CONFIG, STATUS_CONFIG, type Report } from '@/store/app-store'
import { useToast } from '@/hooks/use-toast'

export default function ReportsPage() {
  const { reports, setReports, projects } = useAppStore()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')

  useEffect(() => {
    fetchReports()
  }, [])

  const fetchReports = async () => {
    try {
      const res = await fetch('/api/reports')
      if (res.ok) {
        const data = await res.json()
        setReports(data)
      }
    } catch (err) {
      console.error('Failed to fetch reports:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredReports = filter === 'ALL'
    ? reports
    : reports.filter((r) => r.type === filter)

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Reportes</h1>
          <p className="text-base text-muted-foreground mt-1">Gestiona y genera reportes de proyecto</p>
        </div>
        <Button className="btn-castalia gap-2 h-10 px-5 text-sm font-medium rounded-lg">
          <Plus className="h-4 w-4" />
          Nuevo Reporte
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-48 h-10 text-sm rounded-lg">
            <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Filtrar por tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos los tipos</SelectItem>
            {Object.entries(REPORT_TYPE_CONFIG).map(([key, val]) => (
              <SelectItem key={key} value={key}>{val.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Badge variant="outline" className="text-xs px-3 py-1.5">
          {filteredReports.length} reporte{filteredReports.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Reports Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 rounded-xl shimmer" />
          ))}
        </div>
      ) : filteredReports.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <FileBarChart className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Sin reportes</h3>
            <p className="text-sm text-muted-foreground mt-1 text-center max-w-sm">
              Crea tu primer reporte de progreso o inspección para un proyecto
            </p>
            <Button className="btn-castalia gap-2 mt-5 h-10 px-5 text-sm rounded-lg">
              <Plus className="h-4 w-4" />
              Crear Reporte
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredReports.map((report, index) => {
            const typeConfig = REPORT_TYPE_CONFIG[report.type] || { label: report.type, color: '' }
            const statusConfig = STATUS_CONFIG[report.status] || { label: report.status, color: '' }
            return (
              <motion.div
                key={report.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: index * 0.05 }}
              >
                <Card className="group hover:shadow-md transition-shadow duration-200 rounded-xl overflow-hidden">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-foreground truncate">{report.title}</h3>
                        <p className="text-sm text-muted-foreground mt-0.5">{report.project?.name || 'Proyecto'}</p>
                      </div>
                      <Badge variant="outline" className={`shrink-0 text-xs px-2.5 py-0.5 ${statusConfig.color}`}>
                        {statusConfig.label}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`text-xs px-2.5 py-0.5 ${typeConfig.color}`}>
                        {typeConfig.label}
                      </Badge>
                      {report.generator && (
                        <span className="text-xs text-muted-foreground">por {report.generator.name}</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border/50">
                      <span className="text-xs text-muted-foreground">
                        {new Date(report.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                          <Download className="h-4 w-4" />
                        </Button>
                        {report.status === 'DRAFT' && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                            <Send className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}