'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/store/app-store'
import { AppLayout } from '@/components/castalia/app-layout'
import LoginPage from '@/components/castalia/login-page'
import DashboardPage from '@/components/castalia/dashboard-page'
import ProjectDetailPage from '@/components/castalia/project-detail-page'
import TasksPage from '@/components/castalia/tasks-page'
import ChatPage from '@/components/castalia/chat-page'
import ReportsPage from '@/components/castalia/reports-page'
import ClientsPage from '@/components/castalia/clients-page'
import SettingsPage from '@/components/castalia/settings-page'

export default function Home() {
  const currentView = useAppStore((s) => s.currentView)
  const isAuthenticated = useAppStore((s) => s.isAuthenticated)
  const login = useAppStore((s) => s.login)
  const [ready, setReady] = useState(false)

  // Seed DB + restore session from localStorage on first load
  useEffect(() => {
    if (isAuthenticated) { setReady(true); return }
    ;(async () => {
      try {
        // 1. Ensure DB has users (idempotent seed)
        await fetch('/api/seed', { method: 'POST' }).catch(() => {})

        // 2. Try restoring session from localStorage
        const raw = localStorage.getItem('castalia-auth')
        if (raw) {
          const { currentUser, token } = JSON.parse(raw)
          if (currentUser && token) {
            // Verify user still exists in DB, get fresh data
            try {
              const verifyRes = await fetch('/api/auth/verify', {
                headers: { 'x-user-id': currentUser.id },
              })
              if (verifyRes.ok) {
                const freshUser = await verifyRes.json()
                login(freshUser, freshUser.id)
              } else {
                // User not in DB anymore, clear stale session
                localStorage.removeItem('castalia-auth')
              }
            } catch {
              // If verify fails, still try to login with cached data
              login(currentUser, token)
            }
          }
        }
      } catch {}
      setReady(true)
    })()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!ready && !isAuthenticated) {
    return null // Wait for init before showing anything
  }

  const views: Record<string, React.ReactNode> = {
    dashboard: <DashboardPage />,
    projects: <DashboardPage />,
    'project-detail': <ProjectDetailPage />,
    tasks: <TasksPage />,
    chat: <ChatPage />,
    reports: <ReportsPage />,
    clients: <ClientsPage />,
    settings: <SettingsPage />,
    'client-portal': <DashboardPage />,
  }

  return (
    <AppLayout>
      {currentView === 'login' ? <LoginPage /> : (views[currentView] || <DashboardPage />)}
    </AppLayout>
  )
}