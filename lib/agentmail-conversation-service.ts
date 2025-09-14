import { AgentMailClient } from 'agentmail'
import { AgentMail } from 'agentmail'

export interface AgentMailMessage {
  id: string
  from: string
  to: string[]
  subject: string
  text?: string
  html?: string
  timestamp: Date
  thread_id?: string
  labels?: string[]
}

export interface AgentMailConversationService {
  // Read incoming messages
  getInboxMessages(limit?: number): Promise<AgentMailMessage[]>
  getUnreadMessages(): Promise<AgentMailMessage[]>
  getMessagesByThread(threadId: string): Promise<AgentMailMessage[]>

  // Send replies
  sendReply(originalMessageId: string, replyContent: string, subject?: string): Promise<boolean>
  sendMessage(to: string, subject: string, content: string, threadId?: string): Promise<boolean>

  // Mark messages as read
  markAsRead(messageId: string): Promise<boolean>

  // Test connection
  testConnection(): Promise<boolean>
}

class AgentMailConversationServiceImpl implements AgentMailConversationService {
  private client: AgentMailClient | null = null
  private inboxEmail: string
  private isInitialized = false

  constructor() {
    this.inboxEmail = process.env.AGENT_MAIL_INBOX || 'orcha@agentmail.to'
    this.initializeClient()
  }

  private initializeClient() {
    const apiKey = process.env.AGENT_MAIL_API_KEY

    if (!apiKey) {
      console.error('❌ AgentMail API key not found in environment variables')
      return
    }

    try {
      this.client = new AgentMailClient({
        apiKey: apiKey
      })
      this.isInitialized = true
      console.log('✅ AgentMail conversation service initialized')
    } catch (error) {
      console.error('❌ Failed to initialize AgentMail client:', error)
    }
  }

  async getInboxMessages(limit: number = 50): Promise<AgentMailMessage[]> {
    if (!this.isInitialized || !this.client) {
      console.error('❌ AgentMail client not initialized')
      return []
    }

    try {
      console.log('📥 Fetching inbox messages from AgentMail...')

      const request: AgentMail.ListInboxMessagesRequest = {
        limit: limit
      }

      // Use withRawResponse to get full response data
      const { data, rawResponse } = await this.client.inboxes.messages.list(this.inboxEmail, request).withRawResponse()

      console.log(`✅ Found ${data?.length || 0} messages in inbox`)
      console.log('📡 Raw response headers:', Object.fromEntries(rawResponse.headers.entries()))

      return this.parseMessages(data || [])
    } catch (error) {
      console.error('❌ Failed to fetch inbox messages:', error)
      console.error('Error details:', error)
      return []
    }
  }

  async getUnreadMessages(): Promise<AgentMailMessage[]> {
    if (!this.isInitialized || !this.client) {
      console.error('❌ AgentMail client not initialized')
      return []
    }

    try {
      console.log('📬 Fetching unread messages from AgentMail...')

      const request: AgentMail.ListInboxMessagesRequest = {
        limit: 100,
        unread: true
      }

      // Use withRawResponse to get full response data
      const { data, rawResponse } = await this.client.inboxes.messages.list(this.inboxEmail, request).withRawResponse()
      const unreadMessages = this.parseMessages(data || [])

      console.log(`📬 Found ${unreadMessages.length} unread messages`)
      console.log('📡 Unread response status:', rawResponse.status)

      return unreadMessages
    } catch (error) {
      console.error('❌ Failed to fetch unread messages:', error)
      console.error('Error details:', error)
      return []
    }
  }

  async getMessagesByThread(threadId: string): Promise<AgentMailMessage[]> {
    if (!this.isInitialized || !this.client) {
      console.error('❌ AgentMail client not initialized')
      return []
    }

    try {
      // Note: This endpoint might need adjustment based on AgentMail SDK documentation
      const messages = await this.getInboxMessages(100)
      return messages.filter(msg => msg.thread_id === threadId)
    } catch (error) {
      console.error(`❌ Failed to fetch messages for thread ${threadId}:`, error)
      return []
    }
  }

  async sendReply(originalMessageId: string, replyContent: string, subject?: string): Promise<boolean> {
    try {
      console.log(`📤 Sending reply to message ${originalMessageId}...`)

      // First get the original message to determine recipient and subject
      const originalMessage = await this.getMessageById(originalMessageId)
      if (!originalMessage) {
        console.error('❌ Original message not found')
        return false
      }

      const replySubject = subject || (originalMessage.subject.startsWith('Re:')
        ? originalMessage.subject
        : `Re: ${originalMessage.subject}`)

      return await this.sendMessage(
        originalMessage.from,
        replySubject,
        replyContent,
        originalMessage.thread_id
      )
    } catch (error) {
      console.error('❌ Failed to send reply:', error)
      return false
    }
  }

