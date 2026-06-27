'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Building2, Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { useAppStore, type User } from '@/store/app-store'

const DEMO_ACCOUNTS = [
  { email: 'admin@castalia.com', password: 'admin123', role: 'Super Admin', label: 'A' },
  { email: 'carlos@castalia.com', password: 'password123', role: 'Gerente', label: 'G' },
  { email: 'jose@castalia.com', password: 'password123', role: 'Empleado', label: 'E' },
]

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()
  const login = useAppStore((s) => s.login)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) {
      toast({ title: 'Campos requeridos', description: 'Ingresa correo y contraseña', variant: 'destructive' })
      return
    }
    setIsSubmitting(true)
    try {
      // Try seeding first (idempotent)
      await fetch('/api/seed', { method: 'POST' }).catch(() => {})

      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Credenciales inválidas')
      }
      const data = await res.json()
      const user: User = data.user
      login(user, data.token || user.id)
      toast({ title: 'Bienvenido', description: `Hola, ${user.name}` })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al iniciar sesión'
      toast({ title: 'Error', description: message, variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const fillDemo = (account: (typeof DEMO_ACCOUNTS)[number]) => {
    setEmail(account.email)
    setPassword(account.password)
  }

  return (
    <div className="min-h-screen flex relative overflow-hidden" style={{ background: '#0A0E14' }}>
      {/* Ambient gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full opacity-[0.07]"
          style={{ background: 'radial-gradient(circle, #38C5B5 0%, transparent 70%)' }} />
        <div className="absolute top-1/2 -right-32 w-[500px] h-[500px] rounded-full opacity-[0.05]"
          style={{ background: 'radial-gradient(circle, #38C5B5 0%, transparent 70%)' }} />
        <div className="absolute -bottom-20 left-1/3 w-[400px] h-[400px] rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(circle, #2DA194 0%, transparent 70%)' }} />
        {/* Subtle grid */}
        <div className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: 'linear-gradient(rgba(56,197,181,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(56,197,181,0.5) 1px, transparent 1px)',
            backgroundSize: '80px 80px',
          }} />
      </div>

      {/* Left - Brand showcase (desktop) */}
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="hidden lg:flex lg:w-[52%] xl:w-[55%] flex-col justify-center relative z-10 px-14 xl:px-24"
      >
        {/* Logo */}
        <div className="flex items-center gap-4 mb-14">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #38C5B5 0%, #2DA194 100%)' }}>
            <Building2 className="w-8 h-8 text-white" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-[22px] font-bold text-white tracking-[-0.02em]">CASTALIA</h1>
            <p className="text-[11px] font-semibold tracking-[0.35em] uppercase"
              style={{ color: '#38C5B5' }}>PROYECT</p>
          </div>
        </div>

        {/* Tagline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <h2 className="text-[42px] xl:text-[52px] font-bold text-white leading-[1.1] tracking-[-0.03em] mb-7">
            Documentación
            <br />
            <span style={{ color: '#38C5B5' }}>visual</span> de
            <br />
            proyectos
          </h2>
          <p className="text-[17px] leading-relaxed max-w-md mb-12" style={{ color: '#8B949E' }}>
            Gestiona fotos, tareas, reportes y comunicación en un solo lugar.
            Mantén a tu equipo y clientes informados en tiempo real.
          </p>
        </motion.div>

        {/* Feature pills */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="flex flex-wrap gap-2.5"
        >
          {['Fotografía documental', 'Gestión de tareas', 'Reportes automáticos', 'Seguimiento en tiempo real'].map(
            (feature) => (
              <span key={feature}
                className="px-4 py-2.5 rounded-full text-[13px] font-medium border"
                style={{
                  background: 'rgba(56,197,181,0.06)',
                  borderColor: 'rgba(56,197,181,0.12)',
                  color: '#C8D1DC',
                }}>
                {feature}
              </span>
            )
          )}
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="flex gap-10 mt-14 pt-8"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          {[
            { value: '150+', label: 'Proyectos' },
            { value: '12K', label: 'Fotos' },
            { value: '98%', label: 'Satisfacción' },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-[28px] font-bold tracking-tight" style={{ color: '#38C5B5' }}>{stat.value}</div>
              <div className="text-[13px] mt-1" style={{ color: '#5D7380' }}>{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* Right - Login form */}
      <div className="flex-1 lg:max-w-[520px] flex items-center justify-center relative z-10 px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.15 }}
          className="w-full max-w-[400px]"
        >
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #38C5B5 0%, #2DA194 100%)' }}>
              <Building2 className="w-6 h-6 text-white" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-[18px] font-bold text-white tracking-[-0.02em]">CASTALIA PROYECT</h1>
            </div>
          </div>

          {/* Login card */}
          <div className="rounded-2xl border p-7 sm:p-9"
            style={{
              background: 'rgba(255,255,255,0.04)',
              backdropFilter: 'blur(24px)',
              borderColor: 'rgba(255,255,255,0.07)',
            }}>
            <div className="mb-7">
              <h3 className="text-[22px] font-bold text-white tracking-[-0.01em]">Iniciar sesión</h3>
              <p className="text-[15px] mt-1.5" style={{ color: '#5D7380' }}>Accede a tu panel de proyectos</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[14px] font-medium" style={{ color: '#C8D1DC' }}>
                  Correo electrónico
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 text-[15px] rounded-xl bg-white/[0.05] border-white/10 text-white placeholder:text-[#4A5568] focus-visible:border-[#38C5B5]/40 focus-visible:ring-[#38C5B5]/15 transition-colors"
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-[14px] font-medium" style={{ color: '#C8D1DC' }}>
                  Contraseña
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 text-[15px] rounded-xl bg-white/[0.05] border-white/10 text-white placeholder:text-[#4A5568] pr-11 focus-visible:border-[#38C5B5]/40 focus-visible:ring-[#38C5B5]/15 transition-colors"
                    autoComplete="current-password"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: '#5D7380' }}
                    aria-label={showPassword ? 'Ocultar' : 'Mostrar'}>
                    {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <Checkbox id="remember" className="border-white/20 data-[state=checked]:bg-[#38C5B5] data-[state=checked]:border-[#38C5B5]" />
                  <Label htmlFor="remember" className="text-[13px] cursor-pointer font-normal" style={{ color: '#5D7380' }}>
                    Recordarme
                  </Label>
                </div>
                <button type="button"
                  className="text-[13px] font-medium transition-colors hover:underline"
                  style={{ color: '#38C5B5' }}>
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              {/* Primary CTA button */}
              <button type="submit" disabled={isSubmitting}
                className="w-full h-[52px] rounded-xl text-[15px] font-semibold text-white flex items-center justify-center gap-2.5 transition-all duration-300 mt-2 disabled:opacity-60"
                style={{
                  background: 'linear-gradient(135deg, #38C5B5 0%, #2DA194 100%)',
                  boxShadow: '0 2px 16px rgba(56,197,181,0.25)',
                }}>
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Iniciar sesión
                    <ArrowRight className="w-4.5 h-4.5" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Demo accounts */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="mt-5 rounded-xl border p-4"
            style={{
              background: 'rgba(255,255,255,0.025)',
              borderColor: 'rgba(255,255,255,0.05)',
            }}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] mb-3" style={{ color: '#4A5568' }}>
              Cuentas de demostración
            </p>
            <div className="space-y-1.5">
              {DEMO_ACCOUNTS.map((account) => (
                <button key={account.email} type="button" onClick={() => fillDemo(account)}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg border transition-all duration-200 group"
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    borderColor: 'rgba(255,255,255,0.04)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(56,197,181,0.2)'; e.currentTarget.style.background = 'rgba(56,197,181,0.04)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-[12px] font-bold"
                      style={{ background: 'rgba(56,197,181,0.1)', color: '#38C5B5' }}>
                      {account.label}
                    </div>
                    <div className="text-left min-w-0">
                      <p className="text-[13px] text-white font-medium truncate">{account.email}</p>
                      <p className="text-[11px]" style={{ color: '#4A5568' }}>{account.role}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono shrink-0" style={{ color: '#35414A' }}>
                    {account.password}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}