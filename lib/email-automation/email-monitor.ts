import { EmailReply, SentEmail } from './types'

export interface EmailMonitorConfig {
  pollIntervalMs?: number
  enableWebhooks?: boolean
  webhookSecret?: string
}

export interface ReplyDetectionService {
  checkForReplies(sentEmails: SentEmail[]): Promise<EmailReply[]>
  setupWebhook?(webhookUrl: string): Promise<boolean>
}

export class IMAPReplyMonitor implements ReplyDetectionService {
  private config: {
    host: string
    port: number
    secure: boolean
    user: string
    password: string
  }

  constructor(imapConfig: {
    host: string
    port: number
    secure: boolean
    user: string
    password: string
  }) {
    this.config = imapConfig
  }

  async checkForReplies(sentEmails: SentEmail[]): Promise<EmailReply[]> {
    const replies: EmailReply[] = []

    try {
      const emailMap = new Map(sentEmails.map(email => [email.contactEmail, email]))
      const recentEmails = await this.fetchRecentEmails()

      for (const email of recentEmails) {
        const originalEmail = this.findOriginalEmail(email, emailMap)
        if (originalEmail && !email.processed) {
          replies.push({
            id: this.generateId(),
            originalEmailId: originalEmail.id,
            fromEmail: email.from,
            subject: email.subject,
            body: email.body,
            receivedAt: email.receivedAt,
            sentiment: 'neutral',
            processed: false
          })
        }
      }
    } catch (error) {
      console.error('Error checking for replies:', error)
    }

    return replies
  }

  private async fetchRecentEmails(): Promise<Array<{
    from: string
    subject: string
    body: string
    receivedAt: Date
    messageId: string
    processed: boolean
  }>> {
    return []
  }

  private findOriginalEmail(reply: any, emailMap: Map<string, SentEmail>): SentEmail | undefined {
    return emailMap.get(reply.from)
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }
}

export class WebhookReplyMonitor implements ReplyDetectionService {
  private replies: EmailReply[] = []
  private webhookSecret?: string

  constructor(webhookSecret?: string) {
    this.webhookSecret = webhookSecret
  }

  async checkForReplies(sentEmails: SentEmail[]): Promise<EmailReply[]> {
    const emailMap = new Map(sentEmails.map(email => [email.contactEmail, email]))
    return this.replies.filter(reply => {
      const originalEmail = emailMap.get(reply.fromEmail)
      return originalEmail && !reply.processed
    })
  }

  async setupWebhook(webhookUrl: string): Promise<boolean> {
    console.log(`Webhook should be configured at: ${webhookUrl}`)
    return true
  }

  handleWebhook(payload: any, signature?: string): EmailReply | null {
    if (this.webhookSecret && signature) {
      if (!this.verifyWebhookSignature(payload, signature)) {
        throw new Error('Invalid webhook signature')
      }
    }

    try {
      const reply: EmailReply = {
        id: this.generateId(),
        originalEmailId: payload.originalEmailId || '',
        fromEmail: payload.from || payload.fromEmail,
        subject: payload.subject,
        body: payload.body || payload.content,
        receivedAt: new Date(payload.timestamp || payload.receivedAt),
        sentiment: 'neutral',
        processed: false
      }

      this.replies.push(reply)
      return reply
    } catch (error) {
      console.error('Error processing webhook:', error)
      return null
    }
  }

  private verifyWebhookSignature(payload: any, signature: string): boolean {
    return true
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }
}

export class EmailMonitor {
  private replyService: ReplyDetectionService
  private config: EmailMonitorConfig
  private pollingActive = false
  private sentEmails: Map<string, SentEmail> = new Map()
  private replies: EmailReply[] = []
  private listeners: Array<(reply: EmailReply) => void> = []

  constructor(replyService: ReplyDetectionService, config: EmailMonitorConfig = {}) {
    this.replyService = replyService
    this.config = {
      pollIntervalMs: 30000,
      enableWebhooks: false,
      ...config
    }
  }

  addSentEmail(sentEmail: SentEmail): void {
    this.sentEmails.set(sentEmail.id, sentEmail)
  }

  addSentEmails(sentEmails: SentEmail[]): void {
    sentEmails.forEach(email => this.addSentEmail(email))
  }

  startMonitoring(): void {
    if (this.pollingActive) return

    this.pollingActive = true
    this.pollForReplies()
  }

  stopMonitoring(): void {
    this.pollingActive = false
  }

  onReplyReceived(callback: (reply: EmailReply) => void): void {
    this.listeners.push(callback)
  }

  async setupWebhooks(webhookUrl: string): Promise<boolean> {
    if (!this.config.enableWebhooks || !this.replyService.setupWebhook) {
      return false
    }

    return await this.replyService.setupWebhook(webhookUrl)
  }

  getReplies(): EmailReply[] {
    return [...this.replies]
  }

  getUnprocessedReplies(): EmailReply[] {
    return this.replies.filter(reply => !reply.processed)
  }

  markReplyAsProcessed(replyId: string): void {
    const reply = this.replies.find(r => r.id === replyId)
    if (reply) {
      reply.processed = true
    }
  }

  private async pollForReplies(): Promise<void> {
    if (!this.pollingActive) return

    try {
      const sentEmailsList = Array.from(this.sentEmails.values())
      const newReplies = await this.replyService.checkForReplies(sentEmailsList)

      for (const reply of newReplies) {
        const existingReply = this.replies.find(r =>
          r.fromEmail === reply.fromEmail &&
          r.originalEmailId === reply.originalEmailId &&
          Math.abs(r.receivedAt.getTime() - reply.receivedAt.getTime()) < 60000
        )

        if (!existingReply) {
          this.replies.push(reply)
          this.updateSentEmailStatus(reply)
          this.notifyListeners(reply)
        }
      }
    } catch (error) {
      console.error('Error during reply polling:', error)
    }

    setTimeout(() => this.pollForReplies(), this.config.pollIntervalMs)
  }

  private updateSentEmailStatus(reply: EmailReply): void {
    const sentEmail = Array.from(this.sentEmails.values())
      .find(email => email.contactEmail === reply.fromEmail)

    if (sentEmail) {
      sentEmail.status = 'replied'
      sentEmail.replyReceived = true
    }
  }

  private notifyListeners(reply: EmailReply): void {
    this.listeners.forEach(callback => {
      try {
        callback(reply)
      } catch (error) {
        console.error('Error in reply listener:', error)
      }
    })
  }
}

export const createReplyMonitor = (
  type: 'imap' | 'webhook',
  config: any
): ReplyDetectionService => {
  switch (type) {
    case 'imap':
      return new IMAPReplyMonitor(config)
    case 'webhook':
      return new WebhookReplyMonitor(config.webhookSecret)
    default:
      throw new Error(`Unsupported reply monitor type: ${type}`)
  }
}