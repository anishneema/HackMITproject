import { SentEmail, FollowUpRule, EmailReply, EmailTemplate } from './types'
import { SentimentScore } from './sentiment-analyzer'

export interface FollowUpEvent {
  id: string
  sentEmailId: string
  scheduledFor: Date
  ruleId: string
  templateId: string
  status: 'scheduled' | 'sent' | 'cancelled' | 'skipped'
  reason?: string
  executedAt?: Date
}

export interface FollowUpScheduler {
  scheduleFollowUps(sentEmails: SentEmail[], rules: FollowUpRule[]): Promise<FollowUpEvent[]>
  checkAndExecuteFollowUps(): Promise<FollowUpEvent[]>
  cancelFollowUp(followUpId: string): boolean
  rescheduleFollowUp(followUpId: string, newDate: Date): boolean
}

export class IntelligentFollowUpScheduler implements FollowUpScheduler {
  private scheduledFollowUps: Map<string, FollowUpEvent> = new Map()
  private replies: Map<string, EmailReply> = new Map()
  private sentimentScores: Map<string, SentimentScore> = new Map()

  constructor() {
    this.startSchedulerLoop()
  }

  async scheduleFollowUps(sentEmails: SentEmail[], rules: FollowUpRule[]): Promise<FollowUpEvent[]> {
    const events: FollowUpEvent[] = []

    for (const sentEmail of sentEmails) {
      if (sentEmail.status === 'replied') {
        continue
      }

      const applicableRules = this.findApplicableRules(sentEmail, rules)

      for (const rule of applicableRules) {
        if (sentEmail.followUpCount >= rule.conditions.maxFollowUps) {
          continue
        }

        const scheduledDate = this.calculateFollowUpDate(sentEmail, rule)
        const followUp: FollowUpEvent = {
          id: this.generateId(),
          sentEmailId: sentEmail.id,
          scheduledFor: scheduledDate,
          ruleId: rule.id,
          templateId: rule.templateId,
          status: 'scheduled'
        }

        this.scheduledFollowUps.set(followUp.id, followUp)
        events.push(followUp)
      }
    }

    return events
  }

  async checkAndExecuteFollowUps(): Promise<FollowUpEvent[]> {
    const now = new Date()
    const executed: FollowUpEvent[] = []

    for (const [id, followUp] of this.scheduledFollowUps.entries()) {
      if (followUp.status !== 'scheduled' || followUp.scheduledFor > now) {
        continue
      }

      const shouldExecute = await this.shouldExecuteFollowUp(followUp)

      if (shouldExecute.execute) {
        followUp.status = 'sent'
        followUp.executedAt = now
        executed.push(followUp)
      } else {
        followUp.status = 'skipped'
        followUp.reason = shouldExecute.reason
      }
    }

    return executed
  }

  addReply(reply: EmailReply, sentiment?: SentimentScore): void {
    this.replies.set(reply.originalEmailId, reply)
    if (sentiment) {
      this.sentimentScores.set(reply.id, sentiment)
    }

    this.cancelFollowUpsForRepliedEmail(reply.originalEmailId)
  }

  cancelFollowUp(followUpId: string): boolean {
    const followUp = this.scheduledFollowUps.get(followUpId)
    if (followUp && followUp.status === 'scheduled') {
      followUp.status = 'cancelled'
      return true
    }
    return false
  }

  rescheduleFollowUp(followUpId: string, newDate: Date): boolean {
    const followUp = this.scheduledFollowUps.get(followUpId)
    if (followUp && followUp.status === 'scheduled') {
      followUp.scheduledFor = newDate
      return true
    }
    return false
  }

  getScheduledFollowUps(): FollowUpEvent[] {
    return Array.from(this.scheduledFollowUps.values())
      .filter(f => f.status === 'scheduled')
  }

  getFollowUpsByStatus(status: FollowUpEvent['status']): FollowUpEvent[] {
    return Array.from(this.scheduledFollowUps.values())
      .filter(f => f.status === status)
  }

