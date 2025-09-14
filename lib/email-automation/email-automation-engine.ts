import {
  Contact,
  EmailTemplate,
  SentEmail,
  EmailReply,
  EmailCampaign,
  FollowUpRule
} from './types'

import { CSVReader } from './csv-reader'
import { EmailSender, EmailProvider, createEmailProvider } from './email-sender'
import { EmailMonitor, ReplyDetectionService, createReplyMonitor } from './email-monitor'
import {
  SentimentProcessor,
  SentimentAnalyzer,
  createSentimentAnalyzer,
  SentimentScore
} from './sentiment-analyzer'
import {
  ResponseManager,
  ResponseGenerator,
  createResponseGenerator,
  GeneratedResponse
} from './response-generator'
import {
  IntelligentFollowUpScheduler,
  FollowUpEvent,
  FollowUpAnalytics,
  createDefaultFollowUpRules
} from './follow-up-scheduler'

export interface EmailAutomationConfig {
  emailProvider: {
    type: 'resend' | 'sendgrid'
    apiKey: string
    fromEmail: string
    fromName?: string
  }
  replyMonitor: {
    type: 'webhook' | 'imap'
    config: any
  }
  sentimentAnalyzer: {
    type: 'rule-based' | 'openai'
    config?: { apiKey?: string }
  }
  responseGenerator: {
    type: 'template' | 'ai'
    config?: { apiKey?: string; model?: string }
  }
  followUpRules?: FollowUpRule[]
  settings?: {
    batchSize?: number
    sendDelayMs?: number
    autoApproveResponses?: boolean
    maxFollowUps?: number
  }
}

export class EmailAutomationEngine {
  private emailSender: EmailSender
  private emailMonitor: EmailMonitor
  private sentimentProcessor: SentimentProcessor
  private responseManager: ResponseManager
  private followUpScheduler: IntelligentFollowUpScheduler
  private config: EmailAutomationConfig

  private campaigns: Map<string, EmailCampaign> = new Map()
  private sentEmails: Map<string, SentEmail> = new Map()
  private replies: Map<string, EmailReply> = new Map()
  private isRunning = false

  constructor(config: EmailAutomationConfig) {
    this.config = config

    const emailProvider = createEmailProvider(
      config.emailProvider.type,
      config.emailProvider.apiKey,
      config.emailProvider.fromEmail,
      config.emailProvider.fromName
    )
    this.emailSender = new EmailSender(emailProvider)

    const replyMonitor = createReplyMonitor(
      config.replyMonitor.type,
      config.replyMonitor.config
    )
    this.emailMonitor = new EmailMonitor(replyMonitor)

    const sentimentAnalyzer = createSentimentAnalyzer(
      config.sentimentAnalyzer.type,
      config.sentimentAnalyzer.config
    )
    this.sentimentProcessor = new SentimentProcessor(sentimentAnalyzer)

    const responseGenerator = createResponseGenerator(
      config.responseGenerator.type,
      config.responseGenerator.config
    )
    this.responseManager = new ResponseManager(responseGenerator)

    this.followUpScheduler = new IntelligentFollowUpScheduler()

    this.setupEventHandlers()
  }

  async createCampaign(
    name: string,
    csvFile: File,
    template: EmailTemplate,
    followUpRules?: FollowUpRule[]
  ): Promise<EmailCampaign> {
    const contacts = await CSVReader.parseCSVFile(csvFile)

    const campaign: EmailCampaign = {
      id: this.generateId(),
      name,
      contacts,
      templateId: template.id,
      followUpRules: followUpRules || createDefaultFollowUpRules(),
      status: 'draft',
      createdAt: new Date()
    }

    this.campaigns.set(campaign.id, campaign)
    return campaign
  }

  async createCampaignFromContacts(
    name: string,
    contacts: Contact[],
    template: EmailTemplate,
    followUpRules?: FollowUpRule[]
  ): Promise<EmailCampaign> {
    const campaign: EmailCampaign = {
      id: this.generateId(),
      name,
      contacts,
      templateId: template.id,
      followUpRules: followUpRules || createDefaultFollowUpRules(),
      status: 'draft',
      createdAt: new Date()
    }

    this.campaigns.set(campaign.id, campaign)
    return campaign
  }

