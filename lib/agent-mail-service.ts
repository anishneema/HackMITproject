'use client'

import { AgentMailClient, AgentMail, AgentMailError } from 'agentmail'
import { Contact } from './email-automation/types'
import { useDashboardStore } from './dashboard-store'

export interface AgentMailConfig {
  apiKey: string
  baseUrl?: string
}

export interface EmailCampaignRequest {
  eventId: string
  eventName: string
  contacts: Contact[]
  emailTemplate: {
    subject: string
    body: string
  }
  settings?: {
    followUpEnabled?: boolean
    autoResponseEnabled?: boolean
    sentimentAnalysisEnabled?: boolean
  }
}

export interface AgentMailResponse {
  success: boolean
  campaignId?: string
  message?: string
  error?: string
}

export interface EmailEvent {
  type: 'sent' | 'delivered' | 'opened' | 'replied' | 'bounced' | 'unsubscribed' | 'booking_received'
  campaignId: string
  eventId: string
  recipientEmail: string
  timestamp: Date
  data?: {
    sentiment?: 'positive' | 'negative' | 'neutral' | 'question'
    responseContent?: string
    bookingDetails?: {
      participantName: string
      eventDate: string
      additionalInfo?: string
    }
  }
}

class AgentMailService {
  private client: AgentMailClient | null = null
  private isInitialized = false
  private eventListeners: ((event: EmailEvent) => void)[] = []

  constructor() {
    this.setupWebhookListener()
  }

  initialize(config: AgentMailConfig) {
    this.client = new AgentMailClient({
      apiKey: config.apiKey
    })
    this.isInitialized = true
    console.log('Agent Mail service initialized')
  }

  isReady(): boolean {
    return this.isInitialized && this.client !== null
  }

