'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Settings as SettingsIcon, User, Shield, Bell, Palette, Database, ChevronRight, Building2, Moon, Sun, Globe, Lock, Cloud, CloudOff, RefreshCw, CheckCircle, HardDriveDownload, HardDriveUpload, Clock, AlertTriangle, ShieldCheck } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useAppStore, ROLE_LABELS, ROLE_COLORS } from '@/store/app-store'
import { useToast } from '@/hooks/use-toast'

export default function SettingsPage() {
  const { currentUser, isAdmin } = useAppStore()
  const { toast } = useToast()
  const [activeSection, setActiveSection] = useState('profile')

  const sections = [
    { id: 'profile', label: 'Perfil', icon: User },
    { id: 'dropbox', label: 'Dropbox', icon: Cloud },
    { id: 'team', label: 'Equipo', icon: Shield },
    { id: 'notifications', label: 'Notificaciones', icon: Bell },
    { id: 'appearance', label: 'Apariencia', icon: Palette },
    ...(isAdmin() ? [{ id: 'system', label: 'Sistema', icon: Database }] : []),
  ]

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Configuración</h1>
        <p className="text-base text-muted-foreground mt-1">Administra tu cuenta y preferencias</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <nav className="lg:w-56 shrink-0">
          <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible hide-scrollbar">
            {sections.map((section) => {
              const Icon = section.icon
              const active = activeSection === section.id
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    active
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {section.label}
                  {active && <ChevronRight className="h-4 w-4 ml-auto lg:hidden" />}
                </button>
              )
            })}
          </div>
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {activeSection === 'profile' && <ProfileSection />}
          {activeSection === 'dropbox' && <DropboxSection />}
          {activeSection === 'team' && <TeamSection />}
          {activeSection === 'notifications' && <NotificationsSection />}
          {activeSection === 'appearance' && <AppearanceSection />}
          {activeSection === 'system' && <SystemSection />}
        </div>
      </div>
    </div>
  )
}

