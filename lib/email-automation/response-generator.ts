import { EmailReply, EmailTemplate, Contact } from './types'
import { SentimentScore } from './sentiment-analyzer'

export interface ResponseTemplate {
  id: string
  name: string
  trigger: {
    sentiment?: ('positive' | 'negative' | 'neutral' | 'question')[]
    keywords?: string[]
    urgency?: ('low' | 'medium' | 'high')[]
  }
  subject: string
  body: string
  variables: string[]
  requiresHuman: boolean
  priority: number
}

export interface GeneratedResponse {
  id: string
  replyToEmailId: string
  subject: string
  body: string
  templateUsed?: string
  confidence: number
  requiresApproval: boolean
  generatedAt: Date
  approved?: boolean
  sentAt?: Date
}

export interface ResponseGenerator {
  generateResponse(email: EmailReply, sentiment: SentimentScore, originalContact?: Contact): Promise<GeneratedResponse>
}

export class TemplateBasedResponseGenerator implements ResponseGenerator {
  private templates: ResponseTemplate[]

  constructor(templates: ResponseTemplate[] = []) {
    this.templates = this.sortTemplatesByPriority([
      ...this.getDefaultTemplates(),
      ...templates
    ])
  }

  async generateResponse(
    email: EmailReply,
    sentiment: SentimentScore,
    originalContact?: Contact
  ): Promise<GeneratedResponse> {
    const matchingTemplate = this.findBestTemplate(email, sentiment)

    if (!matchingTemplate) {
      return this.createDefaultResponse(email, sentiment, originalContact)
    }

    const personalizedResponse = this.personalizeTemplate(
      matchingTemplate,
      email,
      sentiment,
      originalContact
    )

    return {
      id: this.generateId(),
      replyToEmailId: email.id,
      subject: personalizedResponse.subject,
      body: personalizedResponse.body,
      templateUsed: matchingTemplate.id,
      confidence: this.calculateConfidence(matchingTemplate, sentiment),
      requiresApproval: matchingTemplate.requiresHuman || sentiment.urgency === 'high',
      generatedAt: new Date()
    }
  }

  addTemplate(template: ResponseTemplate): void {
    this.templates.push(template)
    this.templates = this.sortTemplatesByPriority(this.templates)
  }

  private findBestTemplate(email: EmailReply, sentiment: SentimentScore): ResponseTemplate | null {
    for (const template of this.templates) {
      if (this.templateMatches(template, email, sentiment)) {
        return template
      }
    }
    return null
  }

  private templateMatches(template: ResponseTemplate, email: EmailReply, sentiment: SentimentScore): boolean {
    if (template.trigger.sentiment && !template.trigger.sentiment.includes(sentiment.sentiment)) {
      return false
    }

    if (template.trigger.urgency && !template.trigger.urgency.includes(sentiment.urgency)) {
      return false
    }

    if (template.trigger.keywords) {
      const emailText = `${email.subject} ${email.body}`.toLowerCase()
      const hasMatchingKeyword = template.trigger.keywords.some(keyword =>
        emailText.includes(keyword.toLowerCase())
      )
      if (!hasMatchingKeyword) {
        return false
      }
    }

    return true
  }

  private personalizeTemplate(
    template: ResponseTemplate,
    email: EmailReply,
    sentiment: SentimentScore,
    originalContact?: Contact
  ): { subject: string; body: string } {
    const senderName = this.extractSenderName(email.fromEmail)
    const firstName = originalContact?.firstName || senderName

    const replacements: Record<string, string> = {
      '{{firstName}}': firstName,
      '{{senderName}}': senderName,
      '{{senderEmail}}': email.fromEmail,
      '{{originalSubject}}': email.subject,
      '{{sentiment}}': sentiment.sentiment,
      '{{urgency}}': sentiment.urgency,
      '{{currentDate}}': new Date().toLocaleDateString(),
      '{{currentTime}}': new Date().toLocaleTimeString()
    }

    let subject = template.subject
    let body = template.body

    for (const [placeholder, value] of Object.entries(replacements)) {
      const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
      subject = subject.replace(regex, value)
      body = body.replace(regex, value)
    }

    return { subject, body }
  }

  private calculateConfidence(template: ResponseTemplate, sentiment: SentimentScore): number {
    let confidence = sentiment.confidence * 0.7

    if (sentiment.urgency === 'high') confidence -= 0.2
    else if (sentiment.urgency === 'medium') confidence -= 0.1

    confidence += (template.priority / 10) * 0.1

    return Math.max(0.1, Math.min(1.0, confidence))
  }