  private findApplicableRules(sentEmail: SentEmail, rules: FollowUpRule[]): FollowUpRule[] {
    return rules.filter(rule => {
      if (!rule.enabled) return false

      const daysSinceSent = Math.floor(
        (Date.now() - sentEmail.sentAt.getTime()) / (1000 * 60 * 60 * 24)
      )

      if (daysSinceSent < rule.conditions.noReplyAfterDays) {
        return false
      }

      const reply = this.replies.get(sentEmail.id)
      if (reply) {
        const sentiment = this.sentimentScores.get(reply.id)
        if (sentiment && rule.conditions.sentimentFilter) {
          return rule.conditions.sentimentFilter.includes(sentiment.sentiment)
        }
        return false
      }

      return true
    })
  }

  private calculateFollowUpDate(sentEmail: SentEmail, rule: FollowUpRule): Date {
    const baseDays = rule.conditions.noReplyAfterDays
    let additionalDays = 0

    if (sentEmail.followUpCount === 1) {
      additionalDays = 3
    } else if (sentEmail.followUpCount === 2) {
      additionalDays = 7
    } else if (sentEmail.followUpCount >= 3) {
      additionalDays = 14
    }

    const lastContactDate = sentEmail.lastFollowUp || sentEmail.sentAt
    const followUpDate = new Date(lastContactDate)
    followUpDate.setDate(followUpDate.getDate() + baseDays + additionalDays)

    return this.adjustToBusinessHours(followUpDate)
  }

  private adjustToBusinessHours(date: Date): Date {
    const businessHours = {
      start: 9,
      end: 17,
      workingDays: [1, 2, 3, 4, 5]
    }

    let adjustedDate = new Date(date)

    if (!businessHours.workingDays.includes(adjustedDate.getDay())) {
      const daysUntilMonday = (8 - adjustedDate.getDay()) % 7 || 1
      adjustedDate.setDate(adjustedDate.getDate() + daysUntilMonday)
    }

    if (adjustedDate.getHours() < businessHours.start) {
      adjustedDate.setHours(businessHours.start, 0, 0, 0)
    } else if (adjustedDate.getHours() >= businessHours.end) {
      adjustedDate.setDate(adjustedDate.getDate() + 1)
      adjustedDate.setHours(businessHours.start, 0, 0, 0)
    }

    return adjustedDate
  }

  private async shouldExecuteFollowUp(followUp: FollowUpEvent): Promise<{
    execute: boolean
    reason?: string
  }> {
    const reply = this.replies.get(followUp.sentEmailId)
    if (reply) {
      return {
        execute: false,
        reason: 'Email already received a reply'
      }
    }

    const recentFollowUps = Array.from(this.scheduledFollowUps.values())
      .filter(f =>
        f.sentEmailId === followUp.sentEmailId &&
        f.status === 'sent' &&
        f.executedAt &&
        (Date.now() - f.executedAt.getTime()) < 24 * 60 * 60 * 1000
      )

    if (recentFollowUps.length > 0) {
      return {
        execute: false,
        reason: 'Recent follow-up already sent within 24 hours'
      }
    }

    return { execute: true }
  }

  private cancelFollowUpsForRepliedEmail(sentEmailId: string): void {
    for (const [id, followUp] of this.scheduledFollowUps.entries()) {
      if (followUp.sentEmailId === sentEmailId && followUp.status === 'scheduled') {
        followUp.status = 'cancelled'
        followUp.reason = 'Email received reply'
      }
    }
  }

  private startSchedulerLoop(): void {
    setInterval(async () => {
      try {
        await this.checkAndExecuteFollowUps()
      } catch (error) {
        console.error('Error in follow-up scheduler loop:', error)
      }
    }, 60000)
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }
}

export class FollowUpAnalytics {
  private followUps: FollowUpEvent[]
  private sentEmails: SentEmail[]

  constructor(followUps: FollowUpEvent[], sentEmails: SentEmail[]) {
    this.followUps = followUps
    this.sentEmails = sentEmails
  }