  async startCampaign(campaignId: string): Promise<boolean> {
    const campaign = this.campaigns.get(campaignId)
    if (!campaign || campaign.status !== 'draft') {
      return false
    }

    campaign.status = 'running'
    campaign.startedAt = new Date()

    this.campaigns.set(campaignId, campaign)

    const template: EmailTemplate = {
      id: campaign.templateId,
      subject: 'Red Cross Event Invitation',
      body: `Hello {{firstName}},

We hope this message finds you well. We're reaching out to invite you to participate in an upcoming Red Cross event in your area.

Your support has always been invaluable to our mission, and we would be honored to have you join us for this important initiative.

Event Details:
- Date: [To be announced]
- Location: [To be announced]
- Purpose: Community outreach and volunteer coordination

We'll be sending more specific details soon, but we wanted to reach out early to gauge your interest and availability.

Please feel free to reply to this email with any questions or to confirm your interest in participating.

Thank you for your continued support of the Red Cross mission.

Best regards,
{{fromName}}
Red Cross Events Team`,
      variables: ['firstName', 'fromName']
    }

    await this.sendBulkEmails(campaign.contacts, template, campaignId)

    if (!this.isRunning) {
      this.startAutomationLoop()
    }

    return true
  }

  async pauseCampaign(campaignId: string): Promise<boolean> {
    const campaign = this.campaigns.get(campaignId)
    if (!campaign || campaign.status !== 'running') {
      return false
    }

    campaign.status = 'paused'
    this.campaigns.set(campaignId, campaign)
    return true
  }

  async resumeCampaign(campaignId: string): Promise<boolean> {
    const campaign = this.campaigns.get(campaignId)
    if (!campaign || campaign.status !== 'paused') {
      return false
    }

    campaign.status = 'running'
    this.campaigns.set(campaignId, campaign)
    return true
  }

  getCampaigns(): EmailCampaign[] {
    return Array.from(this.campaigns.values())
  }

  getCampaign(campaignId: string): EmailCampaign | undefined {
    return this.campaigns.get(campaignId)
  }

  getSentEmails(campaignId?: string): SentEmail[] {
    const emails = Array.from(this.sentEmails.values())
    return campaignId
      ? emails.filter(email => email.id.startsWith(campaignId))
      : emails
  }

  getReplies(campaignId?: string): EmailReply[] {
    const replies = Array.from(this.replies.values())
    if (!campaignId) return replies

    const campaignEmails = this.getSentEmails(campaignId)
    const emailIds = new Set(campaignEmails.map(e => e.id))

    return replies.filter(reply => emailIds.has(reply.originalEmailId))
  }

  getPendingResponses(): GeneratedResponse[] {
    return this.responseManager.getPendingResponses()
  }

  async approveResponse(responseId: string): Promise<boolean> {
    const approved = this.responseManager.approveResponse(responseId)
    if (approved) {
      const response = this.responseManager.getApprovedResponses()
        .find(r => r.id === responseId)

      if (response) {
        await this.sendResponse(response)
      }
    }
    return approved
  }

  getScheduledFollowUps(): FollowUpEvent[] {
    return this.followUpScheduler.getScheduledFollowUps()
  }

  getCampaignAnalytics(campaignId: string): {
    sentCount: number
    openRate: number
    replyRate: number
    sentimentBreakdown: Record<string, number>
    followUpMetrics: any
    responseTime: number
  } {
    const sentEmails = this.getSentEmails(campaignId)
    const replies = this.getReplies(campaignId)
    const followUps = this.followUpScheduler.getScheduledFollowUps()
      .filter(f => sentEmails.some(e => e.id === f.sentEmailId))

    const sentCount = sentEmails.length
    const repliedCount = replies.length
    const openedCount = sentEmails.filter(e => e.status === 'opened' || e.status === 'replied').length

    const sentimentBreakdown: Record<string, number> = {
      positive: 0,
      negative: 0,
      neutral: 0,
      question: 0
    }

    replies.forEach(reply => {
      if (reply.sentiment) {
        sentimentBreakdown[reply.sentiment]++
      }
    })

    const analytics = new FollowUpAnalytics(followUps, sentEmails)
    const followUpMetrics = analytics.getFollowUpEffectiveness()

    const avgResponseTime = replies.length > 0
      ? replies.reduce((sum, reply) => {
          const originalEmail = sentEmails.find(e => e.id === reply.originalEmailId)
          if (originalEmail) {
            return sum + (reply.receivedAt.getTime() - originalEmail.sentAt.getTime())
          }
          return sum
        }, 0) / replies.length / (1000 * 60 * 60)
      : 0

    return {
      sentCount,
      openRate: sentCount > 0 ? openedCount / sentCount : 0,
      replyRate: sentCount > 0 ? repliedCount / sentCount : 0,
      sentimentBreakdown,
      followUpMetrics,
      responseTime: avgResponseTime
    }
  }

