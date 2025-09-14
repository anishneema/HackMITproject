import Anthropic from '@anthropic-ai/sdk'

export interface ConversationMessage {
  id: string
  sender_email: string
  content: string
  timestamp: Date
  is_from_user: boolean
  campaign_id?: string
  thread_id?: string
  sentiment?: 'positive' | 'negative' | 'neutral' | 'question'
}

export interface ConversationThread {
  thread_id: string
  participant_email: string
  campaign_id?: string
  messages: ConversationMessage[]
  last_message_at: Date
  status: 'active' | 'completed' | 'needs_attention'
  context: {
    event_name?: string
    event_date?: string
    participant_name?: string
    interests?: string[]
  }
}

export interface ConversationResponse {
  content: string
  should_send: boolean
  requires_human_review: boolean
  suggested_actions: Array<{
    type: 'schedule_appointment' | 'send_info' | 'escalate' | 'close_conversation'
    details: string
  }>
}

class ConversationManager {
  private conversations: Map<string, ConversationThread> = new Map()
  private anthropicClient: Anthropic | null = null

  constructor() {
    this.initializeAnthropicClient()
  }

  private async initializeAnthropicClient() {
    try {
      // Initialize on server-side only
      if (typeof window === 'undefined' && process.env.ANTHROPIC_API_KEY) {
        this.anthropicClient = new Anthropic({
          apiKey: process.env.ANTHROPIC_API_KEY
        })
      }
    } catch (error) {
      console.error('Failed to initialize Anthropic client:', error)
    }
  }

