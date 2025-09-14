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
- information: Provide detailed event information and requirements
- scheduling: Help with appointment booking and next steps
- question_response: Answer specific questions about blood donation
- thank_you: Acknowledgment with event details included

CURRENT BLOOD DRIVE EVENT:
- Event: Community Center Blood Drive
- Date: September 20, 2025
- Time: 9:00 AM - 3:00 PM
- Location: Downtown Community Center, 123 Main Street
- Available spots: 38 out of 50 total
- Requirements: Must be 17+ years old, weigh at least 110 lbs, bring photo ID
- Preparation: Eat a good meal, drink plenty of water, bring a friend for support

RESPONSE GUIDELINES:
- Always provide helpful, specific information
- Include relevant event details when appropriate
- Be encouraging and supportive about blood donation
- Keep responses friendly but informative (3-4 sentences)
- Always end with next steps or how to get more info

IMPORTANT: You must respond with ONLY a valid JSON object. Do not include any other text, explanation, or commentary.

Return this exact JSON structure:
{
  "shouldReply": true,
  "replyType": "string",
  "replyContent": "string",
  "confidence": number
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
          confidence: decision.confidence || 0.8
        }

      } catch (parseError) {
        console.error('❌ Failed to parse Claude response:', parseError)
        
        // Fallback: always reply with thank you
        return {
          shouldReply: true,
          replyType: 'thank_you',
          replyContent: 'Thank you for contacting us! We appreciate your message and will get back to you soon.',
          confidence: 0.5
        }
      }

    } catch (error) {
      console.error('❌ Error processing with Claude:', error)
      
      // Fallback: always reply with thank you
      return {
        shouldReply: true,
        replyType: 'thank_you',
        replyContent: 'Thank you for contacting us! We appreciate your message and will get back to you soon.',
        confidence: 0.3
      }
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
