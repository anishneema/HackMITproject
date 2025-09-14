'use client'

import { create } from 'zustand'
import { subscribeWithSelector, persist } from 'zustand/middleware'

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

export interface DashboardStore {
  events: DashboardEvent[]
  campaigns: EmailCampaignStats[]
  bookings: CalendarBooking[]
  addEvent: (event: Omit<DashboardEvent, 'id' | 'createdAt' | 'updatedAt'>) => string
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

  addEvent: (eventData) => {
    console.log("Dashboard store addEvent called with:", eventData)
    const id = generateId()
    const event: DashboardEvent = {
      ...eventData,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    set((state) => {
      const newEvents = [...state.events, event]
      console.log("Dashboard store updating events:", newEvents)
      return {
        events: newEvents
      }
    })

    console.log("Dashboard store addEvent returning ID:", id)
    return id
  },

  getDashboardTotals: () => {
    const state = get()
    const activeEvents = state.events.filter(e => e.status === 'active').length

    return {
      totalEvents: state.events.length,
      activeEvents,
      totalEmailsSent: 0,
      averageResponseRate: 0,
      totalBookings: 0,
      recentActivity: []
    }
  }
}))

export default useDashboardStore