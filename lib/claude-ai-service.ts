'use client'

import { DashboardEvent, EmailCampaignStats, CalendarBooking } from './dashboard-store'

export interface AIResponse {
  content: string
  actions?: Array<{
    type: 'event_created' | 'csv_processed' | 'email_campaign' | 'venue_search' | 'data_query'
    status: 'completed' | 'pending' | 'failed'
    details: string
  }>
}

export class ClaudeAIService {
  constructor() {
    // No client initialization needed - using secure API route
  }

  async processMessage(userMessage: string, dashboardData: {
    events: DashboardEvent[]
    campaigns: EmailCampaignStats[]
    bookings: CalendarBooking[]
    totals: {
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
  }, conversationHistory?: Array<{
    type: 'user' | 'assistant'
    content: string
    timestamp: Date
  }>): Promise<AIResponse> {
    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          dashboardData,
          conversationHistory
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to get AI response')
      }

      const result: AIResponse = await response.json()
      return result
    } catch (error) {
      console.error('Claude AI Service Error:', error)
      return {
        content: 'I apologize, but I encountered an error while processing your request. Please check that your API key is properly configured and try again.',
        actions: [{
          type: 'data_query',
          status: 'failed',
          details: error instanceof Error ? error.message : 'Unknown error occurred'
        }]
      }
    }
  }
}

// Export a singleton instance for backward compatibility
export const claudeAI = new ClaudeAIService()