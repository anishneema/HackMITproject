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

export interface EmailThread {
  id: string
  subject: string
  participants: string[]
  messageCount: number
  lastMessage: Date
  isRead: boolean
  labels: string[]
}

export interface EmailMessage {
  id: string
  threadId: string
  from: string
  to: string[]
  subject: string
  body: string
  timestamp: Date
  isRead: boolean
  attachments?: string[]
}

export interface CalendarEvent {
  id: string
  title: string
  description?: string
  startTime: Date
  endTime: Date
  attendees: string[]
  location?: string
  status: 'confirmed' | 'tentative' | 'cancelled'
}

class AgentMailService {
  private client: AgentMailClient | null = null
  private isInitialized = false
  private eventListeners: ((event: EmailEvent) => void)[] = []
  private config: AgentMailConfig | null = null

  constructor() {
    this.setupWebhookListener()
  }

  initialize(config?: AgentMailConfig) {
    const apiKey = config?.apiKey || process.env.NEXT_PUBLIC_AGENTMAIL_API_KEY || process.env.AGENTMAIL_API_KEY

    if (!apiKey) {
      console.error('AgentMail API key not found in config or environment variables')
      return
    }

    this.config = config || { apiKey }
    this.client = new AgentMailClient({
      apiKey: apiKey
    })
    this.isInitialized = true
    console.log('Agent Mail service initialized with API key')
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

  async analyzeEmailData(eventData: any): Promise<{ insights: string[]; recommendations: string[] }> {
    if (!this.isReady() || !this.client) {
      return {
        insights: ['AgentMail service not available'],
        recommendations: ['Initialize AgentMail to get email insights']
      }
    }

    try {
      // Use AgentMail to analyze event data and provide insights
      const analysis = await this.client.analytics.analyze({
        event_data: eventData,
        analysis_types: ['sentiment', 'engagement', 'response_patterns']
      })

      return {
        insights: analysis.insights || ['Email analysis completed'],
        recommendations: analysis.recommendations || ['Continue current email strategy']
      }
    } catch (error) {
      console.error('Failed to analyze email data:', error)
      return {
        insights: ['Analysis temporarily unavailable'],
        recommendations: ['Check AgentMail connection']
      }
    }
  }

  async getEmailInsights(eventId: string): Promise<{
    sentimentScore: number
    engagementRate: number
    recommendedActions: string[]
    keyTopics: string[]
  }> {
    if (!this.isReady() || !this.client) {
      return {
        sentimentScore: 0,
        engagementRate: 0,
        recommendedActions: ['Initialize AgentMail service'],
        keyTopics: []
      }
    }

    try {
      const insights = await this.client.insights.getEventInsights(eventId)

      return {
        sentimentScore: insights.sentiment_score || 0,
        engagementRate: insights.engagement_rate || 0,
        recommendedActions: insights.recommended_actions || [],
        keyTopics: insights.key_topics || []
      }
    } catch (error) {
      console.error('Failed to get email insights:', error)
      return {
        sentimentScore: 0,
        engagementRate: 0,
        recommendedActions: ['Unable to fetch insights'],
        keyTopics: []
      }
    }
  }

  // Get dashboard context for AI responses
  getDashboardContext(): {
    events: any[]
    analytics: any
    nextEvent: any | null
    activeEvents: any[]
  } {
    // Check if we're in browser environment
    if (typeof window !== 'undefined') {
      const dashboardStore = useDashboardStore.getState()
      const events = dashboardStore.events
      const analytics = dashboardStore.getDashboardTotals()

      const now = new Date()
      const upcomingEvents = events
        .filter(event => new Date(event.date) >= now && event.status === 'active')
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

      const nextEvent = upcomingEvents.length > 0 ? upcomingEvents[0] : null
      const activeEvents = events.filter(event => event.status === 'active')

      return {
        events,
        analytics,
        nextEvent,
        activeEvents
      }
    } else {
      // Server-side fallback with sample data
      return this.getServerDashboardContext()
    }
  }

  private getServerDashboardContext(): {
    events: any[]
    analytics: any
    nextEvent: any | null
    activeEvents: any[]
  } {
    // Sample data for server-side operations
    const sampleEvents = [
      {
        id: '1',
        name: "Community Center Blood Drive",
        date: "2025-09-20",
        time: "9:00 AM - 3:00 PM",
        targetDonors: 50,
        currentRSVPs: 12,
        venue: "Downtown Community Center",
        status: 'active'
      },
      {
        id: '2',
        name: "University Campus Drive",
        date: "2025-09-25",
        time: "10:00 AM - 4:00 PM",
        targetDonors: 75,
        currentRSVPs: 8,
        venue: "State University Student Center",
        status: 'active'
      }
    ]

    const now = new Date()
    const upcomingEvents = sampleEvents
      .filter(event => new Date(event.date) >= now && event.status === 'active')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    const nextEvent = upcomingEvents.length > 0 ? upcomingEvents[0] : null

    return {
      events: sampleEvents,
      analytics: {
        totalEvents: sampleEvents.length,
        activeEvents: sampleEvents.filter(e => e.status === 'active').length,
        totalEmailsSent: 45,
        averageResponseRate: 72.5,
        totalBookings: 18,
        recentActivity: [
          {
            type: 'booking_received',
            eventName: 'Community Center Blood Drive',
            timestamp: new Date(),
            details: 'Sarah Johnson booked for 9/20/2025'
          }
        ]
      },
      nextEvent,
      activeEvents: sampleEvents.filter(event => event.status === 'active')
    }
  }

  // Generate context-aware email response
  async generateContextualResponse(incomingMessage: string, senderEmail: string): Promise<string> {
    // Always try to use context even if AgentMail isn't ready
    const context = this.getDashboardContext()
    const messageLower = incomingMessage.toLowerCase()

    // Use intelligent fallback first
    let responseType = 'general'
    if (messageLower.includes('next event') || messageLower.includes('upcoming') || messageLower.includes('when')) {
      responseType = 'next_event_query'
    } else if (messageLower.includes('schedule') || messageLower.includes('book') || messageLower.includes('sign up')) {
      responseType = 'scheduling_request'
    } else if (messageLower.includes('location') || messageLower.includes('where') || messageLower.includes('venue')) {
      responseType = 'location_query'
    } else if (messageLower.includes('time') || messageLower.includes('what time')) {
      responseType = 'time_query'
    }

    // Try AgentMail AI first, but fallback to our intelligent response
    if (this.isReady() && this.client) {
      try {

        // Create enhanced context prompt for the AI
        const contextPrompt = `
You are an intelligent AI assistant for a Red Cross blood drive organization. Respond naturally and helpfully using the context below.

CURRENT ANALYTICS:
- Total Events: ${context.analytics.totalEvents}
- Active Events: ${context.analytics.activeEvents}
- Total Emails Sent: ${context.analytics.totalEmailsSent}
- Response Rate: ${context.analytics.averageResponseRate.toFixed(1)}%
- Total Bookings: ${context.analytics.totalBookings}

NEXT UPCOMING EVENT:
${context.nextEvent ?
  `- Name: ${context.nextEvent.name}
- Date: ${context.nextEvent.date}
- Time: ${context.nextEvent.time}
- Venue: ${context.nextEvent.venue}
- Target Donors: ${context.nextEvent.targetDonors}
- Current RSVPs: ${context.nextEvent.currentRSVPs}
- Available Spots: ${context.nextEvent.targetDonors - context.nextEvent.currentRSVPs}`
  : '- No upcoming events scheduled'}

ALL ACTIVE EVENTS:
${context.activeEvents.map((event, index) =>
  `${index + 1}. ${event.name}
   - Date: ${event.date}
   - Time: ${event.time}
   - Venue: ${event.venue}
   - Capacity: ${event.currentRSVPs}/${event.targetDonors}
   - Available: ${event.targetDonors - event.currentRSVPs} spots`
).join('\n') || '- No active events'}

RECENT ACTIVITY:
${context.analytics.recentActivity.map(activity =>
  `- ${activity.details} (${activity.timestamp.toLocaleDateString()})`
).join('\n') || '- No recent activity'}

USER MESSAGE TYPE: ${responseType}
USER MESSAGE: "${incomingMessage}"
SENDER EMAIL: ${senderEmail}

INSTRUCTIONS:
1. If asking about "next event" or "when is the next event", provide details about the closest upcoming event
2. If asking about scheduling/booking, offer to help them sign up and provide specific steps
3. If asking about location/venue, provide the address and any helpful directions
4. If asking about time, provide both the start time and duration if available
5. Always be helpful, professional, and include a call-to-action when appropriate
6. If they seem interested, offer to help them reserve a spot
7. Include relevant contact information if they need to call or visit

Generate a personalized, helpful response:
`

        const response = await this.client.ai.generateResponse({
          prompt: contextPrompt,
          context: 'email_response',
          sender_email: senderEmail,
          message_type: responseType
        })

        return response.content || this.generateFallbackResponse(context, responseType, incomingMessage)

      } catch (error) {
        console.error('Failed to use AgentMail AI, using fallback:', error)
        return this.generateFallbackResponse(context, responseType, incomingMessage)
      }
    } else {
      // AgentMail not ready, use intelligent fallback
      return this.generateFallbackResponse(context, responseType, incomingMessage)
    }
  }

  private generateFallbackResponse(context: any, responseType: string, incomingMessage: string): string {
    const messageLower = incomingMessage.toLowerCase()

    if (responseType === 'next_event_query' || messageLower.includes('next') || messageLower.includes('when')) {
      if (context.nextEvent) {
        return `Thank you for your interest! Our next blood drive event is "${context.nextEvent.name}" scheduled for ${context.nextEvent.date} at ${context.nextEvent.time} at ${context.nextEvent.venue}. We currently have ${context.nextEvent.currentRSVPs} RSVPs out of ${context.nextEvent.targetDonors} target donors, so there are ${context.nextEvent.targetDonors - context.nextEvent.currentRSVPs} spots still available. Would you like me to help you register?`
      } else {
        return 'Thank you for your email! We don\'t have any upcoming blood drive events scheduled at the moment, but we\'ll keep you informed when new events are planned. Your interest in donating blood is greatly appreciated!'
      }
    }

    if (responseType === 'scheduling_request' || messageLower.includes('schedule') || messageLower.includes('book')) {
      if (context.nextEvent) {
        return `I'd be happy to help you schedule for our blood drive! Our next event "${context.nextEvent.name}" is on ${context.nextEvent.date} at ${context.nextEvent.time} at ${context.nextEvent.venue}. There are ${context.nextEvent.targetDonors - context.nextEvent.currentRSVPs} spots available. Please reply with your preferred time slot and I'll get you registered!`
      } else {
        return 'Thank you for your interest in scheduling a blood donation! We don\'t have any events currently scheduled, but I\'ll make sure to contact you as soon as we have new dates available.'
      }
    }

    if (responseType === 'location_query' || messageLower.includes('where') || messageLower.includes('location')) {
      if (context.nextEvent) {
        return `Our next blood drive event "${context.nextEvent.name}" will be held at ${context.nextEvent.venue} on ${context.nextEvent.date} at ${context.nextEvent.time}. This location is easily accessible with parking available. Would you like me to send you directions or help you register for this event?`
      }
    }

    if (responseType === 'time_query' || messageLower.includes('time')) {
      if (context.nextEvent) {
        return `The "${context.nextEvent.name}" blood drive event will start at ${context.nextEvent.time} on ${context.nextEvent.date} at ${context.nextEvent.venue}. The event typically runs for several hours to accommodate all donors. Would you like to reserve a time slot?`
      }
    }

    // General response
    if (context.nextEvent) {
      return `Thank you for reaching out! Our next blood drive event is "${context.nextEvent.name}" on ${context.nextEvent.date} at ${context.nextEvent.time} at ${context.nextEvent.venue}. We have ${context.nextEvent.targetDonors - context.nextEvent.currentRSVPs} spots available out of ${context.nextEvent.targetDonors}. Your donation can help save lives - would you like to participate?`
    } else {
      return 'Thank you for your email and interest in blood donation! While we don\'t have any events currently scheduled, we greatly appreciate your willingness to help save lives. We\'ll contact you as soon as new blood drive events are planned.'
    }
  }

  async sendEmail(emailData: {
    to: string
    subject: string
    body: string
    campaignId?: string
    contactData?: any
  }): Promise<AgentMailResponse> {
    if (!this.isReady() || !this.client) {
      return {
        success: false,
        error: 'Agent Mail service not initialized'
      }
    }

    try {
      const response = await this.client.emails.send({
        to: emailData.to,
        subject: emailData.subject,
        body: emailData.body,
        html_body: emailData.body.replace(/\n/g, '<br>'),
        metadata: {
          campaign_id: emailData.campaignId,
          contact_data: emailData.contactData,
          source: 'red-cross-campaign'
        },
        track_opens: true,
        track_clicks: true,
        enable_replies: true
      })

      // Update dashboard with email sent
      if (emailData.campaignId) {
        const dashboardStore = useDashboardStore.getState()
        dashboardStore.onEmailSent(emailData.campaignId, 1)
      }

      return {
        success: true,
        message: `Email sent to ${emailData.to}`
      }

    } catch (error) {
      console.error('Failed to send email:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send email'
      }
    }
  }

  async scheduleCalendarEvent(eventData: Omit<CalendarEvent, 'id'>): Promise<{ success: boolean; eventId?: string; error?: string }> {
    if (!this.isReady() || !this.client) {
      return {
        success: false,
        error: 'Agent Mail service not initialized'
      }
    }

    try {
      const calendarEvent = await this.client.calendar.createEvent({
        title: eventData.title,
        description: eventData.description,
        start_time: eventData.startTime.toISOString(),
        end_time: eventData.endTime.toISOString(),
        attendees: eventData.attendees,
        location: eventData.location,
        status: eventData.status
      })

      // Update dashboard store with new booking
      const dashboardStore = useDashboardStore.getState()
      if (eventData.attendees.length > 0) {
        dashboardStore.onBookingReceived('auto-scheduled', {
          participantEmail: eventData.attendees[0],
          participantName: eventData.title.includes('with ') ? eventData.title.split('with ')[1] : 'Participant',
          eventDate: eventData.startTime
        })
      }

      return {
        success: true,
        eventId: calendarEvent.id
      }
    } catch (error) {
      console.error('Failed to schedule calendar event:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to schedule event'
      }
    }
  }

  async getUpcomingEvents(): Promise<CalendarEvent[]> {
    if (!this.isReady() || !this.client) {
      return []
    }

    try {
      const events = await this.client.calendar.getEvents({
        start_time: new Date().toISOString(),
        limit: 100
      })

      return events.map((event: any) => ({
        id: event.id,
        title: event.title,
        description: event.description,
        startTime: new Date(event.start_time),
        endTime: new Date(event.end_time),
        attendees: event.attendees || [],
        location: event.location,
        status: event.status || 'confirmed'
      }))
    } catch (error) {
      console.error('Failed to fetch upcoming events:', error)
      return []
    }
  }

  async getInboxThreads(limit: number = 20): Promise<EmailThread[]> {
    if (!this.isReady() || !this.client) {
      return []
    }

    try {
      const threads = await this.client.emails.getThreads({
        limit,
        folder: 'inbox'
      })

      return threads.map((thread: any) => ({
        id: thread.id,
        subject: thread.subject,
        participants: thread.participants || [],
        messageCount: thread.message_count || 1,
        lastMessage: new Date(thread.last_message_time),
        isRead: thread.is_read || false,
        labels: thread.labels || []
      }))
    } catch (error) {
      console.error('Failed to fetch inbox threads:', error)
      return []
    }
  }

  async getEmailMessages(threadId: string): Promise<EmailMessage[]> {
    if (!this.isReady() || !this.client) {
      return []
    }

    try {
      const messages = await this.client.emails.getThreadMessages(threadId)

      return messages.map((message: any) => ({
        id: message.id,
        threadId,
        from: message.from,
        to: message.to || [],
        subject: message.subject,
        body: message.body || message.html_body || '',
        timestamp: new Date(message.timestamp),
        isRead: message.is_read || false,
        attachments: message.attachments || []
      }))
    } catch (error) {
      console.error('Failed to fetch thread messages:', error)
      return []
    }
  }

  async replyToEmail(threadId: string, content: string, subject?: string): Promise<{ success: boolean; error?: string }> {
    if (!this.isReady() || !this.client) {
      return {
        success: false,
        error: 'Agent Mail service not initialized'
      }
    }

    try {
      await this.client.emails.reply({
        thread_id: threadId,
        body: content,
        html_body: content.replace(/\n/g, '<br>'),
        subject: subject,
        track_opens: true,
        track_clicks: true
      })

      return { success: true }
    } catch (error) {
      console.error('Failed to reply to email:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send reply'
      }
    }
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