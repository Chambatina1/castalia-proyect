'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Send, Hash, Lock, Search } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAppStore } from '@/store/app-store'

interface Message { id: string; content: string; senderId: string; sender?: { name: string }; isInternal?: boolean; createdAt: string }

export default function ChatPage() {
  const { goBack, currentUser, isManagerOrAdmin, projects } = useAppStore()
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const projectId = selectedChannel || undefined
    fetch(`/api/chat${projectId ? `?projectId=${projectId}` : ''}`).then(r => r.json()).then(data => {
      if (Array.isArray(data)) setMessages(data)
    }).catch(() => {})
  }, [selectedChannel])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const sendMessage = () => {
    if (!newMessage.trim()) return
    const msg: Message = {
      id: Date.now().toString(), content: newMessage, senderId: currentUser?.id || '',
      sender: { name: currentUser?.name || 'Tú' }, createdAt: new Date().toISOString(),
    }
    setMessages(prev => [...prev, msg])
    setNewMessage('')
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#F7F8FA' }}>
      {/* Sidebar */}
      <div className="hidden md:block w-[280px] shrink-0 border-r" style={{ borderColor: '#E2E6EB', background: '#FFFFFF' }}>
        <div className="h-[72px] flex items-center gap-3 px-5 border-b" style={{ borderColor: '#E2E6EB' }}>
          <button onClick={goBack} className="md:hidden p-2 rounded-xl hover:bg-black/5">
            <ArrowLeft className="w-5 h-5" style={{ color: '#35414A' }} />
          </button>
          <h1 className="text-[18px] font-bold" style={{ color: '#1A2332' }}>Chat</h1>
        </div>
        <ScrollArea className="h-[calc(100vh-72px)]">
          {/* General channel */}
          <button onClick={() => setSelectedChannel(null)}
            className="w-full flex items-center gap-3 px-5 py-3 text-left transition-colors"
            style={{ background: selectedChannel === null ? 'rgba(56,197,181,0.06)' : 'transparent' }}>
            <Hash className="w-4 h-4" style={{ color: selectedChannel === null ? '#38C5B5' : '#ADB5B7' }} />
            <span className="text-[14px] font-medium" style={{ color: selectedChannel === null ? '#38C5B5' : '#35414A' }}>General</span>
          </button>
          {/* Project channels */}
          {projects.filter(p => p.status === 'ACTIVE').slice(0, 5).map(p => (
            <button key={p.id} onClick={() => setSelectedChannel(p.id)}
              className="w-full flex items-center gap-3 px-5 py-3 text-left transition-colors"
              style={{ background: selectedChannel === p.id ? 'rgba(56,197,181,0.06)' : 'transparent' }}>
              <Hash className="w-4 h-4" style={{ color: selectedChannel === p.id ? '#38C5B5' : '#ADB5B7' }} />
              <span className="text-[14px] font-medium truncate" style={{ color: selectedChannel === p.id ? '#38C5B5' : '#35414A' }}>
                {p.name}
              </span>
            </button>
          ))}
        </ScrollArea>
      </div>

      {/* Main chat */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="h-[72px] flex items-center gap-3 px-4 lg:px-6 border-b shrink-0"
          style={{ borderColor: '#E2E6EB', background: '#FFFFFF' }}>
          <button onClick={goBack} className="md:hidden p-2 rounded-xl hover:bg-black/5">
            <ArrowLeft className="w-5 h-5" style={{ color: '#35414A' }} />
          </button>
          <Hash className="w-5 h-5" style={{ color: '#38C5B5' }} />
          <div>
            <h2 className="text-[16px] font-bold" style={{ color: '#1A2332' }}>
              {selectedChannel ? projects.find(p => p.id === selectedChannel)?.name || 'Proyecto' : 'Chat General'}
            </h2>
            <p className="text-[12px]" style={{ color: '#5D7380' }}>
              {isManagerOrAdmin() ? 'Managers y equipo' : 'Equipo de trabajo'}
            </p>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4">
          {messages.map(msg => {
            const isMe = msg.senderId === currentUser?.id
            return (
              <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                <Avatar className="w-8 h-8 shrink-0">
                  <AvatarFallback className="text-[11px] font-bold text-white"
                    style={{ background: isMe ? 'linear-gradient(135deg,#38C5B5,#2DA194)' : 'linear-gradient(135deg,#5D7380,#35414A)' }}>
                    {(msg.sender?.name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className={`max-w-[70%] ${isMe ? 'text-right' : ''}`}>
                  {!isMe && (
                    <p className="text-[12px] font-semibold mb-0.5" style={{ color: '#35414A' }}>{msg.sender?.name}</p>
                  )}
                  <div className="inline-block px-4 py-2.5 rounded-2xl text-[14px]"
                    style={{
                      background: isMe ? 'linear-gradient(135deg, #38C5B5, #2DA194)' : '#FFFFFF',
                      color: isMe ? 'white' : '#1A2332',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                    }}>
                    {msg.content}
                  </div>
                  {msg.isInternal && (
                    <div className="flex items-center gap-1 justify-end mt-0.5">
                      <Lock className="w-3 h-3" style={{ color: '#ADB5B7' }} />
                      <span className="text-[10px]" style={{ color: '#ADB5B7' }}>Solo managers</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
          {messages.length === 0 && (
            <div className="text-center py-16">
              <p className="text-[15px] font-semibold" style={{ color: '#35414A' }}>Sin mensajes aún</p>
              <p className="text-[13px] mt-1" style={{ color: '#ADB5B7' }}>Sé el primero en escribir</p>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-4 border-t flex gap-2 shrink-0" style={{ borderColor: '#E2E6EB', background: '#FFFFFF' }}>
          <Input placeholder="Escribe un mensaje..."
            value={newMessage} onChange={e => setNewMessage(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            className="flex-1 h-11 rounded-xl text-[14px] border-[#E2E6EB]" />
          <button onClick={sendMessage}
            className="w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0 transition-all"
            style={{ background: 'linear-gradient(135deg, #38C5B5, #2DA194)' }}>
            <Send className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>
    </div>
  )
}