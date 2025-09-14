#!/usr/bin/env node

/**
 * Email Polling System - Check for unresponded emails and send automated replies
 * This replaces the webhook system with a simple polling approach
 */

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' })

const { AgentMailClient } = require('agentmail')
const { Anthropic } = require('@anthropic-ai/sdk')
const fs = require('fs')
const path = require('path')

// File to store processed message IDs
const PROCESSED_FILE = path.join(__dirname, '.processed-emails.json')

class EmailPollingSystem {
  constructor() {
    this.client = new AgentMailClient({
      apiKey: process.env.AGENT_MAIL_API_KEY
    })
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    })
    this.processedEmails = this.loadProcessedEmails()
    this.isRunning = false
  }

  loadProcessedEmails() {
    try {
      if (fs.existsSync(PROCESSED_FILE)) {
        const data = fs.readFileSync(PROCESSED_FILE, 'utf8')
        return new Set(JSON.parse(data))
      }
    } catch (error) {
      console.log('📝 Creating new processed emails file')
    }
    return new Set()
  }

  saveProcessedEmails() {
    try {
      fs.writeFileSync(PROCESSED_FILE, JSON.stringify([...this.processedEmails]))
    } catch (error) {
      console.error('❌ Error saving processed emails:', error)
    }
  }

  async checkForNewEmails() {
    try {
      console.log('🔍 Checking for new unresponded emails...')
      
      // Get recent messages from orcha@agentmail.to
      const messages = await this.client.inboxes.messages.list('orcha@agentmail.to', {
        limit: 50
      })

      console.log(`📬 Found ${messages.count} total messages`)

      // Filter for unprocessed external messages
      const unprocessedMessages = messages.messages.filter(msg => {
        return (
          !msg.from.includes('agentmail.to') && 
          !msg.from.includes('amazonses.com') &&
          !this.processedEmails.has(msg.messageId)
        )
      })

      console.log(`📧 Found ${unprocessedMessages.length} unprocessed external messages`)

      if (unprocessedMessages.length === 0) {
        console.log('✅ No new emails to process')
        return
      }

      // Process each unprocessed message
      for (const message of unprocessedMessages) {
        await this.processEmail(message)
        
        // Mark as processed
        this.processedEmails.add(message.messageId)
        
        // Add delay between processing
        await new Promise(resolve => setTimeout(resolve, 3000))
      }

      // Save processed emails
      this.saveProcessedEmails()

    } catch (error) {
      console.error('❌ Error checking for new emails:', error)
    }
  }

  async processEmail(message) {
    try {
      console.log(`\n📧 Processing: ${message.from}`)
      console.log(`   Subject: ${message.subject}`)
      console.log(`   Message ID: ${message.messageId}`)

      // Get full message content
      const fullMessage = await this.client.inboxes.messages.get('orcha@agentmail.to', message.messageId)
      
      console.log(`   Content: ${fullMessage.text?.substring(0, 100)}...`)

      // Create webhook payload to process this message
      const webhookPayload = {
        id: `polling-${Date.now()}`,
        type: 'message.received',
        data: {
          id: message.messageId,
          from: message.from,
          to: ['orcha@agentmail.to'],
          subject: message.subject,
          text: fullMessage.text || 'No text content',
          html: fullMessage.html,
          thread_id: message.threadId,
          created_at: message.timestamp.toISOString()
        }
      }

      // Process the email directly with Claude AI
      console.log('   🤖 Processing with Claude AI...')
      
      const replyResult = await this.processWithClaude(fullMessage)
      
      // Always send the Claude response (never skip)
      console.log(`   ✅ Reply generated: ${replyResult.replyType} (confidence: ${replyResult.confidence})`)
      console.log(`   📝 Reply content: ${replyResult.replyContent}`)
      
      // Check if this is an attendance confirmation
      if (replyResult.isAttendanceConfirmed) {
        console.log(`   📅 ATTENDANCE CONFIRMED! Adding to calendar...`)
        await this.addToCalendar(message, replyResult)
      }
      
      // Send the reply directly via AgentMail
      const replySent = await this.sendDirectReply(message, replyResult.replyContent)
      
      if (replySent) {
        console.log(`   📤 Reply sent successfully!`)
      } else {
        console.log(`   ❌ Failed to send reply`)
      }

    } catch (error) {
      console.error(`   ❌ Error processing email: ${error.message}`)
    }
  }

  async startPolling(intervalSeconds = 5) {
    if (this.isRunning) {
      console.log('⚠️ Polling system is already running')
      return
    }

    console.log(`🚀 Starting email polling system (checking every ${intervalSeconds} seconds)`)
    this.isRunning = true

    // Initial check
    await this.checkForNewEmails()

    // Set up interval
    const intervalMs = intervalSeconds * 1000
    this.pollingInterval = setInterval(async () => {
      await this.checkForNewEmails()
    }, intervalMs)

    console.log(`✅ Polling system started successfully`)
  }

  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval)
      this.pollingInterval = null
    }
    this.isRunning = false
    console.log('🛑 Polling system stopped')
  }

  async runOnce() {
    console.log('🔄 Running email check once...')
    await this.checkForNewEmails()
    console.log('✅ Single check complete')
  }

  async processWithClaude(message) {
    try {
      const systemPrompt = `You are an AI assistant for a Red Cross blood drive organization. Your job is to analyze incoming email messages and generate helpful, informative responses.

REPLY TYPES:
- attendance_confirmed: User is confirming they will attend - add them to calendar
- information: Provide detailed event information and requirements
- scheduling: Help with appointment booking and next steps
- question_response: Answer specific questions about blood donation
- thank_you: Acknowledgment with event details included

AVAILABLE BLOOD DRIVE EVENTS:
1. Community Center Blood Drive
   - Date: September 20, 2025
   - Time: 9:00 AM - 3:00 PM
   - Location: Downtown Community Center, 123 Main Street
   - Available spots: 38 out of 50 total

2. University Campus Blood Drive
   - Date: September 25, 2025
   - Time: 10:00 AM - 4:00 PM
   - Location: University Student Center, 456 College Ave
   - Available spots: 45 out of 60 total

3. Tech Campus Blood Drive
   - Date: September 30, 2025
   - Time: 8:00 AM - 2:00 PM
   - Location: Innovation Tech Campus, 789 Tech Blvd
   - Available spots: 25 out of 40 total

4. Mall Plaza Blood Drive
   - Date: October 5, 2025
   - Time: 11:00 AM - 5:00 PM
   - Location: Central Mall Atrium, 321 Shopping Center
   - Available spots: 30 out of 50 total

REQUIREMENTS FOR ALL EVENTS:
- Must be 17+ years old, weigh at least 110 lbs, bring photo ID
- Preparation: Eat a good meal, drink plenty of water, bring a friend for support

ATTENDANCE DETECTION:
Look for these positive attendance indicators:
- "yes", "I can attend", "I'll be there", "count me in", "I'm coming"
- "I want to participate", "I'd like to donate", "sign me up"
- "I'm available", "I can make it", "I'll join you"
- Any enthusiastic agreement to participate

RESPONSE GUIDELINES:
- Always provide helpful, specific information
- Include relevant event details when appropriate
- Be encouraging and supportive about blood donation
- Keep responses friendly but informative (3-4 sentences)
- Always end with next steps or how to get more info
- For attendance confirmations, mention they're being added to the calendar

IMPORTANT: You must respond with ONLY a valid JSON object. Do not include any other text, explanation, or commentary.

Return this exact JSON structure:
{
  "shouldReply": true,
  "replyType": "string",
  "replyContent": "string",
  "confidence": number,
  "isAttendanceConfirmed": boolean
}`

      const userPrompt = `INCOMING MESSAGE:
From: ${message.from}
Subject: ${message.subject}
Content: ${message.text || message.html?.replace(/<[^>]*>/g, '') || 'No text content'}

Please analyze this message and provide your reply decision.`

      const response = await this.anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 500,
        temperature: 0.3,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }]
      })

      const content = response.content[0].type === 'text' ? response.content[0].text : ''

      // Parse Claude's JSON response
      try {
        let jsonStr = content.trim()
        
        // Extract JSON from response if it contains extra text
        const jsonStartIndex = jsonStr.indexOf('{')
        const jsonEndIndex = jsonStr.lastIndexOf('}') + 1
        
        if (jsonStartIndex !== -1 && jsonEndIndex !== -1 && jsonEndIndex > jsonStartIndex) {
          jsonStr = jsonStr.substring(jsonStartIndex, jsonEndIndex)
        }

        const decision = JSON.parse(jsonStr)

        // Validate response format
        if (typeof decision.shouldReply !== 'boolean' || !decision.replyContent) {
          throw new Error('Invalid response format from Claude')
        }

        return {
          shouldReply: decision.shouldReply,
          replyType: decision.replyType || 'thank_you',
          replyContent: decision.replyContent,
          confidence: decision.confidence || 0.8,
          isAttendanceConfirmed: decision.isAttendanceConfirmed || false
        }

      } catch (parseError) {
        console.error('❌ Failed to parse Claude response:', parseError)
        
        // Fallback: always reply with thank you
        return {
          shouldReply: true,
          replyType: 'thank_you',
          replyContent: 'Thank you for contacting us! We appreciate your message and will get back to you soon.',
          confidence: 0.5,
          isAttendanceConfirmed: false
        }
      }

    } catch (error) {
      console.error('❌ Error processing with Claude:', error)
      
      // Fallback: always reply with thank you
      return {
        shouldReply: true,
        replyType: 'thank_you',
        replyContent: 'Thank you for contacting us! We appreciate your message and will get back to you soon.',
        confidence: 0.3,
        isAttendanceConfirmed: false
      }
    }
  }

  async addToCalendar(message, replyResult) {
    try {
      // Extract name from email address
      const emailAddress = message.from
      const participantName = this.extractNameFromEmail(emailAddress)
      
      // Detect which event they're RSVPing for based on email content
      const eventDetails = this.detectEventFromEmail(message)
      
      console.log('📅 Detected event details:', eventDetails)
      
      // Create calendar event data
      const eventData = {
        title: `${eventDetails.eventName} - ${participantName}`,
        description: `Blood donation appointment for ${participantName} at ${eventDetails.eventName}`,
        startTime: eventDetails.startTime,
        endTime: eventDetails.endTime,
        attendees: [emailAddress],
        location: eventDetails.location,
        status: 'confirmed'
      }

      console.log('📅 Creating calendar event:', eventData)

      // Store booking locally (since AgentMail doesn't have calendar API)
      console.log('✅ Calendar event data prepared for storage')

      // Update dashboard store with the correct event
      await this.updateDashboardStore({
        participantEmail: emailAddress,
        participantName: participantName,
        eventDate: eventData.startTime,
        eventId: eventDetails.eventId
      })

      return true

    } catch (error) {
      console.error('❌ Failed to add to calendar:', error)
      return false
    }
  }

  detectEventFromEmail(message) {
    const content = (message.text || message.subject || '').toLowerCase()
    
    // Available events database
    const availableEvents = {
      'community-center-drive': {
        eventId: 'community-center-blood-drive-2025-09-20',
        eventName: 'Community Center Blood Drive',
        startTime: new Date('2025-09-20T09:00:00'),
        endTime: new Date('2025-09-20T15:00:00'),
        location: 'Downtown Community Center, 123 Main Street'
      },
      'university-campus-drive': {
        eventId: 'university-campus-blood-drive-2025-09-25',
        eventName: 'University Campus Blood Drive',
        startTime: new Date('2025-09-25T10:00:00'),
        endTime: new Date('2025-09-25T16:00:00'),
        location: 'University Student Center, 456 College Ave'
      },
      'tech-campus-drive': {
        eventId: 'tech-campus-blood-drive-2025-09-30',
        eventName: 'Tech Campus Blood Drive',
        startTime: new Date('2025-09-30T08:00:00'),
        endTime: new Date('2025-09-30T14:00:00'),
        location: 'Innovation Tech Campus, 789 Tech Blvd'
      },
      'mall-plaza-drive': {
        eventId: 'mall-plaza-blood-drive-2025-10-05',
        eventName: 'Mall Plaza Blood Drive',
        startTime: new Date('2025-10-05T11:00:00'),
        endTime: new Date('2025-10-05T17:00:00'),
        location: 'Central Mall Atrium, 321 Shopping Center'
      }
    }

    // Check for specific event mentions
    if (content.includes('community center') || content.includes('downtown') || content.includes('september 20')) {
      return availableEvents['community-center-drive']
    }
    
    if (content.includes('university') || content.includes('campus') || content.includes('september 25')) {
      return availableEvents['university-campus-drive']
    }
    
    if (content.includes('tech campus') || content.includes('innovation') || content.includes('september 30')) {
      return availableEvents['tech-campus-drive']
    }
    
    if (content.includes('mall') || content.includes('plaza') || content.includes('october 5')) {
      return availableEvents['mall-plaza-drive']
    }

    // Check for date mentions
    if (content.includes('september 20') || content.includes('9/20') || content.includes('20th')) {
      return availableEvents['community-center-drive']
    }
    
    if (content.includes('september 25') || content.includes('9/25') || content.includes('25th')) {
      return availableEvents['university-campus-drive']
    }
    
    if (content.includes('september 30') || content.includes('9/30') || content.includes('30th')) {
      return availableEvents['tech-campus-drive']
    }
    
    if (content.includes('october 5') || content.includes('10/5') || content.includes('5th')) {
      return availableEvents['mall-plaza-drive']
    }

    // Default to the most recent/upcoming event
    console.log('📅 No specific event detected, defaulting to Community Center Drive')
    return availableEvents['community-center-drive']
  }

  extractNameFromEmail(email) {
    // Extract name from email like "John Doe <john@example.com>"
    const nameMatch = email.match(/^(.+?)\s*<(.+)>$/)
    if (nameMatch) {
      return nameMatch[1].trim()
    }
    
    // If no name, use the part before @
    const emailPart = email.split('@')[0]
    return emailPart.charAt(0).toUpperCase() + emailPart.slice(1)
  }

  async updateDashboardStore(booking) {
    try {
      // Store booking locally in a JSON file
      const fs = require('fs')
      const path = require('path')
      const bookingsFile = path.join(__dirname, 'lib', '.bookings.json')
      
      let bookings = []
      try {
        if (fs.existsSync(bookingsFile)) {
          const data = fs.readFileSync(bookingsFile, 'utf8')
          bookings = JSON.parse(data)
        }
      } catch (error) {
        console.log('📝 Creating new bookings file')
      }

      const newBooking = {
        id: `booking-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        eventId: booking.eventId || 'community-center-blood-drive-2025-09-20',
        participantEmail: booking.participantEmail,
        participantName: booking.participantName,
        bookingDate: new Date().toISOString(),
        eventDate: booking.eventDate,
        status: 'confirmed',
        source: 'email_response',
        createdAt: new Date().toISOString()
      }

      bookings.push(newBooking)
      
      try {
        // Ensure directory exists
        const dir = path.dirname(bookingsFile)
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true })
        }
        
        fs.writeFileSync(bookingsFile, JSON.stringify(bookings, null, 2))
        console.log('✅ Booking saved to local file:', newBooking.id)
        console.log('📊 Total bookings:', bookings.length)
      } catch (error) {
        console.error('❌ Error saving booking to file:', error)
      }

    } catch (error) {
      console.log('⚠️ Dashboard store update failed:', error.message)
    }
  }

  async sendDirectReply(originalMessage, replyContent) {
    try {
      // Create reply subject
      const replySubject = originalMessage.subject.startsWith('Re:') 
        ? originalMessage.subject 
        : `Re: ${originalMessage.subject}`

      console.log('📤 Sending direct reply via AgentMail:', {
        to: originalMessage.from,
        subject: replySubject,
        threadId: originalMessage.threadId
      })

      // Send reply using AgentMail SDK
      const response = await this.client.inboxes.messages.send('orcha@agentmail.to', {
        to: [originalMessage.from],
        subject: replySubject,
        text: replyContent,
        html: replyContent.replace(/\n/g, '<br>'),
        threadId: originalMessage.threadId,
        labels: ['auto-reply', 'claude-generated', 'direct-polling']
      })

      console.log('✅ Direct reply sent successfully:', response.id)
      return true

    } catch (error) {
      console.error('❌ Failed to send direct reply:', error)
      return false
    }
  }
}

// CLI interface
async function main() {
  const pollingSystem = new EmailPollingSystem()
  
  const args = process.argv.slice(2)
  const command = args[0]

  switch (command) {
    case 'start':
      const interval = parseInt(args[1]) || 5
      await pollingSystem.startPolling(interval)
      
      // Keep the process running
      process.on('SIGINT', () => {
        console.log('\n🛑 Received SIGINT, stopping polling system...')
        pollingSystem.stopPolling()
        process.exit(0)
      })
      break

    case 'once':
      await pollingSystem.runOnce()
      break

    case 'stats':
      console.log(`📊 Processed emails: ${pollingSystem.processedEmails.size}`)
      break

    case 'clear':
      pollingSystem.processedEmails.clear()
      pollingSystem.saveProcessedEmails()
      console.log('🗑️ Cleared processed emails history')
      break

    default:
      console.log(`
📧 Email Polling System

Usage:
  node email-polling-system.js start [interval_seconds]  - Start continuous polling
  node email-polling-system.js once                      - Run once
  node email-polling-system.js stats                     - Show statistics
  node email-polling-system.js clear                     - Clear processed history

Examples:
  node email-polling-system.js start 5                   - Check every 5 seconds
  node email-polling-system.js once                      - Check once now
  node email-polling-system.js stats                     - Show how many emails processed
`)
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error)
}

module.exports = EmailPollingSystem