  getFollowUpEffectiveness(): {
    totalFollowUps: number
    responseRate: number
    averageResponseTime: number
    followUpsByRule: Record<string, number>
    bestPerformingRules: Array<{ ruleId: string; responseRate: number }>
  } {
    const totalFollowUps = this.followUps.filter(f => f.status === 'sent').length
    const repliedEmails = this.sentEmails.filter(e => e.replyReceived).length

    const followUpsByRule: Record<string, number> = {}
    const responsesByRule: Record<string, number> = {}

    for (const followUp of this.followUps) {
      if (followUp.status === 'sent') {
        followUpsByRule[followUp.ruleId] = (followUpsByRule[followUp.ruleId] || 0) + 1

        const sentEmail = this.sentEmails.find(e => e.id === followUp.sentEmailId)
        if (sentEmail?.replyReceived) {
          responsesByRule[followUp.ruleId] = (responsesByRule[followUp.ruleId] || 0) + 1
        }
      }
    }

    const bestPerformingRules = Object.keys(followUpsByRule)
      .map(ruleId => ({
        ruleId,
        responseRate: (responsesByRule[ruleId] || 0) / followUpsByRule[ruleId]
      }))
      .sort((a, b) => b.responseRate - a.responseRate)

    return {
      totalFollowUps,
      responseRate: totalFollowUps > 0 ? repliedEmails / totalFollowUps : 0,
      averageResponseTime: this.calculateAverageResponseTime(),
      followUpsByRule,
      bestPerformingRules
    }
  }

  getSchedulingMetrics(): {
    scheduledCount: number
    executedCount: number
    cancelledCount: number
    skippedCount: number
    executionRate: number
    averageDelayFromScheduled: number
  } {
    const scheduled = this.followUps.filter(f => f.status === 'scheduled').length
    const executed = this.followUps.filter(f => f.status === 'sent').length
    const cancelled = this.followUps.filter(f => f.status === 'cancelled').length
    const skipped = this.followUps.filter(f => f.status === 'skipped').length

    const executedFollowUps = this.followUps.filter(f => f.status === 'sent' && f.executedAt)
    const averageDelay = executedFollowUps.length > 0
      ? executedFollowUps.reduce((sum, f) => {
          const delay = f.executedAt!.getTime() - f.scheduledFor.getTime()
          return sum + Math.max(0, delay)
        }, 0) / executedFollowUps.length
      : 0

    return {
      scheduledCount: scheduled,
      executedCount: executed,
      cancelledCount: cancelled,
      skippedCount: skipped,
      executionRate: (scheduled + executed) > 0 ? executed / (scheduled + executed) : 0,
      averageDelayFromScheduled: averageDelay / (1000 * 60)
    }
  }

  private calculateAverageResponseTime(): number {
    const respondedEmails = this.sentEmails.filter(e => e.replyReceived && e.lastFollowUp)

    if (respondedEmails.length === 0) return 0

    const totalTime = respondedEmails.reduce((sum, email) => {
      const responseTime = Date.now() - (email.lastFollowUp?.getTime() || email.sentAt.getTime())
      return sum + responseTime
    }, 0)

    return totalTime / respondedEmails.length / (1000 * 60 * 60)
  }
}

export const createDefaultFollowUpRules = (): FollowUpRule[] => [
  {
    id: 'general-followup-1',
    name: 'First Follow-up (3 days)',
    conditions: {
      noReplyAfterDays: 3,
      maxFollowUps: 3
    },
    templateId: 'followup-template-1',
    enabled: true
  },
  {
    id: 'general-followup-2',
    name: 'Second Follow-up (7 days)',
    conditions: {
      noReplyAfterDays: 7,
      maxFollowUps: 3
    },
    templateId: 'followup-template-2',
    enabled: true
  },
  {
    id: 'urgent-followup',
    name: 'Urgent Follow-up (1 day)',
    conditions: {
      noReplyAfterDays: 1,
      maxFollowUps: 2,
      sentimentFilter: ['negative']
    },
    templateId: 'urgent-followup-template',
    enabled: true
  }
]