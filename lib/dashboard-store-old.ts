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
  updateEvent: (eventId: string, updates: Partial<DashboardEvent>) => void
  onEmailSent: (eventId: string, count: number) => void
  onEmailOpened: (eventId: string, count: number) => void
  onEmailReplied: (eventId: string, reply: { sentiment: string; participantEmail: string; content?: string }) => void
  onBookingReceived: (eventId: string, booking: { participantEmail: string; participantName: string; eventDate: Date }) => void
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

      getDashboardTotals: () => {
        const state = get()
        const activeEvents = state.events.filter(e => e.status === 'active').length
        const totalEmailsSent = state.events.reduce((sum, event) => sum + (event.emailsSent || 0), 0)
        const totalEmailsReplied = state.events.reduce((sum, event) => sum + (event.emailsReplied || 0), 0)
        const averageResponseRate = totalEmailsSent > 0 ? (totalEmailsReplied / totalEmailsSent) * 100 : 0

        return {
          totalEvents: state.events.length,
          activeEvents,
          totalEmailsSent,
          averageResponseRate,
          totalBookings: state.bookings.length,
          recentActivity: [
            ...state.bookings.slice(-10).map(booking => ({
              type: 'booking_received' as const,
              eventName: state.events.find(e => e.id === booking.eventId)?.name || 'Unknown Event',
              timestamp: booking.bookingDate,
              details: `${booking.participantName} booked for ${booking.eventDate.toLocaleDateString()}`
            }))
          ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 5)
        }
      }
    }))

export default useDashboardStore