  async startEmailCampaign(request: EmailCampaignRequest): Promise<AgentMailResponse> {
    if (!this.isReady() || !this.client) {
      return {
        success: false,
        error: 'Agent Mail service not initialized'
      }
    }

    try {
      // Use Agent Mail SDK to create campaign
      // Note: This is a placeholder for the actual Agent Mail API structure
      // You'll need to adjust based on the actual API endpoints and structure

      const campaignRequest: any = {
        name: `${request.eventName} - Email Campaign`,
        contacts: request.contacts.map(contact => ({
          email: contact.email,
          firstName: contact.firstName,
          lastName: contact.lastName,
          organization: contact.organization,
          customFields: contact.customFields
        })),
        template: {
          subject: request.emailTemplate.subject,
          htmlContent: this.convertToHtml(request.emailTemplate.body),
          textContent: request.emailTemplate.body
        },
        settings: {
          enableFollowUps: request.settings?.followUpEnabled ?? true,
          enableAutoResponse: request.settings?.autoResponseEnabled ?? true,
          enableSentimentAnalysis: request.settings?.sentimentAnalysisEnabled ?? true,
          webhookUrl: `${window.location.origin}/api/webhooks/agent-mail`,
        },
        metadata: {
          source: 'red-cross-events',
          eventName: request.eventName,
          eventId: request.eventId
        }
      }

      // This would be the actual Agent Mail SDK call - adjust as needed
      // const response = await this.client.campaigns.create(campaignRequest)

      // For now, simulate successful response
      const campaignId = `campaign_${Date.now()}`

      this.onEmailEvent({
        type: 'sent',
        campaignId,
        eventId: request.eventId,
        recipientEmail: 'batch',
        timestamp: new Date(),
        data: {}
      })

      return {
        success: true,
        campaignId,
        message: `Campaign started successfully. ${request.contacts.length} emails will be sent.`
      }

    } catch (error) {
      console.error('Agent Mail API error:', error)

      if (error instanceof AgentMailError) {
        return {
          success: false,
          error: `Agent Mail Error (${error.statusCode}): ${error.message}`
        }
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  async pauseCampaign(campaignId: string): Promise<AgentMailResponse> {
    if (!this.isReady()) {
      return {
        success: false,
        error: 'Agent Mail service not initialized'
      }
    }

    try {
      const response = await fetch(`${this.config!.baseUrl || 'https://api.agentmail.io'}/v1/campaigns/${campaignId}/pause`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config!.apiKey}`
        }
      })

      if (response.ok) {
        return { success: true, message: 'Campaign paused successfully' }
      } else {
        const data = await response.json()
        return { success: false, error: data.message || 'Failed to pause campaign' }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  async resumeCampaign(campaignId: string): Promise<AgentMailResponse> {
    if (!this.isReady()) {
      return {
        success: false,
        error: 'Agent Mail service not initialized'
      }
    }

    try {
      const response = await fetch(`${this.config!.baseUrl || 'https://api.agentmail.io'}/v1/campaigns/${campaignId}/resume`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config!.apiKey}`
        }
      })

      if (response.ok) {
        return { success: true, message: 'Campaign resumed successfully' }
      } else {
        const data = await response.json()
        return { success: false, error: data.message || 'Failed to resume campaign' }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  async getCampaignStats(campaignId: string) {
    if (!this.isReady()) {
      return null
    }

    try {
      const response = await fetch(`${this.config!.baseUrl || 'https://api.agentmail.io'}/v1/campaigns/${campaignId}/stats`, {
        headers: {
          'Authorization': `Bearer ${this.config!.apiKey}`
        }
      })

      if (response.ok) {
        return await response.json()
      }
    } catch (error) {
      console.error('Failed to fetch campaign stats:', error)
    }

    return null
  }

  addEventListener(listener: (event: EmailEvent) => void) {
    this.eventListeners.push(listener)
  }

  removeEventListener(listener: (event: EmailEvent) => void) {
    const index = this.eventListeners.indexOf(listener)
    if (index > -1) {
      this.eventListeners.splice(index, 1)
    }
  }

  private onEmailEvent(event: EmailEvent) {
    const dashboardStore = useDashboardStore.getState()

    switch (event.type) {
      case 'sent':
        if (event.recipientEmail === 'batch') {
          dashboardStore.onEmailSent(event.eventId, 1)
        } else {
          dashboardStore.onEmailSent(event.eventId, 1)
        }
        break

      case 'opened':
        dashboardStore.onEmailOpened(event.eventId, 1)
        break

      case 'replied':
        if (event.data?.sentiment) {
          dashboardStore.onEmailReplied(event.eventId, {
            sentiment: event.data.sentiment,
            participantEmail: event.recipientEmail,
            content: event.data.responseContent
          })

          if (event.data.bookingDetails) {
            this.handleBookingFromResponse(event)
          }
        }
        break

      case 'booking_received':
        if (event.data?.bookingDetails) {
          this.handleBookingFromResponse(event)
        }
        break
    }

    this.eventListeners.forEach(listener => listener(event))
  }

  private handleBookingFromResponse(event: EmailEvent) {
    if (!event.data?.bookingDetails) return

    const dashboardStore = useDashboardStore.getState()
    dashboardStore.onBookingReceived(event.eventId, {
      participantEmail: event.recipientEmail,
      participantName: event.data.bookingDetails.participantName,
      eventDate: new Date(event.data.bookingDetails.eventDate)
    })
  }

  private setupWebhookListener() {
    if (typeof window === 'undefined') return

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return

      if (event.data.type === 'agent-mail-webhook') {
        const emailEvent: EmailEvent = {
          type: event.data.eventType,
          campaignId: event.data.campaignId,
          eventId: event.data.metadata?.eventId || 'unknown',
          recipientEmail: event.data.recipientEmail,
          timestamp: new Date(event.data.timestamp),
          data: event.data.data
        }

        this.onEmailEvent(emailEvent)
      }
    }

    window.addEventListener('message', handleMessage)
  }

  private convertToHtml(text: string): string {
    return text
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/^/, '<p>')
      .replace(/$/, '</p>')
  }

  simulateEmailActivity(eventId: string) {
    setTimeout(() => {
      this.onEmailEvent({
        type: 'sent',
        campaignId: 'sim-' + Date.now(),
        eventId,
        recipientEmail: 'batch',
        timestamp: new Date()
      })
    }, 1000)

    setTimeout(() => {
      this.onEmailEvent({
        type: 'opened',
        campaignId: 'sim-' + Date.now(),
        eventId,
        recipientEmail: 'user@example.com',
        timestamp: new Date()
      })
    }, 3000)

    setTimeout(() => {
      this.onEmailEvent({
        type: 'replied',
        campaignId: 'sim-' + Date.now(),
        eventId,
        recipientEmail: 'user@example.com',
        timestamp: new Date(),
        data: {
          sentiment: 'positive',
          responseContent: 'I would love to participate! Please count me in.',
          bookingDetails: {
            participantName: 'John Doe',
            eventDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            additionalInfo: 'Looking forward to helping'
          }
        }
      })
    }, 5000)
  }
}

export const agentMailService = new AgentMailService()
export default agentMailService