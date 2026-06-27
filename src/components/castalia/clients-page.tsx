'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Users, Plus, Mail, Shield, ExternalLink, Search } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useAppStore, ROLE_LABELS, ROLE_COLORS, type ClientShare } from '@/store/app-store'
import { useToast } from '@/hooks/use-toast'

export default function ClientsPage() {
  const { clientShares, setClientShares, projects } = useAppStore()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchShares()
  }, [])

  const fetchShares = async () => {
    try {
      const res = await fetch('/api/shares')
      if (res.ok) {
        const data = await res.json()
        setClientShares(data)
      }
    } catch (err) {
      console.error('Failed to fetch shares:', err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = search
    ? clientShares.filter((s) =>
        s.clientName?.toLowerCase().includes(search.toLowerCase()) ||
        s.clientEmail?.toLowerCase().includes(search.toLowerCase()) ||
        s.project?.name?.toLowerCase().includes(search.toLowerCase())
      )
    : clientShares

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Clientes</h1>
          <p className="text-base text-muted-foreground mt-1">Gestiona el acceso de clientes a proyectos</p>
        </div>
        <Button className="btn-castalia gap-2 h-10 px-5 text-sm font-medium rounded-lg">
          <Plus className="h-4 w-4" />
          Compartir con Cliente
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar cliente o proyecto..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 h-10 text-sm rounded-lg"
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl shimmer" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Sin clientes compartidos</h3>
            <p className="text-sm text-muted-foreground mt-1 text-center max-w-sm">
              Comparte un proyecto con un cliente para que pueda ver el progreso en tiempo real
            </p>
            <Button className="btn-castalia gap-2 mt-5 h-10 px-5 text-sm rounded-lg">
              <Plus className="h-4 w-4" />
              Compartir Proyecto
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((share, index) => (
            <motion.div
              key={share.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: index * 0.03 }}
            >
              <Card className="hover:shadow-sm transition-shadow rounded-xl">
                <CardContent className="flex items-center gap-4 p-4">
                  <Avatar className="h-10 w-10 bg-muted">
                    <AvatarFallback className="text-sm font-semibold text-muted-foreground">
                      {(share.clientName || share.clientEmail || 'C').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground truncate">
                        {share.clientName || 'Cliente'}
                      </h3>
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-2 py-0 ${share.isActive ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-muted text-muted-foreground'}`}
                      >
                        {share.isActive ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {share.clientEmail}
                    </p>
                  </div>

                  <div className="hidden sm:block text-right min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{share.project?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {share.lastAccessed
                        ? `Acceso: ${new Date(share.lastAccessed).toLocaleDateString('es-ES')}`
                        : 'Sin acceso aún'}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                      <Shield className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}