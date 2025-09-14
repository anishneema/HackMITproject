'use client'

import { create } from 'zustand'
import { apiService } from './api-service'

export interface DashboardEvent {
  id: string
  name: string
  date: string
  time: string
  targetDonors: number
  currentRSVPs: number
  venue: string
  status: 'draft' | 'active' | 'completed' | 'cancelled'
  emailsSent?: number
  emailsOpened?: number
  emailsReplied?: number
  lastEmailSent?: Date
  createdAt: Date
  updatedAt: Date
}

export interface EmailCampaignStats {
  id: string
  eventId: string
  name: string
  totalSent: number
  opened: number
  replied: number
  bounced: number
  unsubscribed: number
  responseRate: number
  sentimentBreakdown: {
    positive: number
    negative: number
    neutral: number
    questions: number
  }
  lastActivity: Date
  status: 'draft' | 'sending' | 'completed' | 'paused'
}

export interface CalendarBooking {
  id: string
  eventId: string
  participantEmail: string
  participantName: string
  bookingDate: Date
  eventDate: Date
  status: 'confirmed' | 'tentative' | 'cancelled'
  source: 'email_response' | 'direct_booking' | 'phone' | 'other'
}

export interface AIActivity {
  id: string
  action: string
  details: string
  timestamp: Date
  status: 'completed' | 'active' | 'scheduled' | 'failed'
  type: 'venue' | 'email' | 'followup' | 'volunteer' | 'sms' | 'ai_response' | 'booking' | 'campaign'
  eventId?: string
}

export interface DashboardStore {
  events: DashboardEvent[]
  campaigns: EmailCampaignStats[]
  bookings: CalendarBooking[]
  activities: AIActivity[]
  isLoading: boolean
  error: string | null

  // Local store methods
  addEvent: (event: Omit<DashboardEvent, 'id' | 'createdAt' | 'updatedAt'>) => string
  updateEvent: (eventId: string, updates: Partial<DashboardEvent>) => void
  onEmailSent: (eventId: string, count: number) => void
  onEmailOpened: (eventId: string, count: number) => void
  onEmailReplied: (eventId: string, reply: { sentiment: string; participantEmail: string; content?: string }) => void
  onBookingReceived: (eventId: string, booking: { participantEmail: string; participantName: string; eventDate: Date }) => void

  // API methods
  loadEvents: () => Promise<void>
  loadCampaigns: () => Promise<void>
  loadBookings: () => Promise<void>
  loadActivities: () => Promise<void>
  refreshDashboard: () => Promise<void>
  createEventAPI: (event: Omit<DashboardEvent, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>
  createActivity: (activity: Omit<AIActivity, 'id' | 'timestamp'>) => Promise<void>

  getDashboardTotals: () => {
    totalEvents: number
    activeEvents: number
    totalEmailsSent: number
    averageResponseRate: number
    totalBookings: number
    recentActivity: Array<{
      type: 'email_sent' | 'email_replied' | 'booking_received'
      eventName: string
      timestamp: Date
      details: string
    }>
  }
}

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2)