  async sendMessage(to: string, subject: string, content: string, threadId?: string): Promise<boolean> {
    if (!this.isInitialized || !this.client) {
      console.error('❌ AgentMail client not initialized')
      return false
    }

    try {
      console.log(`📤 Sending message to ${to}...`)

      const request: AgentMail.SendInboxMessageRequest = {
        to: [to],
        subject: subject,
        text: content,
        html: this.convertToHtml(content),
        threadId: threadId
      }

      console.log('📝 Message request:', {
        to: request.to,
        subject: request.subject,
        textLength: request.text?.length,
        threadId: request.threadId
      })

      // Use withRawResponse to get full response data and debug
      const { data, rawResponse } = await this.client.inboxes.messages.send(this.inboxEmail, request).withRawResponse()

      console.log(`✅ Message sent successfully! ID: ${data.id}`)
      console.log('📡 Send response status:', rawResponse.status)
      console.log('📡 Send response headers:', Object.fromEntries(rawResponse.headers.entries()))

      return true
    } catch (error) {
      console.error('❌ Failed to send message:', error)
      console.error('Error details:', error)

      // Log more details about the error
      if (error instanceof Error) {
        console.error('Error name:', error.name)
        console.error('Error message:', error.message)
        console.error('Error stack:', error.stack)
      }

      return false
    }
  }

  async markAsRead(messageId: string): Promise<boolean> {
    if (!this.isInitialized || !this.client) {
      console.error('❌ AgentMail client not initialized')
      return false
    }

    try {
      // Note: This might need to be adjusted based on actual AgentMail SDK methods
      // For now, we'll return true and log the action
      console.log(`📖 Marking message ${messageId} as read`)
      return true
    } catch (error) {
      console.error(`❌ Failed to mark message ${messageId} as read:`, error)
      return false
    }
  }

  async createInbox(): Promise<boolean> {
    if (!this.isInitialized || !this.client) {
      console.error('❌ AgentMail client not initialized')
      return false
    }

    try {
      console.log('📧 Creating AgentMail inbox: orcha@agentmail.to')

      const { data, rawResponse } = await this.client.inboxes.create({
        username: 'orcha',
        domain: 'agentmail.to',
        displayName: 'orcha- Blood Drive',
        clientId: undefined,
      }).withRawResponse()

      console.log('✅ Inbox created successfully!')
      console.log('📡 Create inbox status:', rawResponse.status)
      console.log('📋 Inbox details:', data)

      return true
    } catch (error) {
      console.error('❌ Failed to create inbox:', error)
      console.error('Error details:', error)
      return false
    }
  }

  async testConnection(): Promise<boolean> {
    if (!this.isInitialized || !this.client) {
      console.error('❌ AgentMail client not initialized')
      return false
    }

    try {
      console.log('🧪 Testing AgentMail API connection...')

      const request: AgentMail.ListInboxesRequest = {}
      const { data, rawResponse } = await this.client.inboxes.list(request).withRawResponse()

      console.log('✅ AgentMail API connection successful')
      console.log('📡 Connection test status:', rawResponse.status)
      console.log('📋 Available inboxes:', data?.length || 0)

      return true
    } catch (error) {
      console.error('❌ AgentMail API connection test failed:', error)
      console.error('Error details:', error)
      return false
    }
  }

  private async getMessageById(messageId: string): Promise<AgentMailMessage | null> {
    if (!this.isInitialized || !this.client) {
      console.error('❌ AgentMail client not initialized')
      return null
    }

    try {
      // Get recent messages and find the one we want
      const messages = await this.getInboxMessages(100)
      return messages.find(msg => msg.id === messageId) || null
    } catch (error) {
      console.error(`❌ Failed to get message ${messageId}:`, error)
      return null
    }
  }

  private parseMessages(rawMessages: any[] | any): AgentMailMessage[] {
    // Handle case where data might not be an array
    const messagesArray = Array.isArray(rawMessages) ? rawMessages : (rawMessages?.messages || rawMessages?.data || [])

    console.log('📝 Parsing messages:', {
      isArray: Array.isArray(rawMessages),
      dataType: typeof rawMessages,
      arrayLength: Array.isArray(messagesArray) ? messagesArray.length : 'N/A',
      rawData: rawMessages
    })

    if (!Array.isArray(messagesArray)) {
      console.log('⚠️ Expected array but got:', typeof messagesArray)
      return []
    }

    return messagesArray.map(msg => this.parseMessage(msg)).filter(msg => msg !== null) as AgentMailMessage[]
  }

  private parseMessage(rawMessage: any): AgentMailMessage | null {
    try {
      console.log('🔍 Parsing individual message:', rawMessage)

      return {
        id: rawMessage.messageId || rawMessage.id,
        from: rawMessage.from?.email || rawMessage.from,
        to: rawMessage.to?.map((t: any) => t.email || t) || [],
        subject: rawMessage.subject || '',
        text: rawMessage.preview || rawMessage.text || rawMessage.textContent || rawMessage.body || rawMessage.content,
        html: rawMessage.html || rawMessage.htmlContent || rawMessage.htmlBody,
        timestamp: new Date(rawMessage.created_at || rawMessage.createdAt || rawMessage.timestamp),
        thread_id: rawMessage.threadId || rawMessage.thread_id,
        labels: rawMessage.labels || []
      }
    } catch (error) {
      console.error('❌ Failed to parse message:', error, rawMessage)
      return null
    }
  }

  private convertToHtml(text: string): string {
    return text
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/^/, '<p>')
      .replace(/$/, '</p>')
  }
}

export const agentMailConversationService = new AgentMailConversationServiceImpl()