  private async sendBulkEmails(
    contacts: Contact[],
    template: EmailTemplate,
    campaignId: string
  ): Promise<void> {
    const batchSize = this.config.settings?.batchSize || 50
    const delay = this.config.settings?.sendDelayMs || 1000

    for (let i = 0; i < contacts.length; i += batchSize) {
      const batch = contacts.slice(i, i + batchSize)

      try {
        const sentEmails = await this.emailSender.sendBulkEmails(batch, template, delay)

        sentEmails.forEach(sentEmail => {
          sentEmail.id = `${campaignId}-${sentEmail.id}`
          this.sentEmails.set(sentEmail.id, sentEmail)
          this.emailMonitor.addSentEmail(sentEmail)
        })

        await this.followUpScheduler.scheduleFollowUps(
          sentEmails,
          this.campaigns.get(campaignId)?.followUpRules || []
        )

        console.log(`Sent batch of ${batch.length} emails for campaign ${campaignId}`)
      } catch (error) {
        console.error(`Error sending batch for campaign ${campaignId}:`, error)
      }

      if (i + batchSize < contacts.length) {
        await new Promise(resolve => setTimeout(resolve, delay * 5))
      }
    }
  }

  private async sendResponse(response: GeneratedResponse): Promise<void> {
    const originalEmail = Array.from(this.sentEmails.values())
      .find(email => Array.from(this.replies.values())
        .some(reply => reply.id === response.replyToEmailId && reply.originalEmailId === email.id)
      )

    if (originalEmail) {
      const reply = this.replies.get(response.replyToEmailId)
      if (reply) {
        await this.emailSender.sendSingleEmail(
          { email: reply.fromEmail },
          {
            id: 'response',
            subject: response.subject,
            body: response.body,
            variables: []
          }
        )

        this.responseManager.markAsSent(response.id)
      }
    }
  }

  private setupEventHandlers(): void {
    this.emailMonitor.onReplyReceived(async (reply: EmailReply) => {
      this.replies.set(reply.id, reply)

      const sentiment = await this.sentimentProcessor.processEmails([reply])
      const sentimentScore = sentiment.get(reply.id)

      if (sentimentScore) {
        this.followUpScheduler.addReply(reply, sentimentScore)

        const originalContact = this.findOriginalContact(reply.fromEmail)
        const response = await this.responseManager.generateResponse(
          reply,
          sentimentScore,
          originalContact
        )

        if (this.config.settings?.autoApproveResponses && !response.requiresApproval) {
          await this.sendResponse(response)
        }

        console.log(`Processed reply from ${reply.fromEmail} with ${sentimentScore.sentiment} sentiment`)
      }
    })
  }

  private findOriginalContact(email: string): Contact | undefined {
    for (const campaign of this.campaigns.values()) {
      const contact = campaign.contacts.find(c => c.email === email)
      if (contact) return contact
    }
    return undefined
  }

  private startAutomationLoop(): void {
    if (this.isRunning) return

    this.isRunning = true
    this.emailMonitor.startMonitoring()

    setInterval(async () => {
      try {
        const executedFollowUps = await this.followUpScheduler.checkAndExecuteFollowUps()

        for (const followUp of executedFollowUps) {
          const sentEmail = this.sentEmails.get(followUp.sentEmailId)
          if (sentEmail) {
            sentEmail.followUpCount++
            sentEmail.lastFollowUp = new Date()
            this.sentEmails.set(sentEmail.id, sentEmail)
          }
        }

        if (executedFollowUps.length > 0) {
          console.log(`Executed ${executedFollowUps.length} follow-ups`)
        }
      } catch (error) {
        console.error('Error in automation loop:', error)
      }
    }, 30000)
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  async shutdown(): Promise<void> {
    this.isRunning = false
    this.emailMonitor.stopMonitoring()

    for (const campaign of this.campaigns.values()) {
      if (campaign.status === 'running') {
        campaign.status = 'paused'
      }
    }

    console.log('Email automation engine shutdown complete')
  }
}

export default EmailAutomationEngine