export const useDashboardStore = create<DashboardStore>()((set, get) => ({
  events: [],
  campaigns: [],
  bookings: [],
  activities: [],
  isLoading: false,
  error: null,

  addEvent: (eventData) => {
    const id = generateId()
    const event: DashboardEvent = {
      ...eventData,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    set((state) => ({
      events: [...state.events, event]
    }))

    return id
  },

  updateEvent: (eventId, updates) => {
    set((state) => ({
      events: state.events.map(event =>
        event.id === eventId
          ? { ...event, ...updates, updatedAt: new Date() }
          : event
      )
    }))
  },

  onEmailSent: (eventId, count) => {
    set((state) => ({
      events: state.events.map(event =>
        event.id === eventId
          ? {
              ...event,
              emailsSent: (event.emailsSent || 0) + count,
              lastEmailSent: new Date(),
              updatedAt: new Date()
            }
          : event
      )
    }))
  },

  onEmailOpened: (eventId, count) => {
    set((state) => ({
      events: state.events.map(event =>
        event.id === eventId
          ? {
              ...event,
              emailsOpened: (event.emailsOpened || 0) + count,
              updatedAt: new Date()
            }
          : event
      )
    }))
  },

  onEmailReplied: (eventId, reply) => {
    set((state) => ({
      events: state.events.map(event =>
        event.id === eventId
          ? {
              ...event,
              emailsReplied: (event.emailsReplied || 0) + 1,
              updatedAt: new Date()
            }
          : event
      )
    }))
  },

  onBookingReceived: (eventId, booking) => {
    const newBooking: CalendarBooking = {
      id: generateId(),
      eventId,
      participantEmail: booking.participantEmail,
      participantName: booking.participantName,
      bookingDate: new Date(),
      eventDate: booking.eventDate,
      status: 'confirmed',
      source: 'email_response'
    }

    set((state) => ({
      bookings: [...state.bookings, newBooking],
      events: state.events.map(event =>
        event.id === eventId
          ? {
              ...event,
              currentRSVPs: (event.currentRSVPs || 0) + 1,
              updatedAt: new Date()
            }
          : event
      )
    }))
  },

  // API methods
  loadEvents: async () => {
    try {
      set({ isLoading: true, error: null })
      const apiEvents = await apiService.getEvents()
      const events = apiEvents.map(event => ({
        ...event,
        lastEmailSent: event.lastEmailSent ? new Date(event.lastEmailSent) : undefined,
        createdAt: new Date(event.createdAt),
        updatedAt: new Date(event.updatedAt)
      }))
      set({ events, isLoading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load events',
        isLoading: false
      })
    }
  },

  loadCampaigns: async () => {
    try {
      set({ isLoading: true, error: null })
      const apiCampaigns = await apiService.getCampaigns()
      const campaigns = apiCampaigns.map(campaign => ({
        ...campaign,
        lastActivity: new Date(campaign.lastActivity)
      }))
      set({ campaigns, isLoading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load campaigns',
        isLoading: false
      })
    }
  },

  loadBookings: async () => {
    try {
      set({ isLoading: true, error: null })
      const apiBookings = await apiService.getBookings()
      const bookings = apiBookings.map(booking => ({
        ...booking,
        bookingDate: new Date(booking.bookingDate),
        eventDate: new Date(booking.eventDate)
      }))
      set({ bookings, isLoading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load bookings',
        isLoading: false
      })
    }
  },

  loadActivities: async () => {
    try {
      set({ isLoading: true, error: null })
      const apiActivities = await apiService.getActivities()
      const activities = apiActivities.map(activity => ({
        ...activity,
        timestamp: new Date(activity.timestamp)
      }))
      set({ activities, isLoading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load activities',
        isLoading: false
      })
    }
  },

  refreshDashboard: async () => {
    const { loadEvents, loadCampaigns, loadBookings, loadActivities } = get()
    await Promise.all([
      loadEvents(),
      loadCampaigns(),
      loadBookings(),
      loadActivities()
    ])
  },

  createActivity: async (activityData) => {
    try {
      const apiActivity = await apiService.createActivity(activityData)
      const activity = {
        ...apiActivity,
        timestamp: new Date(apiActivity.timestamp)
      }
      set(state => ({
        activities: [activity, ...state.activities]
      }))
    } catch (error) {
      console.error('Failed to create activity:', error)
    }
  },

  createEventAPI: async (eventData) => {
    try {
      set({ isLoading: true, error: null })
      const apiEvent = await apiService.createEvent(eventData)
      const event = {
        ...apiEvent,
        lastEmailSent: apiEvent.lastEmailSent ? new Date(apiEvent.lastEmailSent) : undefined,
        createdAt: new Date(apiEvent.createdAt),
        updatedAt: new Date(apiEvent.updatedAt)
      }
      set(state => ({
        events: [...state.events, event],
        isLoading: false
      }))
      return event.id
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create event',
        isLoading: false
      })
      throw error
    }
  },

  getDashboardTotals: () => {
    const state = get()
    const activeEvents = state.events.filter(e => e.status === 'active').length
    const totalEmailsSent = state.events.reduce((sum, event) => sum + (event.emailsSent || 0), 0)
    const totalEmailsReplied = state.events.reduce((sum, event) => sum + (event.emailsReplied || 0), 0)
    const averageResponseRate = totalEmailsSent > 0 ? (totalEmailsReplied / totalEmailsSent) * 100 : 0

    // Create stable recent activity array to prevent infinite re-renders
    const recentActivity = state.bookings.slice(-10).map(booking => ({
      type: 'booking_received' as const,
      eventName: state.events.find(e => e.id === booking.eventId)?.name || 'Unknown Event',
      timestamp: booking.bookingDate,
      details: `${booking.participantName} booked for ${booking.eventDate.toLocaleDateString()}`
    })).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 5)

    return {
      totalEvents: state.events.length,
      activeEvents,
      totalEmailsSent,
      averageResponseRate,
      totalBookings: state.bookings.length,
      recentActivity
    }
  }
}))

export default useDashboardStore