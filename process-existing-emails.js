#!/usr/bin/env node

/**
 * Process Existing Emails - Manually process emails from AgentMail and send automated replies
 */

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' })

const { AgentMailClient } = require('agentmail')

async function processExistingEmails() {
  console.log('🚀 Processing Existing Emails from AgentMail...')
  
  try {
    const client = new AgentMailClient({
      apiKey: process.env.AGENT_MAIL_API_KEY
    })

    console.log('✅ AgentMail client initialized')

    // Get recent messages from orcha@agentmail.to
    console.log('\n📬 Fetching recent messages from orcha@agentmail.to...')
    
    const messages = await client.inboxes.messages.list('orcha@agentmail.to', {
      limit: 20
    })

    console.log(`Found ${messages.count} total messages`)

    // Filter for messages from external senders (not from AgentMail itself)
    const externalMessages = messages.messages.filter(msg => 
      !msg.from.includes('agentmail.to') && 
      !msg.from.includes('amazonses.com') &&
      msg.from.includes('anishneema0@gmail.com') // Focus on your emails for testing
    )

    console.log(`\n📧 Found ${externalMessages.length} external messages to process`)

    // Process each external message
    for (const [index, message] of externalMessages.entries()) {
      console.log(`\n${index + 1}. Processing message from ${message.from}`)
      console.log(`   Subject: ${message.subject}`)
      console.log(`   Thread ID: ${message.threadId}`)
      console.log(`   Message ID: ${message.messageId}`)

      // Get full message content
      try {
        const fullMessage = await client.inboxes.messages.get('orcha@agentmail.to', message.messageId)
        
        console.log(`   Content preview: ${fullMessage.text?.substring(0, 100)}...`)

        // Create webhook payload to process this message
        const webhookPayload = {
          id: `process-existing-${Date.now()}-${index}`,
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

        // Send to our webhook for processing
        console.log('   🤖 Sending to webhook for processing...')
        
        const response = await fetch('https://hackmitproject.vercel.app/api/webhooks/email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(webhookPayload)
        })

        const result = await response.json()
        
        if (response.ok && result.success) {
          console.log(`   ✅ Processed successfully: ${result.message}`)
          if (result.replyType) {
            console.log(`   📤 Reply type: ${result.replyType} (confidence: ${result.confidence})`)
          }
        } else {
          console.log(`   ❌ Processing failed: ${result.message || result.error}`)
        }

        // Add delay between processing
        await new Promise(resolve => setTimeout(resolve, 2000))

      } catch (error) {
        console.log(`   ❌ Error processing message: ${error.message}`)
      }
    }

    console.log('\n' + '=' .repeat(60))
    console.log('🎯 Processing Complete!')
    console.log('📧 Check your Gmail inbox for automated replies')
    console.log('📊 Check webhook stats: curl -s https://hackmitproject.vercel.app/api/webhooks/email/stats')

  } catch (error) {
    console.error('❌ Error processing existing emails:', error)
  }
}

async function testWithNewEmail() {
  console.log('\n🧪 Testing with a new email simulation...')
  
  const testPayload = {
    id: "new-email-test",
    type: "message.received",
    data: {
      id: "msg-new-test",
      from: "anishneema0@gmail.com",
      to: ["orcha@agentmail.to"],
      subject: "I want to donate blood - please help me schedule",
      text: "Hi! I received your email about the blood drive. I'm very interested in participating. Can you please send me more details about the requirements and how I can schedule an appointment? I'm available this weekend.",
      thread_id: "thread-new-test",
      created_at: new Date().toISOString()
    }
  }

  try {
    const response = await fetch('https://hackmitproject.vercel.app/api/webhooks/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPayload)
    })

    const result = await response.json()
    
    console.log('📊 Test result:', JSON.stringify(result, null, 2))
    
    if (result.success && result.message === 'Reply sent automatically') {
      console.log('✅ New email test successful!')
      console.log('📧 Check your Gmail inbox for the automated reply')
    }

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

async function runEmailProcessing() {
  console.log('🚀 Starting Email Processing System')
  console.log('=' .repeat(60))
  
  await processExistingEmails()
  await testWithNewEmail()
  
  console.log('\n🎉 All processing complete!')
}

// Run if executed directly
if (require.main === module) {
  runEmailProcessing().catch(console.error)
}
