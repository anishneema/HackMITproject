import { Contact, EmailTemplate, SentEmail } from './types'

export interface EmailProvider {
  sendEmail(params: EmailSendParams): Promise<EmailSendResult>
  validateApiKey(): Promise<boolean>
}

export interface EmailSendParams {
  to: string
  subject: string
  htmlContent: string
  textContent?: string
  fromName?: string
  fromEmail?: string
}

export interface EmailSendResult {
  success: boolean
  messageId?: string
  error?: string
}

export class ResendProvider implements EmailProvider {
  private apiKey: string
  private fromEmail: string
  private fromName: string

  constructor(apiKey: string, fromEmail: string, fromName: string = 'Red Cross Events') {
    this.apiKey = apiKey
    this.fromEmail = fromEmail
    this.fromName = fromName
  }

  async sendEmail(params: EmailSendParams): Promise<EmailSendResult> {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          from: `${params.fromName || this.fromName} <${params.fromEmail || this.fromEmail}>`,
          to: [params.to],
          subject: params.subject,
          html: params.htmlContent,
          text: params.textContent
        })
      })

      const data = await response.json()

      if (!response.ok) {
        return {
          success: false,
          error: data.message || 'Failed to send email'
        }
      }

      return {
        success: true,
        messageId: data.id
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async validateApiKey(): Promise<boolean> {
    try {
      const response = await fetch('https://api.resend.com/domains', {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      })
      return response.ok
    } catch {
      return false
    }
  }
}

export class SendGridProvider implements EmailProvider {
  private apiKey: string
  private fromEmail: string
  private fromName: string

  constructor(apiKey: string, fromEmail: string, fromName: string = 'Red Cross Events') {
    this.apiKey = apiKey
    this.fromEmail = fromEmail
    this.fromName = fromName
  }

  async sendEmail(params: EmailSendParams): Promise<EmailSendResult> {
    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          personalizations: [{
            to: [{ email: params.to }]
          }],
          from: {
            email: params.fromEmail || this.fromEmail,
            name: params.fromName || this.fromName
          },
          subject: params.subject,
          content: [
            {
              type: 'text/html',
              value: params.htmlContent
            },
            ...(params.textContent ? [{
              type: 'text/plain',
              value: params.textContent
            }] : [])
          ]
        })
      })

      if (!response.ok) {
        const error = await response.text()
        return {
          success: false,
          error: `SendGrid error: ${error}`
        }
      }

      return {
        success: true,
        messageId: response.headers.get('x-message-id') || undefined
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async validateApiKey(): Promise<boolean> {
    try {
      const response = await fetch('https://api.sendgrid.com/v3/user/profile', {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      })
      return response.ok
    } catch {
      return false
    }
  }
}

export class EmailSender {
  private provider: EmailProvider

  constructor(provider: EmailProvider) {
    this.provider = provider
  }

  async sendSingleEmail(contact: Contact, template: EmailTemplate): Promise<SentEmail> {
    const personalizedContent = this.personalizeTemplate(template, contact)
    const result = await this.provider.sendEmail({
      to: contact.email,
      subject: personalizedContent.subject,
      htmlContent: personalizedContent.htmlContent,
      textContent: personalizedContent.textContent
    })

    const sentEmail: SentEmail = {
      id: this.generateId(),
      contactEmail: contact.email,
      templateId: template.id,
      sentAt: new Date(),
      status: result.success ? 'sent' : 'sent',
      followUpCount: 0
    }

    if (!result.success) {
      console.error(`Failed to send email to ${contact.email}: ${result.error}`)
    }

    return sentEmail
  }

  async sendBulkEmails(contacts: Contact[], template: EmailTemplate, delayMs: number = 1000): Promise<SentEmail[]> {
    const results: SentEmail[] = []

    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i]
      try {
        const sentEmail = await this.sendSingleEmail(contact, template)
        results.push(sentEmail)

        if (i < contacts.length - 1) {
          await this.delay(delayMs)
        }
      } catch (error) {
        console.error(`Error sending email to ${contact.email}:`, error)
        results.push({
          id: this.generateId(),
          contactEmail: contact.email,
          templateId: template.id,
          sentAt: new Date(),
          status: 'sent',
          followUpCount: 0
        })
      }
    }

    return results
  }

  private personalizeTemplate(template: EmailTemplate, contact: Contact): {
    subject: string
    htmlContent: string
    textContent: string
  } {
    let subject = template.subject
    let htmlContent = template.body
    let textContent = this.htmlToText(template.body)

    const replacements: Record<string, string> = {
      '{{firstName}}': contact.firstName || contact.email.split('@')[0],
      '{{lastName}}': contact.lastName || '',
      '{{fullName}}': [contact.firstName, contact.lastName].filter(Boolean).join(' ') || contact.email.split('@')[0],
      '{{email}}': contact.email,
      '{{organization}}': contact.organization || '',
      ...Object.entries(contact.customFields || {}).reduce((acc, [key, value]) => {
        acc[`{{${key}}}`] = value
        return acc
      }, {} as Record<string, string>)
    }

    for (const [placeholder, value] of Object.entries(replacements)) {
      const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
      subject = subject.replace(regex, value)
      htmlContent = htmlContent.replace(regex, value)
      textContent = textContent.replace(regex, value)
    }

    return { subject, htmlContent, textContent }
  }

  private htmlToText(html: string): string {
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim()
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }
}

export const createEmailProvider = (
  type: 'resend' | 'sendgrid',
  apiKey: string,
  fromEmail: string,
  fromName?: string
): EmailProvider => {
  switch (type) {
    case 'resend':
      return new ResendProvider(apiKey, fromEmail, fromName)
    case 'sendgrid':
      return new SendGridProvider(apiKey, fromEmail, fromName)
    default:
      throw new Error(`Unsupported email provider: ${type}`)
  }
}