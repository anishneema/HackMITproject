import { AgentMailClient, AgentMailError } from 'agentmail'

export interface EmailContact {
  email: string
  firstName?: string
  lastName?: string
  name?: string
  customFields?: Record<string, string>
}

export interface EmailTemplate {
  subject: string
  body: string
}

export interface EmailCampaign {
  contacts: EmailContact[]
  template: EmailTemplate
  eventName: string
  fromEmail: string
  fromName: string
}

export class AgentMailEmailSender {
  private client: AgentMailClient | null = null
  private isInitialized = false

  constructor() {
    this.initializeClient()
  }

  private initializeClient() {
    const apiKey = process.env.AGENT_MAIL_API_KEY

    if (!apiKey) {
      console.error('AgentMail API key not found in environment variables')
      return
    }

    try {
      this.client = new AgentMailClient({
        apiKey: apiKey
      })
      this.isInitialized = true
      console.log('AgentMail email sender initialized with API')
    } catch (error) {
      console.error('Failed to initialize AgentMail client:', error)
    }
  }

  isReady(): boolean {
    return this.isInitialized && this.client !== null
  }

  async sendEmailCampaign(campaign: EmailCampaign): Promise<{
    success: boolean
    sent: number
    failed: number
    errors: string[]
    campaignId: string
  }> {
    if (!this.isReady() || !this.client) {
      return {
        success: false,
        sent: 0,
        failed: campaign.contacts.length,
        errors: ['AgentMail service not initialized'],
        campaignId: `failed_${Date.now()}`
      }
    }

    const campaignId = `campaign_${Date.now()}`
    const results = {
      success: true,
      sent: 0,
      failed: 0,
      errors: [] as string[],
      campaignId
    }

    console.log(`Starting AgentMail campaign ${campaignId} to ${campaign.contacts.length} contacts`)

    for (const contact of campaign.contacts) {
      try {
        const personalizedSubject = this.personalizeTemplate(campaign.template.subject, contact)
        const personalizedBody = this.personalizeTemplate(campaign.template.body, contact)

        // Use AgentMail API to send individual emails
        await this.client.inboxes.messages.send(process.env.AGENT_MAIL_INBOX || 'hackmit@agentmail.to', {
          to: [contact.email],
          subject: personalizedSubject,
          text: personalizedBody,
          html: this.convertToHtml(personalizedBody),
          labels: [`campaign_${campaignId}`, `event_${campaign.eventName}`]
        })

        results.sent++
        console.log(`Email sent successfully to ${contact.email} via AgentMail`)

        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))

      } catch (error) {
        results.failed++
        const errorMsg = `Failed to send to ${contact.email}: ${error instanceof Error ? error.message : 'Unknown error'}`
        results.errors.push(errorMsg)
        console.error(errorMsg)

        // If it's an AgentMailError, log more details
        if (error instanceof AgentMailError) {
          console.error(`AgentMail Error (${error.statusCode}): ${error.message}`)
        }
      }
    }

    results.success = results.failed === 0
    console.log(`AgentMail campaign ${campaignId} completed: ${results.sent} sent, ${results.failed} failed`)

    return results
  }

  private personalizeTemplate(template: string, contact: EmailContact): string {
    let personalized = template

    // Replace placeholders with contact data
    personalized = personalized.replace(/\{\{firstName\}\}/g, contact.firstName || contact.name?.split(' ')[0] || 'Friend')
    personalized = personalized.replace(/\{\{lastName\}\}/g, contact.lastName || contact.name?.split(' ').slice(1).join(' ') || '')
    personalized = personalized.replace(/\{\{name\}\}/g, contact.name || `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'Friend')
    personalized = personalized.replace(/\{\{email\}\}/g, contact.email)

    // Replace custom fields
    if (contact.customFields) {
      Object.entries(contact.customFields).forEach(([key, value]) => {
        personalized = personalized.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value)
      })
    }

    return personalized
  }

  private convertToHtml(text: string): string {
    return text
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/^/, '<p>')
      .replace(/$/, '</p>')
  }

  async testConnection(): Promise<boolean> {
    if (!this.isReady() || !this.client) {
      return false
    }

    try {
      // Test the connection by trying to list inboxes
      await this.client.inboxes.list({})
      console.log('AgentMail connection verified successfully')
      return true
    } catch (error) {
      console.error('AgentMail connection failed:', error)
      return false
    }
  }
}

export const agentMailEmailSender = new AgentMailEmailSender()
