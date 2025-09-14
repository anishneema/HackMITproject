// Webhook configuration for AgentMail integration
export const WEBHOOK_CONFIG = {
  // Your webhook details from AgentMail
  WEBHOOK_ID: 'd15ccdc7-b52c-4f57-afde-05a563101a1d',
  WEBHOOK_URL: 'https://hackmitproject.vercel.app/api/webhooks/email',
  WEBHOOK_SECRET: 'whsec_Ntga03PxjzsEWYjg2zNewhmFVVcgczk5',
  EVENT_TYPES: ['message.received'],
  
  // AgentMail settings
  INBOX_EMAIL: 'hackmit@agentmail.to',
  
  // Claude AI settings
  CLAUDE_MODEL: 'claude-3-haiku-20240307',
  CLAUDE_TEMPERATURE: 0.3,
  CLAUDE_MAX_TOKENS: 1000,
  
  // Reply settings
  AUTO_REPLY_ENABLED: true,
  MIN_CONFIDENCE_THRESHOLD: 0.7,
  MAX_REPLY_LENGTH: 500,
  
  // Rate limiting
  MAX_REPLIES_PER_HOUR: 50,
  REPLY_DELAY_MS: 2000,
}

export const RED_CROSS_CONTEXT = {
  organization: 'Red Cross Events',
  mission: 'Organizing blood drives and humanitarian events',
  currentEvent: {
    name: 'Community Center Blood Drive',
    date: 'September 20, 2025',
    time: '9:00 AM - 3:00 PM',
    location: 'Downtown Community Center',
    availableSpots: 38,
    totalSpots: 50
  },
  contactInfo: {
    phone: '(555) 123-4567',
    email: 'events@redcross.org',
    website: 'www.redcross.org/events'
  }
}

export interface WebhookStats {
  totalReceived: number
  repliesSent: number
  repliesSkipped: number
  errors: number
  lastProcessed: Date
}

export class WebhookStatsTracker {
  private stats: WebhookStats = {
    totalReceived: 0,
    repliesSent: 0,
    repliesSkipped: 0,
    errors: 0,
    lastProcessed: new Date()
  }

  incrementReceived() {
    this.stats.totalReceived++
    this.stats.lastProcessed = new Date()
  }

  incrementRepliesSent() {
    this.stats.repliesSent++
  }

  incrementRepliesSkipped() {
    this.stats.repliesSkipped++
  }

  incrementErrors() {
    this.stats.errors++
  }

  getStats(): WebhookStats {
    return { ...this.stats }
  }

  reset() {
    this.stats = {
      totalReceived: 0,
      repliesSent: 0,
      repliesSkipped: 0,
      errors: 0,
      lastProcessed: new Date()
    }
  }
}

// Global stats tracker instance
export const webhookStats = new WebhookStatsTracker()
