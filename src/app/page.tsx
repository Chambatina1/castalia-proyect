'use client'

import { useAppStore } from '@/store/app-store'
import LoginPage from '@/components/castalia/login-page'
import DashboardPage from '@/components/castalia/dashboard-page'
import ProjectDetailPage from '@/components/castalia/project-detail-page'
import TasksPage from '@/components/castalia/tasks-page'
import ChatPage from '@/components/castalia/chat-page'

export default function Home() {
  const currentView = useAppStore((s) => s.currentView)

  if (currentView === 'login') return <LoginPage />

  const views: Record<string, React.ReactNode> = {
    dashboard: <DashboardPage />,
    projects: <DashboardPage />,
    'project-detail': <ProjectDetailPage />,
    tasks: <TasksPage />,
    chat: <ChatPage />,
    reports: <DashboardPage />, // Placeholder - will show dashboard
    clients: <DashboardPage />,
    settings: <DashboardPage />,
    'client-portal': <DashboardPage />,
  }

  return views[currentView] || <DashboardPage />
}