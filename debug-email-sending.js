#!/usr/bin/env node

/**
 * Debug Email Sending - Test AgentMail email sending locally
 */

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' })

const { AgentMailClient } = require('agentmail')

async function testAgentMailSending() {
  console.log('🧪 Testing AgentMail Email Sending...')
  
  try {
    // Initialize AgentMail client
    const client = new AgentMailClient({
      apiKey: process.env.AGENT_MAIL_API_KEY
    })

    console.log('✅ AgentMail client initialized')

    // Test listing inboxes first
    console.log('\n📬 Listing inboxes...')
    const inboxes = await client.inboxes.list()
    console.log('Inboxes:', inboxes.data.map(inbox => ({ id: inbox.id, email: inbox.email })))

    // Test sending an email
    console.log('\n📤 Testing email sending...')
    const inboxEmail = process.env.AGENT_MAIL_INBOX || 'hackmit@agentmail.to'
    
    const emailData = {
      to: ['test@example.com'], // This won't actually send to a real email
      subject: 'Test Email from Autonomous System',
      text: 'This is a test email from your autonomous email system.',
      html: '<p>This is a test email from your autonomous email system.</p>',
      labels: ['test', 'debug']
    }

    console.log('Sending email with data:', {
      to: emailData.to,
      subject: emailData.subject,
      inbox: inboxEmail
    })

    const result = await client.inboxes.messages.send(inboxEmail, emailData)
    
    console.log('✅ Email sent successfully!')
    console.log('Result:', {
      id: result.id,
      status: result.status || 'sent'
    })

    return result

  } catch (error) {
    console.error('❌ Error testing AgentMail:', error)
    
    if (error.response) {
      console.error('Response status:', error.response.status)
      console.error('Response data:', error.response.data)
    }
    
    return null
  }
}

async function testWebhookWithLogging() {
  console.log('\n🔍 Testing webhook with detailed logging...')
  
  const testPayload = {
    id: "debug-test",
    type: "message.received",
    data: {
      id: "msg-debug",
      from: "debug@example.com",
      to: ["hackmit@agentmail.to"],
      subject: "Debug test email",
      text: "This is a debug test to see what happens when we process an email.",
      thread_id: "thread-debug",
      created_at: new Date().toISOString()
    }
  }

  try {
    const response = await fetch('http://localhost:3000/api/webhooks/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-agentmail-signature': 'debug-signature'
      },
      body: JSON.stringify(testPayload)
    })

    const result = await response.json()
    
    console.log('Webhook response status:', response.status)
    console.log('Webhook response:', result)
    
    return result

  } catch (error) {
    console.error('❌ Webhook test failed:', error)
    return null
  }
}

async function runDebugTests() {
  console.log('🚀 Starting Debug Tests for Email Sending')
  console.log('=' .repeat(60))
  
  // Check environment variables
  console.log('\n🔧 Environment Check:')
  console.log('AGENT_MAIL_API_KEY:', process.env.AGENT_MAIL_API_KEY ? '✅ Set' : '❌ Missing')
  console.log('AGENT_MAIL_INBOX:', process.env.AGENT_MAIL_INBOX || 'hackmit@agentmail.to')
  console.log('ANTHROPIC_API_KEY:', process.env.ANTHROPIC_API_KEY ? '✅ Set' : '❌ Missing')
  
  if (!process.env.AGENT_MAIL_API_KEY) {
    console.log('\n❌ AGENT_MAIL_API_KEY not found in environment variables')
    console.log('Please set it in your .env.local file')
    return
  }

  // Test AgentMail directly
  await testAgentMailSending()
  
  // Test webhook processing
  await testWebhookWithLogging()
  
  console.log('\n' + '=' .repeat(60))
  console.log('🎯 Debug Summary:')
  console.log('- If AgentMail sending worked, emails should be sent')
  console.log('- If webhook processing worked, check your dev server logs')
  console.log('- Look for detailed logs in your terminal running npm run dev')
}

// Run if executed directly
if (require.main === module) {
  runDebugTests().catch(console.error)
}

module.exports = { testAgentMailSending, testWebhookWithLogging }
