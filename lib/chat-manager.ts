'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface ChatMessage {
  id: string
  type: "user" | "assistant"
  content: string
  timestamp: Date
  actions?: Array<{
    type: "venue_search" | "email_campaign" | "event_created" | "csv_processed" | "data_query"
    status: "pending" | "completed" | "failed"
    details: string
  }>
}

export interface ChatSession {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: Date
  updatedAt: Date
  isProcessing?: boolean
}

export interface ChatStore {
  sessions: ChatSession[]
  activeSessionId: string | null
  backgroundProcessing: Map<string, boolean>

  // Session management
  createSession: (title?: string) => string
  deleteSession: (sessionId: string) => void
  setActiveSession: (sessionId: string) => void
  getActiveSession: () => ChatSession | null
  updateSessionTitle: (sessionId: string, title: string) => void

  // Message management
  addMessage: (sessionId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>) => string
  updateMessage: (sessionId: string, messageId: string, updates: Partial<ChatMessage>) => void
  getMessages: (sessionId: string) => ChatMessage[]

  // Background processing
  setProcessing: (sessionId: string, isProcessing: boolean) => void
  isProcessing: (sessionId: string) => boolean

  // Auto-naming
  generateSessionTitle: (firstMessage: string) => string
}

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2)

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      sessions: [],
      activeSessionId: null,
      backgroundProcessing: new Map(),

      createSession: (title?: string) => {
        const sessionId = generateId()
        const session: ChatSession = {
          id: sessionId,
          title: title || 'New Chat',
          messages: [{
            id: generateId(),
            type: 'assistant',
            content: "Hello! I'm your intelligent Blood Drive AI Assistant. I have access to all your real-time dashboard data and can help you with:\n\n• Answering questions about events, volunteers, and analytics\n• Creating new blood drive events\n• Processing CSV uploads for donor outreach\n• Providing insights and recommendations\n\nTry asking me something like: \"How many volunteers do we have on Thursday September 14th?\" or \"What's our email response rate for the community center drive?\"",
            timestamp: new Date()
          }],
          createdAt: new Date(),
          updatedAt: new Date()
        }

        set(state => ({
          sessions: [session, ...state.sessions],
          activeSessionId: sessionId
        }))

        return sessionId
      },

      deleteSession: (sessionId: string) => {
        set(state => ({
          sessions: state.sessions.filter(s => s.id !== sessionId),
          activeSessionId: state.activeSessionId === sessionId ? null : state.activeSessionId
        }))
      },

      setActiveSession: (sessionId: string) => {
        set({ activeSessionId: sessionId })
      },

      getActiveSession: () => {
        const state = get()
        return state.sessions.find(s => s.id === state.activeSessionId) || null
      },

      updateSessionTitle: (sessionId: string, title: string) => {
        set(state => ({
          sessions: state.sessions.map(session =>
            session.id === sessionId
              ? { ...session, title, updatedAt: new Date() }
              : session
          )
        }))
      },

      addMessage: (sessionId: string, messageData: Omit<ChatMessage, 'id' | 'timestamp'>) => {
        const messageId = generateId()
        const message: ChatMessage = {
          ...messageData,
          id: messageId,
          timestamp: new Date()
        }

        set(state => ({
          sessions: state.sessions.map(session =>
            session.id === sessionId
              ? {
                  ...session,
                  messages: [...session.messages, message],
                  updatedAt: new Date()
                }
              : session
          )
        }))

        // Auto-generate title if this is the first user message
        const session = get().sessions.find(s => s.id === sessionId)
        if (session && messageData.type === 'user' && session.title === 'New Chat') {
          const newTitle = get().generateSessionTitle(messageData.content)
          get().updateSessionTitle(sessionId, newTitle)
        }

        return messageId
      },

      updateMessage: (sessionId: string, messageId: string, updates: Partial<ChatMessage>) => {
        set(state => ({
          sessions: state.sessions.map(session =>
            session.id === sessionId
              ? {
                  ...session,
                  messages: session.messages.map(msg =>
                    msg.id === messageId ? { ...msg, ...updates } : msg
                  ),
                  updatedAt: new Date()
                }
              : session
          )
        }))
      },

      getMessages: (sessionId: string) => {
        const session = get().sessions.find(s => s.id === sessionId)
        return session?.messages || []
      },

      setProcessing: (sessionId: string, isProcessing: boolean) => {
        const state = get()
        // Ensure backgroundProcessing is a Map
        let currentProcessing = state.backgroundProcessing
        if (!(currentProcessing instanceof Map)) {
          currentProcessing = new Map(Object.entries(currentProcessing || {}))
        }
        
        const newProcessing = new Map(currentProcessing)
        if (isProcessing) {
          newProcessing.set(sessionId, true)
        } else {
          newProcessing.delete(sessionId)
        }

        set({
          backgroundProcessing: newProcessing,
          sessions: state.sessions.map(session =>
            session.id === sessionId
              ? { ...session, isProcessing }
              : session
          )
        })
      },

      isProcessing: (sessionId: string) => {
        const processing = get().backgroundProcessing
        // Handle case where backgroundProcessing might be serialized as plain object
        if (processing instanceof Map) {
          return processing.has(sessionId)
        } else {
          // If it's a plain object (from serialization), convert back to Map
          const map = new Map(Object.entries(processing || {}))
          return map.has(sessionId)
        }
      },

      generateSessionTitle: (firstMessage: string) => {
        const message = firstMessage.toLowerCase().trim()

        // Extract key topics for auto-naming
        if (message.includes('volunteer') && message.includes('thursday')) {
          return 'Thursday Volunteers'
        }
        if (message.includes('email') && message.includes('rate')) {
          return 'Email Response Rates'
        }
        if (message.includes('create') && message.includes('event')) {
          return 'Create New Event'
        }
        if (message.includes('analytics') || message.includes('dashboard')) {
          return 'Dashboard Analytics'
        }
        if (message.includes('csv') || message.includes('upload')) {
          return 'CSV Upload'
        }
        if (message.includes('campaign')) {
          return 'Email Campaign'
        }
        if (message.includes('venue') || message.includes('location')) {
          return 'Venue Search'
        }

        // Fallback: use first few words
        const words = firstMessage.split(' ').slice(0, 3)
        return words.join(' ').substring(0, 30) + (firstMessage.length > 30 ? '...' : '')
      }
    }),
    {
      name: 'blood-drive-chat-storage',
      version: 1,
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name)
          if (!str) return null
          const parsed = JSON.parse(str)
          // Convert backgroundProcessing back to Map
          if (parsed.state && parsed.state.backgroundProcessing && !(parsed.state.backgroundProcessing instanceof Map)) {
            parsed.state.backgroundProcessing = new Map(Object.entries(parsed.state.backgroundProcessing))
          }
          return parsed
        },
        setItem: (name, value) => {
          // Convert Map to plain object for serialization
          if (value.state && value.state.backgroundProcessing instanceof Map) {
            value.state.backgroundProcessing = Object.fromEntries(value.state.backgroundProcessing)
          }
          localStorage.setItem(name, JSON.stringify(value))
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
    }
  )
)