function ProfileSection() {
  const { currentUser } = useAppStore()
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <Card className="rounded-xl">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold">Información Personal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-primary/20">
              <AvatarFallback className="text-lg font-bold bg-primary/10 text-primary">
                {currentUser?.name?.split(' ').map((n) => n[0]).join('').slice(0, 2) || 'CP'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-base font-semibold text-foreground">{currentUser?.name || 'Usuario'}</h3>
              <p className="text-sm text-muted-foreground">{currentUser?.email}</p>
              <Badge variant="outline" className={`mt-1.5 text-xs px-2 py-0.5 ${ROLE_COLORS[currentUser?.role || ''] || ''}`}>
                {ROLE_LABELS[currentUser?.role || ''] || 'Sin rol'}
              </Badge>
            </div>
          </div>
          <Separator />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Nombre completo</Label>
              <Input defaultValue={currentUser?.name || ''} className="h-10 text-sm rounded-lg" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Correo electrónico</Label>
              <Input defaultValue={currentUser?.email || ''} className="h-10 text-sm rounded-lg" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Teléfono</Label>
              <Input defaultValue={currentUser?.phone || ''} placeholder="+1 (555) 000-0000" className="h-10 text-sm rounded-lg" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Posición</Label>
              <Input defaultValue={currentUser?.position || ''} placeholder="Tu cargo" className="h-10 text-sm rounded-lg" />
            </div>
          </div>
          <div className="flex justify-end">
            <Button className="btn-castalia h-10 px-5 text-sm font-medium rounded-lg">Guardar Cambios</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold">Cambiar Contraseña</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Contraseña actual</Label>
            <Input type="password" placeholder="••••••••" className="h-10 text-sm rounded-lg" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Nueva contraseña</Label>
              <Input type="password" placeholder="••••••••" className="h-10 text-sm rounded-lg" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Confirmar contraseña</Label>
              <Input type="password" placeholder="••••••••" className="h-10 text-sm rounded-lg" />
            </div>
          </div>
          <div className="flex justify-end">
            <Button variant="outline" className="h-10 px-5 text-sm font-medium rounded-lg">Actualizar Contraseña</Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function TeamSection() {
  const { isAdmin } = useAppStore()
  if (!isAdmin()) {
    return (
      <Card className="rounded-xl border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Lock className="h-8 w-8 text-muted-foreground mb-3" />
          <h3 className="text-base font-semibold text-foreground">Acceso restringido</h3>
          <p className="text-sm text-muted-foreground mt-1">Solo administradores pueden gestionar el equipo</p>
        </CardContent>
      </Card>
    )
  }
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Miembros del equipo</h3>
        <Button className="btn-castalia gap-2 h-9 px-4 text-sm font-medium rounded-lg">
          <User className="h-4 w-4" /> Invitar Miembro
        </Button>
      </div>
      <Card className="rounded-xl">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground text-center py-8">
            La gestión de equipo estará disponible próximamente con la API de usuarios.
          </p>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function NotificationsSection() {
  const [settings, setSettings] = useState({
    emailNewPhoto: true,
    emailTaskAssigned: true,
    emailReport: false,
    pushMessages: true,
    pushTasks: true,
  })

  const toggle = (key: keyof typeof settings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Card className="rounded-xl">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold">Preferencias de Notificación</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Correo Electrónico</h4>
            <div className="space-y-3">
              {[
                { key: 'emailNewPhoto' as const, label: 'Nueva foto subida', desc: 'Recibir email cuando se sube una foto a tus proyectos' },
                { key: 'emailTaskAssigned' as const, label: 'Tarea asignada', desc: 'Notificación cuando te asignan una tarea' },
                { key: 'emailReport' as const, label: 'Reporte generado', desc: 'Recibir copia de reportes generados' },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                  </div>
                  <Switch checked={settings[item.key]} onCheckedChange={() => toggle(item.key)} />
                </div>
              ))}
            </div>
          </div>
          <Separator />
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Notificaciones Push</h4>
            <div className="space-y-3">
              {[
                { key: 'pushMessages' as const, label: 'Mensajes nuevos', desc: 'Notificación instantánea de mensajes' },
                { key: 'pushTasks' as const, label: 'Actualización de tareas', desc: 'Cambios en estado de tareas' },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                  </div>
                  <Switch checked={settings[item.key]} onCheckedChange={() => toggle(item.key)} />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function AppearanceSection() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Card className="rounded-xl">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold">Apariencia</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Tema</h4>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'light', label: 'Claro', icon: Sun },
                { id: 'dark', label: 'Oscuro', icon: Moon },
                { id: 'system', label: 'Sistema', icon: Globe },
              ].map((theme) => {
                const Icon = theme.icon
                return (
                  <button
                    key={theme.id}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-primary/20 bg-primary/5 text-sm font-medium text-primary transition-colors"
                  >
                    <Icon className="h-5 w-5" />
                    {theme.label}
                  </button>
                )
              })}
            </div>
          </div>
          <Separator />
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Idioma</h4>
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Español (Latinoamérica)</span>
              <Badge variant="outline" className="ml-auto text-xs">Predeterminado</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function DropboxSection() {
  const { toast } = useToast()
  const [token, setToken] = useState('')
  const [status, setStatus] = useState<'loading' | 'connected' | 'disconnected'>('loading')
  const [accountName, setAccountName] = useState('')
  const [accountEmail, setAccountEmail] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(null)

  // Backup/restore state
  const [backingUp, setBackingUp] = useState(false)
  const [restoring, setRestoring] = useState(false)

  useEffect(() => {
    checkStatus()
  }, [])

  const checkStatus = async () => {
    try {
      const res = await fetch('/api/dropbox')
      const data = await res.json()
      if (data.connected) {
        setStatus('connected')
        setAccountName(data.accountName || '')
        setAccountEmail(data.accountEmail || '')
        setLastBackupAt(data.lastBackupAt || null)
      } else {
        setStatus('disconnected')
      }
    } catch {
      setStatus('disconnected')
    }
  }

  const connect = async () => {
    if (!token.trim()) return
    setConnecting(true)
    try {
      const res = await fetch('/api/dropbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'connect', accessToken: token.trim() }),
      })
      const data = await res.json()
      if (data.success) {
        setStatus('connected')
        setAccountName(data.accountName || '')
        setAccountEmail(data.accountEmail || '')
        setToken('')
        toast({ title: 'Dropbox conectado', description: `Cuenta: ${data.accountName}` })
      } else {
        toast({ title: data.error || 'Error al conectar', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error de conexión', variant: 'destructive' })
    } finally {
      setConnecting(false)
    }
  }

  const disconnect = async () => {
    try {
      await fetch('/api/dropbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disconnect' }),
      })
      setStatus('disconnected')
      setAccountName('')
      setAccountEmail('')
      setLastBackupAt(null)
      toast({ title: 'Dropbox desconectado' })
    } catch {
      toast({ title: 'Error', variant: 'destructive' })
    }
  }

  const doBackup = async () => {
    setBackingUp(true)
    try {
      const res = await fetch('/api/dropbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'backup-db' }),
      })
      const data = await res.json()
      if (data.success) {
        setLastBackupAt(new Date().toISOString())
        toast({ title: 'Backup creado', description: data.message })
      } else {
        toast({ title: 'Error al crear backup', description: data.message, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error de conexión', variant: 'destructive' })
    } finally {
      setBackingUp(false)
    }
  }

  const doRestore = async () => {
    if (!confirm('Esto restaurará todos los datos (proyectos, fotos, categorías) desde el último backup en Dropbox. Los datos actuales se mezclarán. ¿Continuar?')) return
    setRestoring(true)
    try {
      const res = await fetch('/api/dropbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restore-db' }),
      })
      const data = await res.json()
      if (data.success) {
        toast({
          title: 'Datos restaurados',
          description: `${data.message} — ${data.stats?.projects || 0} proyectos, ${data.stats?.categorias || 0} categorías, ${data.stats?.photos || 0} fotos`,
        })
      } else {
        toast({ title: 'Error al restaurar', description: data.message, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error de conexión', variant: 'destructive' })
    } finally {
      setRestoring(false)
    }
  }

  const formatTime = (iso: string | null) => {
    if (!iso) return 'Nunca'
    const d = new Date(iso)
    return d.toLocaleDateString('es-LA', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      {/* Connection card */}
      <Card className="rounded-xl">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Cloud className="h-5 w-5" style={{ color: '#0061FF' }} />
            Conexión con Dropbox
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Status */}
          <div className="flex items-center justify-between p-3 rounded-xl border"
            style={{
              borderColor: status === 'connected' ? '#38C5B5' : '#E2E6EB',
              background: status === 'connected' ? '#F0FDFA' : '#FAFAFA',
            }}>
            <div className="flex items-center gap-3">
              {status === 'loading' ? (
                <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#ADB5B7', borderTopColor: 'transparent' }} />
              ) : status === 'connected' ? (
                <CheckCircle className="h-5 w-5" style={{ color: '#2DA194' }} />
              ) : (
                <CloudOff className="h-5 w-5" style={{ color: '#ADB5B7' }} />
              )}
              <div>
                <p className="text-sm font-semibold" style={{ color: '#1A2332' }}>
                  {status === 'loading' ? 'Verificando...' : status === 'connected' ? 'Conectado' : 'No conectado'}
                </p>
                {status === 'connected' && accountName && (
                  <p className="text-xs mt-0.5" style={{ color: '#5D7380' }}>{accountName} — {accountEmail}</p>
                )}
              </div>
            </div>
            {status === 'connected' && (
              <button onClick={disconnect} className="h-8 px-3 rounded-lg text-xs font-semibold border transition-colors"
                style={{ borderColor: '#E2E6EB', color: '#5D7380' }}>
                Desconectar
              </button>
            )}
          </div>

          {/* Token input */}
          {status === 'disconnected' && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium" style={{ color: '#35414A' }}>Token de acceso de Dropbox</label>
                <div className="flex gap-2">
                  <input
                    value={token}
                    onChange={e => setToken(e.target.value)}
                    placeholder="sl.xxxxxxxxxxxxx..."
                    className="flex-1 h-10 px-4 rounded-lg border text-sm focus:outline-none"
                    style={{ borderColor: '#E2E6EB', color: '#1A2332' }}
                    type="password"
                  />
                  <button onClick={connect} disabled={connecting || !token.trim()}
                    className="h-10 px-5 rounded-lg text-sm font-bold text-white disabled:opacity-40 transition-colors"
                    style={{ background: '#0061FF' }}>
                    {connecting ? '...' : 'Conectar'}
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-xl border" style={{ borderColor: '#E2E6EB', background: '#F7F8FA' }}>
                <p className="text-sm font-semibold mb-2" style={{ color: '#1A2332' }}>¿Cómo obtener el token?</p>
                <ol className="text-xs space-y-1.5" style={{ color: '#5D7380' }}>
                  <li>1. Ve a <strong>dropbox.com/developers/apps</strong></li>
                  <li>2. Crea una app → <strong>Scoped access</strong> → <strong>Full Dropbox</strong></li>
                  <li>3. En <strong>Permissions</strong>, activa: <code>files.content.write</code> y <code>files.content.read</code></li>
                  <li>4. Ve a la pestaña <strong>Generated access token</strong></li>
                  <li>5. Copia el token y pégalo aquí</li>
                </ol>
              </div>
            </>
          )}

          {/* Info when connected */}
          {status === 'connected' && (
            <div className="p-4 rounded-xl border" style={{ borderColor: '#99F6E4', background: '#F0FDFA' }}>
              <div className="flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0" style={{ color: '#2DA194' }} />
                <div>
                  <p className="text-sm font-semibold mb-1" style={{ color: '#115E59' }}>Dropbox como base de datos</p>
                  <p className="text-xs leading-relaxed" style={{ color: '#2DA194' }}>
                    Tus datos están protegidos. Cada foto se copia automáticamente a tu Dropbox en <strong>/Castalia Proyect/</strong>.
                    Además, se guarda un backup completo de la base de datos (proyectos, categorías, notas) como JSON.
                    Si pierdes datos, puedes restaurarlos desde Dropbox.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Backup & Restore card — only when connected */}
      {status === 'connected' && (
        <Card className="rounded-xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Database className="h-5 w-5" style={{ color: '#38C5B5' }} />
              Backup de Base de Datos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Last backup info */}
            <div className="flex items-center justify-between p-3 rounded-xl border" style={{ borderColor: '#E2E6EB', background: '#FAFAFA' }}>
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4" style={{ color: '#5D7380' }} />
                <div>
                  <p className="text-sm font-medium" style={{ color: '#1A2332' }}>Último backup</p>
                  <p className="text-xs" style={{ color: '#5D7380' }}>{formatTime(lastBackupAt)}</p>
                </div>
              </div>
              <Badge variant="outline" className="text-xs" style={{ borderColor: lastBackupAt ? '#38C5B5' : '#E2E6EB', color: lastBackupAt ? '#2DA194' : '#5D7380' }}>
                {lastBackupAt ? 'Protegido' : 'Sin backup'}
              </Badge>
            </div>

            {/* Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Backup button */}
              <button
                onClick={doBackup}
                disabled={backingUp}
                className="flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed transition-all"
                style={{
                  borderColor: '#38C5B5',
                  background: backingUp ? '#F0FDFA' : 'transparent',
                  opacity: backingUp ? 0.7 : 1,
                }}>
                {backingUp ? (
                  <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#38C5B5', borderTopColor: 'transparent' }} />
                ) : (
                  <HardDriveUpload className="h-4 w-4" style={{ color: '#38C5B5' }} />
                )}
                <div className="text-left">
                  <p className="text-sm font-semibold" style={{ color: '#2DA194' }}>
                    {backingUp ? 'Creando backup...' : 'Crear Backup Ahora'}
                  </p>
                  <p className="text-xs" style={{ color: '#5D7380' }}>Guarda todo en Dropbox</p>
                </div>
              </button>

              {/* Restore button */}
              <button
                onClick={doRestore}
                disabled={restoring}
                className="flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed transition-all"
                style={{
                  borderColor: '#F0A030',
                  background: restoring ? '#FFF7ED' : 'transparent',
                  opacity: restoring ? 0.7 : 1,
                }}>
                {restoring ? (
                  <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#F0A030', borderTopColor: 'transparent' }} />
                ) : (
                  <HardDriveDownload className="h-4 w-4" style={{ color: '#F0A030' }} />
                )}
                <div className="text-left">
                  <p className="text-sm font-semibold" style={{ color: '#C77E20' }}>
                    {restoring ? 'Restaurando...' : 'Restaurar Datos'}
                  </p>
                  <p className="text-xs" style={{ color: '#5D7380' }}>Recuperar desde Dropbox</p>
                </div>
              </button>
            </div>

            {/* Warning */}
            <div className="flex items-start gap-2 p-3 rounded-lg" style={{ background: '#FEF3C7' }}>
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" style={{ color: '#D97706' }} />
              <p className="text-xs leading-relaxed" style={{ color: '#92400E' }}>
                El backup incluye toda la estructura de datos (proyectos, categorías, notas, orden de fotos).
                Las fotos físicas también se respaldan cuando sincronizas un proyecto.
                Se guardan los últimos 10 backups automáticamente.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  )
}

function SystemSection() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <Card className="rounded-xl">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold">Información del Sistema</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { label: 'Versión', value: '1.1.0' },
            { label: 'Base de datos', value: 'SQLite + Dropbox Backup' },
            { label: 'Almacenamiento', value: 'Dropbox' },
            { label: 'Empresa', value: 'Castalia Collections' },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">{item.label}</span>
              <span className="text-sm font-medium text-foreground">{item.value}</span>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card className="rounded-xl border-destructive/20">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-destructive">Zona de Peligro</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Re-seed Base de Datos</p>
              <p className="text-xs text-muted-foreground mt-0.5">Elimina todos los datos y recrea los de demostración</p>
            </div>
            <Button
              variant="outline"
              className="h-9 px-4 text-sm rounded-lg text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={() => fetch('/api/seed', { method: 'POST' }).then(() => alert('Database re-seeded!'))}
            >
              Re-seed
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}