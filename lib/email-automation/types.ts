export interface Contact {
  email: string
  firstName?: string
  lastName?: string
  organization?: string
  customFields?: Record<string, string>
}

export interface EmailTemplate {
  id: string
  subject: string
  body: string
  variables: string[]
}

export interface SentEmail {
  id: string
  contactEmail: string
  templateId: string
  sentAt: Date
  status: 'sent' | 'delivered' | 'opened' | 'replied'
  replyReceived?: boolean
  lastFollowUp?: Date
  followUpCount: number
}

export interface EmailReply {
  id: string
  originalEmailId: string
  fromEmail: string
  subject: string
  body: string
  receivedAt: Date
  sentiment: 'positive' | 'negative' | 'neutral' | 'question'
  processed: boolean
  autoResponseSent?: boolean
}

export interface FollowUpRule {
  id: string
  name: string
  conditions: {
    noReplyAfterDays: number
    maxFollowUps: number
    sentimentFilter?: ('positive' | 'negative' | 'neutral' | 'question')[]
  }
  templateId: string
  enabled: boolean
}

export interface EmailCampaign {
  id: string
  name: string
  contacts: Contact[]
  templateId: string
  followUpRules: FollowUpRule[]
  status: 'draft' | 'running' | 'paused' | 'completed'
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
}