  private createDefaultResponse(
    email: EmailReply,
    sentiment: SentimentScore,
    originalContact?: Contact
  ): GeneratedResponse {
    const senderName = originalContact?.firstName || this.extractSenderName(email.fromEmail)

    let subject = `Re: ${email.subject}`
    let body = `Hello ${senderName},\n\nThank you for your email. We have received your message and will get back to you shortly.\n\nBest regards,\nRed Cross Events Team`

    if (sentiment.sentiment === 'question') {
      body = `Hello ${senderName},\n\nThank you for your question. We are reviewing your inquiry and will provide a detailed response soon.\n\nBest regards,\nRed Cross Events Team`
    } else if (sentiment.sentiment === 'negative') {
      body = `Hello ${senderName},\n\nWe apologize for any inconvenience. Your concerns are important to us and we will address them promptly. A team member will follow up with you soon.\n\nBest regards,\nRed Cross Events Team`
    }

    return {
      id: this.generateId(),
      replyToEmailId: email.id,
      subject,
      body,
      confidence: 0.5,
      requiresApproval: true,
      generatedAt: new Date()
    }
  }

  private extractSenderName(email: string): string {
    return email.split('@')[0].replace(/[._-]/g, ' ').split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }

  private sortTemplatesByPriority(templates: ResponseTemplate[]): ResponseTemplate[] {
    return templates.sort((a, b) => b.priority - a.priority)
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  private getDefaultTemplates(): ResponseTemplate[] {
    return [
      {
        id: 'positive-thanks',
        name: 'Positive Response Acknowledgment',
        trigger: {
          sentiment: ['positive'],
          keywords: ['thank', 'great', 'excellent', 'good']
        },
        subject: 'Re: {{originalSubject}}',
        body: 'Hello {{firstName}},\n\nThank you so much for your kind words! We really appreciate your positive feedback.\n\nIf you have any other questions or need assistance, please don\'t hesitate to reach out.\n\nBest regards,\nRed Cross Events Team',
        variables: ['firstName', 'originalSubject'],
        requiresHuman: false,
        priority: 8
      },
      {
        id: 'question-response',
        name: 'Question Auto-Response',
        trigger: {
          sentiment: ['question']
        },
        subject: 'Re: {{originalSubject}}',
        body: 'Hello {{firstName}},\n\nThank you for your question. We are reviewing your inquiry and will provide a detailed response within 24 hours.\n\nIn the meantime, you might find helpful information on our website or feel free to call us if this is urgent.\n\nBest regards,\nRed Cross Events Team',
        variables: ['firstName', 'originalSubject'],
        requiresHuman: false,
        priority: 7
      },
      {
        id: 'negative-urgent',
        name: 'Negative High Urgency Response',
        trigger: {
          sentiment: ['negative'],
          urgency: ['high']
        },
        subject: 'Re: {{originalSubject}} - We\'re Here to Help',
        body: 'Hello {{firstName}},\n\nWe sincerely apologize for any inconvenience you\'ve experienced. Your concerns are our top priority, and we want to resolve this matter immediately.\n\nA senior team member will contact you within the next few hours to address your concerns personally.\n\nThank you for bringing this to our attention.\n\nBest regards,\nRed Cross Events Team',
        variables: ['firstName', 'originalSubject'],
        requiresHuman: true,
        priority: 10
      },
      {
        id: 'general-acknowledgment',
        name: 'General Auto-Response',
        trigger: {
          sentiment: ['neutral']
        },
        subject: 'Re: {{originalSubject}}',
        body: 'Hello {{firstName}},\n\nThank you for your email. We have received your message and will respond within 24 hours.\n\nIf this is an urgent matter, please feel free to call our main office.\n\nBest regards,\nRed Cross Events Team',
        variables: ['firstName', 'originalSubject'],
        requiresHuman: false,
        priority: 5
      }
    ]
  }
}

export class AIResponseGenerator implements ResponseGenerator {
  private apiKey: string
  private model: string
  private fallbackGenerator: TemplateBasedResponseGenerator

  constructor(apiKey: string, model: string = 'gpt-3.5-turbo') {
    this.apiKey = apiKey
    this.model = model
    this.fallbackGenerator = new TemplateBasedResponseGenerator()
  }

  async generateResponse(
    email: EmailReply,
    sentiment: SentimentScore,
    originalContact?: Contact
  ): Promise<GeneratedResponse> {
    try {
      const response = await this.generateAIResponse(email, sentiment, originalContact)
      return response
    } catch (error) {
      console.error('AI response generation failed, using fallback:', error)
      return this.fallbackGenerator.generateResponse(email, sentiment, originalContact)
    }
  }

