import * as nodemailer from 'nodemailer'

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

export class EmailSender {
  private transporter: nodemailer.Transporter | null = null

  constructor() {
    this.initializeTransporter()
  }

  private initializeTransporter() {
    // Use AgentMail SMTP for sending emails from hackmit@agentmail.to
    const smtpHost = process.env.SMTP_HOST || 'smtp.agentmail.to'
    const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10)
    const smtpUser = process.env.SMTP_USER || 'hackmit@agentmail.to'
    const smtpPass = process.env.SMTP_PASS || 'your-agentmail-password'
    
    this.transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465, // true for 465, false for other ports
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    })

    console.log(`Email sender initialized with AgentMail SMTP (${smtpHost}:${smtpPort})`)
  }

  async sendEmailCampaign(campaign: EmailCampaign): Promise<{
    success: boolean
    sent: number
    failed: number
    errors: string[]
    campaignId: string
  }> {
    if (!this.transporter) {
      throw new Error('Email transporter not initialized')
    }

    const campaignId = `campaign_${Date.now()}`
    const results = {
      success: true,
      sent: 0,
      failed: 0,
      errors: [] as string[],
      campaignId
    }

    console.log(`Starting email campaign ${campaignId} to ${campaign.contacts.length} contacts`)

    for (const contact of campaign.contacts) {
      try {
        const personalizedSubject = this.personalizeTemplate(campaign.template.subject, contact)
        const personalizedBody = this.personalizeTemplate(campaign.template.body, contact)

        const mailOptions = {
          from: `"${campaign.fromName}" <${campaign.fromEmail}>`,
          to: contact.email,
          subject: personalizedSubject,
          text: personalizedBody,
          html: this.convertToHtml(personalizedBody),
          headers: {
            'X-Campaign-ID': campaignId,
            'X-Event-Name': campaign.eventName,
            'Reply-To': campaign.fromEmail
          }
        }

        await this.transporter.sendMail(mailOptions)
        results.sent++
        console.log(`Email sent successfully to ${contact.email}`)

        // Add a small delay to avoid being rate-limited
        await new Promise(resolve => setTimeout(resolve, 1000))

      } catch (error) {
        results.failed++
        const errorMsg = `Failed to send to ${contact.email}: ${error instanceof Error ? error.message : 'Unknown error'}`
        results.errors.push(errorMsg)
        console.error(errorMsg)
      }
    }

    results.success = results.failed === 0
    console.log(`Campaign ${campaignId} completed: ${results.sent} sent, ${results.failed} failed`)

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
    if (!this.transporter) {
      return false
    }

    try {
      await this.transporter.verify()
      console.log('SMTP connection verified successfully')
      return true
    } catch (error) {
      console.error('SMTP connection failed:', error)
      return false
    }
  }
}

export const emailSender = new EmailSender()