  async generateResponse(
    incomingMessage: string,
    senderEmail: string,
    threadId: string,
    campaignId?: string,
    context?: any
  ): Promise<ConversationResponse> {
    try {
      // Get or create conversation thread
      let thread = this.conversations.get(threadId)
      if (!thread) {
        thread = this.createNewThread(threadId, senderEmail, campaignId)
      }

      // Add incoming message to thread
      const incomingMsg: ConversationMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        sender_email: senderEmail,
        content: incomingMessage,
        timestamp: new Date(),
        is_from_user: true,
        campaign_id: campaignId,
        thread_id: threadId,
        sentiment: this.analyzeSentiment(incomingMessage)
      }

      thread.messages.push(incomingMsg)
      thread.last_message_at = new Date()

      // Use API route for Claude response since we're in client-side code
      const response = await this.getClaudeResponseViaAPI(thread, context)

      // Add AI response to thread
      const aiResponse: ConversationMessage = {
        id: `msg_${Date.now()}_ai_${Math.random().toString(36).substr(2, 9)}`,
        sender_email: 'system@agentmail.to',
        content: response.content,
        timestamp: new Date(),
        is_from_user: false,
        campaign_id: campaignId,
        thread_id: threadId
      }

      thread.messages.push(aiResponse)
      this.conversations.set(threadId, thread)

      return response

    } catch (error) {
      console.error('Failed to generate conversation response:', error)
      return {
        content: 'Thank you for your email. We will get back to you soon!',
        should_send: true,
        requires_human_review: false,
        suggested_actions: []
      }
    }
  }

  private async getClaudeResponseViaAPI(
    thread: ConversationThread,
    context?: any
  ): Promise<ConversationResponse> {
    try {
      const dashboardContext = context || this.getDefaultContext()

      const conversationHistory = thread.messages.slice(-10).map(msg => ({
        type: msg.is_from_user ? 'user' : 'assistant',
        content: msg.content,
        timestamp: msg.timestamp
      }))

      const currentMessage = thread.messages[thread.messages.length - 1].content

      const response = await fetch('/api/conversation/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: currentMessage,
          senderEmail: thread.participant_email,
          conversationHistory,
          dashboardContext,
          threadContext: {
            campaign_id: thread.campaign_id,
            participant_email: thread.participant_email,
            context: thread.context
          }
        })
      })

      if (!response.ok) {
        throw new Error('Failed to get AI response')
      }

      return await response.json()

    } catch (error) {
      console.error('Failed to get Claude response via API:', error)
      return this.getFallbackResponse(thread.messages[thread.messages.length - 1])
    }
  }

  private createNewThread(threadId: string, participantEmail: string, campaignId?: string): ConversationThread {
    const thread: ConversationThread = {
      thread_id: threadId,
      participant_email: participantEmail,
      campaign_id: campaignId,
      messages: [],
      last_message_at: new Date(),
      status: 'active',
      context: {
        participant_name: this.extractNameFromEmail(participantEmail)
      }
    }

    this.conversations.set(threadId, thread)
    return thread
  }

  private analyzeSentiment(message: string): 'positive' | 'negative' | 'neutral' | 'question' {
    const lowerMessage = message.toLowerCase()

    if (lowerMessage.includes('?') ||
        lowerMessage.includes('when') ||
        lowerMessage.includes('where') ||
        lowerMessage.includes('how') ||
        lowerMessage.includes('what')) {
      return 'question'
    }

    const positiveWords = ['yes', 'interested', 'sign up', 'count me in', 'participate', 'volunteer', 'love', 'great', 'awesome']
    const negativeWords = ['no', 'not interested', 'unsubscribe', 'remove', 'decline', 'busy', 'cannot']

    const hasPositive = positiveWords.some(word => lowerMessage.includes(word))
    const hasNegative = negativeWords.some(word => lowerMessage.includes(word))

    if (hasPositive && !hasNegative) return 'positive'
    if (hasNegative && !hasPositive) return 'negative'
    return 'neutral'
  }

  private getFallbackResponse(lastMessage: ConversationMessage): ConversationResponse {
    const sentiment = lastMessage.sentiment || 'neutral'

    switch (sentiment) {
      case 'positive':
        return {
          content: "Thank you for your positive response! I'm excited that you're interested in participating. I'll help you get registered for our upcoming blood drive event. What would be your preferred time slot?",
          should_send: true,
          requires_human_review: false,
          suggested_actions: [{
            type: 'schedule_appointment',
            details: 'User expressed interest, should schedule appointment'
          }]
        }

      case 'question':
        return {
          content: "Thank you for your question! I'd be happy to help provide more information. Our next blood drive event is scheduled for this Saturday from 9:00 AM to 3:00 PM at the Community Center. Is there anything specific you'd like to know about the donation process or the event?",
          should_send: true,
          requires_human_review: false,
          suggested_actions: [{
            type: 'send_info',
            details: 'User has questions about the event'
          }]
        }

      case 'negative':
        return {
          content: "Thank you for letting us know. We completely understand if you're not able to participate this time. If your circumstances change in the future, we'd love to have you join us. Have a great day!",
          should_send: true,
          requires_human_review: false,
          suggested_actions: [{
            type: 'close_conversation',
            details: 'User declined participation'
          }]
        }

      default:
        return {
          content: "Thank you for your email. I'd be happy to help you with any questions about our blood drive events. Our next event is this Saturday from 9:00 AM to 3:00 PM at the Community Center. Would you like to participate or do you have any questions?",
          should_send: true,
          requires_human_review: false,
          suggested_actions: []
        }
    }
  }

  private extractNameFromEmail(email: string): string {
    const localPart = email.split('@')[0]
    return localPart.split('.').map(part =>
      part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
    ).join(' ')
  }

  private getDefaultContext() {
    // Default context for server-side operations
    return {
      events: [{
        id: '1',
        name: "Community Center Blood Drive",
        date: "2025-09-20",
        time: "9:00 AM - 3:00 PM",
        targetDonors: 50,
        currentRSVPs: 12,
        venue: "Downtown Community Center",
        status: 'active'
      }],
      analytics: {
        totalEvents: 2,
        activeEvents: 2,
        totalEmailsSent: 45,
        averageResponseRate: 72.5,
        totalBookings: 18
      }
    }
  }

  getConversationThread(threadId: string): ConversationThread | undefined {
    return this.conversations.get(threadId)
  }

  getAllConversations(): ConversationThread[] {
    return Array.from(this.conversations.values())
  }

  markThreadAsCompleted(threadId: string) {
    const thread = this.conversations.get(threadId)
    if (thread) {
      thread.status = 'completed'
      this.conversations.set(threadId, thread)
    }
  }

  markThreadForHumanReview(threadId: string) {
    const thread = this.conversations.get(threadId)
    if (thread) {
      thread.status = 'needs_attention'
      this.conversations.set(threadId, thread)
    }
  }

  // Export conversation data for persistence
  exportConversations(): string {
    const data = Array.from(this.conversations.entries())
    return JSON.stringify(data, null, 2)
  }

  // Import conversation data from storage
  importConversations(data: string) {
    try {
      const entries = JSON.parse(data)
      this.conversations = new Map(entries)
    } catch (error) {
      console.error('Failed to import conversations:', error)
    }
  }
}

export const conversationManager = new ConversationManager()
export default conversationManager