  private async generateAIResponse(
    email: EmailReply,
    sentiment: SentimentScore,
    originalContact?: Contact
  ): Promise<GeneratedResponse> {
    const senderName = originalContact?.firstName || this.extractSenderName(email.fromEmail)

    const prompt = this.createPrompt(email, sentiment, senderName)

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `You are a professional email response generator for Red Cross Events. Generate appropriate email responses based on the sentiment and content of incoming emails. Always be professional, helpful, and empathetic.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      })
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const data = await response.json()
    const generatedText = data.choices[0].message.content

    const { subject, body } = this.parseGeneratedResponse(generatedText, email.subject)

    return {
      id: this.generateId(),
      replyToEmailId: email.id,
      subject,
      body,
      confidence: sentiment.confidence * 0.9,
      requiresApproval: sentiment.urgency === 'high' || sentiment.sentiment === 'negative',
      generatedAt: new Date()
    }
  }

  private createPrompt(email: EmailReply, sentiment: SentimentScore, senderName: string): string {
    return `
Generate a professional email response for the following incoming email:

From: ${email.fromEmail}
Subject: ${email.subject}
Body: ${email.body}

Analysis:
- Sentiment: ${sentiment.sentiment}
- Confidence: ${sentiment.confidence}
- Urgency: ${sentiment.urgency}
- Is Question: ${sentiment.isQuestion}
- Keywords: ${sentiment.keywords.join(', ')}

Sender Name: ${senderName}

Please generate an appropriate response that:
1. Addresses the sender's concerns appropriately based on the sentiment
2. Is professional and empathetic
3. Provides helpful information or next steps
4. Maintains the Red Cross Events brand voice

Format your response as:
SUBJECT: [response subject]
BODY: [response body]
`
  }

  private parseGeneratedResponse(generatedText: string, originalSubject: string): { subject: string; body: string } {
    const lines = generatedText.trim().split('\n')
    let subject = `Re: ${originalSubject}`
    let body = generatedText

    const subjectMatch = generatedText.match(/SUBJECT:\s*(.+)/i)
    const bodyMatch = generatedText.match(/BODY:\s*([\s\S]+)/i)

    if (subjectMatch) {
      subject = subjectMatch[1].trim()
    }

    if (bodyMatch) {
      body = bodyMatch[1].trim()
    }

    return { subject, body }
  }

  private extractSenderName(email: string): string {
    return email.split('@')[0].replace(/[._-]/g, ' ').split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }
}

export class ResponseManager {
  private generator: ResponseGenerator
  private pendingResponses: Map<string, GeneratedResponse> = new Map()
  private approvedResponses: Map<string, GeneratedResponse> = new Map()

  constructor(generator: ResponseGenerator) {
    this.generator = generator
  }

  async generateResponse(
    email: EmailReply,
    sentiment: SentimentScore,
    originalContact?: Contact
  ): Promise<GeneratedResponse> {
    const response = await this.generator.generateResponse(email, sentiment, originalContact)

    if (response.requiresApproval) {
      this.pendingResponses.set(response.id, response)
    } else {
      this.approvedResponses.set(response.id, response)
      response.approved = true
    }

    return response
  }

  getPendingResponses(): GeneratedResponse[] {
    return Array.from(this.pendingResponses.values())
  }

  getApprovedResponses(): GeneratedResponse[] {
    return Array.from(this.approvedResponses.values())
  }

  approveResponse(responseId: string): boolean {
    const response = this.pendingResponses.get(responseId)
    if (response) {
      response.approved = true
      this.pendingResponses.delete(responseId)
      this.approvedResponses.set(responseId, response)
      return true
    }
    return false
  }

  rejectResponse(responseId: string): boolean {
    return this.pendingResponses.delete(responseId)
  }

  markAsSent(responseId: string): boolean {
    const response = this.approvedResponses.get(responseId)
    if (response) {
      response.sentAt = new Date()
      return true
    }
    return false
  }
}

export const createResponseGenerator = (
  type: 'template' | 'ai',
  config?: { apiKey?: string; model?: string; templates?: ResponseTemplate[] }
): ResponseGenerator => {
  switch (type) {
    case 'template':
      return new TemplateBasedResponseGenerator(config?.templates)
    case 'ai':
      if (!config?.apiKey) {
        throw new Error('API key required for AI response generator')
      }
      return new AIResponseGenerator(config.apiKey, config.model)
    default:
      throw new Error(`Unsupported response generator type: ${type}`)
  }
}