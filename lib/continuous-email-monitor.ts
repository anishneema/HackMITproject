import { emailResponseHandler } from './email-response-handler'
import { agentMailConversationService } from './agentmail-conversation-service'

export interface EmailMonitorConfig {
  checkInterval: number // milliseconds
  enabled: boolean
  lastCheckTime: Date
}

export class ContinuousEmailMonitor {
  private config: EmailMonitorConfig
  private isRunning = false
  private intervalId: NodeJS.Timeout | null = null

  constructor(checkIntervalSeconds = 5) {
    this.config = {
      checkInterval: checkIntervalSeconds * 1000,
      enabled: false,
      lastCheckTime: new Date()
    }
  }

  start(): boolean {
    if (this.isRunning) {
      console.log('⏳ Email monitor is already running')
      return false
    }

    if (!emailResponseHandler.isReady()) {
      console.error('❌ Email response handler is not ready')
      return false
    }

    console.log(`🚀 Starting continuous email monitor (checking every ${this.config.checkInterval / 1000} seconds)`)

    this.config.enabled = true
    this.isRunning = true
    this.config.lastCheckTime = new Date()

    // Start the interval
    this.intervalId = setInterval(async () => {
      await this.checkForNewEmails()
    }, this.config.checkInterval)

    // Run initial check immediately
    setTimeout(async () => {
      await this.checkForNewEmails()
    }, 100)

    return true
  }

  stop(): boolean {
    if (!this.isRunning) {
      console.log('📍 Email monitor is not running')
      return false
    }

    console.log('⏹️ Stopping continuous email monitor')

    this.config.enabled = false
    this.isRunning = false

    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }

    return true
  }

  private async checkForNewEmails(): Promise<void> {
    if (!this.config.enabled || !this.isRunning) {
      return
    }

    try {
      console.log('🔍 Checking for new emails since last check...')

      const currentTime = new Date()
      const lastCheckTime = this.config.lastCheckTime

      // Get all unread messages
      const unreadMessages = await agentMailConversationService.getUnreadMessages()
      console.log(`📬 Found ${unreadMessages.length} total unread messages`)

      // Filter messages that arrived after our last check
      const newMessages = unreadMessages.filter(message => {
        // Use the timestamp from the AgentMail message
        const messageDate = message.timestamp
        const isNew = messageDate > lastCheckTime

        console.log(`📅 Message from ${message.from}: ${messageDate.toISOString()} (last check: ${lastCheckTime.toISOString()}) - ${isNew ? 'NEW' : 'OLD'}`)

        return isNew
      })

      console.log(`📧 Found ${newMessages.length} new messages since ${lastCheckTime.toISOString()}`)

      if (newMessages.length > 0) {
        // Process only the new messages
        console.log('🤖 Processing new emails with Claude AI...')

        // Process the new messages using the existing handler
        // The handler will automatically filter out already processed emails and our own emails
        const processedEmails = await emailResponseHandler.processIncomingEmails()

        // Log results for the new messages we identified
        for (const message of newMessages) {
          const inboxEmail = process.env.AGENT_MAIL_INBOX || 'orcha@agentmail.to'
          if (message.from.includes(inboxEmail)) {
            console.log(`⏭️ Skipped email from our own inbox: ${message.from}`)
            continue
          }

          const thisEmailResult = processedEmails.find(processed =>
            processed.messageId === message.id ||
            processed.from === message.from
          )

          if (thisEmailResult) {
            if (thisEmailResult.success && thisEmailResult.sentResponse) {
              console.log(`✅ Successfully responded to new email from ${message.from}`)
            } else {
              console.log(`⚠️ Failed to process email from ${message.from}: ${thisEmailResult.error || 'Unknown error'}`)
            }
          } else {
            console.log(`📝 New email from ${message.from} was not processed in this batch`)
          }
        }
      } else {
        console.log('📭 No new emails to process')
      }

      // Update last check time
      this.config.lastCheckTime = currentTime

    } catch (error) {
      console.error('❌ Error in continuous email monitor:', error)
    }
  }

  getStatus(): {
    isRunning: boolean
    enabled: boolean
    checkInterval: number
    lastCheckTime: Date
    nextCheckIn?: number
  } {
    const status = {
      isRunning: this.isRunning,
      enabled: this.config.enabled,
      checkInterval: this.config.checkInterval,
      lastCheckTime: this.config.lastCheckTime
    }

    if (this.isRunning) {
      const now = Date.now()
      const lastCheck = this.config.lastCheckTime.getTime()
      const timeSinceLastCheck = now - lastCheck
      const nextCheckIn = Math.max(0, this.config.checkInterval - timeSinceLastCheck)

      return {
        ...status,
        nextCheckIn
      }
    }

    return status
  }

  updateInterval(newIntervalSeconds: number): boolean {
    if (newIntervalSeconds < 1) {
      console.error('❌ Check interval must be at least 1 second')
      return false
    }

    const wasRunning = this.isRunning

    if (wasRunning) {
      this.stop()
    }

    this.config.checkInterval = newIntervalSeconds * 1000
    console.log(`📝 Updated check interval to ${newIntervalSeconds} seconds`)

    if (wasRunning) {
      return this.start()
    }

    return true
  }
}

// Create singleton instance
export const emailMonitor = new ContinuousEmailMonitor(5)