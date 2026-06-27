'use client'

import { useEffect } from 'react'
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

  // Restore session from localStorage on first load
  useEffect(() => {
    if (isAuthenticated) return
    try {
      const raw = localStorage.getItem('castalia-auth')
      if (raw) {
        const { currentUser, token } = JSON.parse(raw)
        if (currentUser && token) {
          login(currentUser, token)
        }
      }
    } catch {}
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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