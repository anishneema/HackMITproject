#!/usr/bin/env node

/**
 * Direct AgentMail Test - Test sending emails directly through AgentMail API
 */

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' })

const { AgentMailClient } = require('agentmail')

async function testDirectAgentMail() {
  console.log('🧪 Testing AgentMail Direct Email Sending...')
  
  try {
    const client = new AgentMailClient({
      apiKey: process.env.AGENT_MAIL_API_KEY
    })

    console.log('✅ AgentMail client initialized')
    console.log('📧 Inbox:', process.env.AGENT_MAIL_INBOX)

    // Test 1: List inboxes to see what's available
    console.log('\n📬 Listing inboxes...')
    try {
      const inboxes = await client.inboxes.list()
      console.log('Available inboxes:', inboxes)
    } catch (error) {
      console.log('❌ Error listing inboxes:', error.message)
    }

    // Test 2: Try to send a simple email
    console.log('\n📤 Testing email send...')
    
    const inboxEmail = process.env.AGENT_MAIL_INBOX || 'orcha@agentmail.to'
    
    try {
      const result = await client.inboxes.messages.send(inboxEmail, {
        to: ['test@example.com'],
        subject: 'Test from Autonomous System',
        text: 'This is a test email from the autonomous system.',
        html: '<p>This is a test email from the autonomous system.</p>'
      })
      
      console.log('✅ Email sent successfully!')
      console.log('Result:', result)
      
    } catch (sendError) {
      console.log('❌ Error sending email:', sendError.message)
      
      if (sendError.response) {
        console.log('Response status:', sendError.response.status)
        console.log('Response data:', sendError.response.data)
      }
    }

    // Test 3: Check if we can receive messages
    console.log('\n📥 Testing message retrieval...')
    try {
      const messages = await client.inboxes.messages.list(inboxEmail, {
        limit: 5
      })
      console.log('Recent messages:', messages)
    } catch (error) {
      console.log('❌ Error retrieving messages:', error.message)
    }

  } catch (error) {
    console.error('❌ AgentMail test failed:', error)
  }
}

async function testWithCorrectInbox() {
  console.log('\n🔄 Testing with different inbox configurations...')
  
  const client = new AgentMailClient({
    apiKey: process.env.AGENT_MAIL_API_KEY
  })

  // Try different inbox formats
  const inboxVariations = [
    'orcha@agentmail.to',
    'hackmit@agentmail.to',
    process.env.AGENT_MAIL_INBOX
  ]

  for (const inbox of inboxVariations) {
    if (!inbox) continue
    
    console.log(`\n📧 Testing inbox: ${inbox}`)
    
    try {
      const result = await client.inboxes.messages.send(inbox, {
        to: ['test@example.com'],
        subject: `Test from ${inbox}`,
        text: `Test email sent to ${inbox}`
      })
      
      console.log(`✅ Success with ${inbox}:`, result.id)
      
    } catch (error) {
      console.log(`❌ Failed with ${inbox}:`, error.message)
    }
  }
}

async function runDirectTests() {
  console.log('🚀 Starting Direct AgentMail Tests')
  console.log('=' .repeat(60))
  
  console.log('Environment:')
  console.log('AGENT_MAIL_API_KEY:', process.env.AGENT_MAIL_API_KEY ? '✅ Set' : '❌ Missing')
  console.log('AGENT_MAIL_INBOX:', process.env.AGENT_MAIL_INBOX || 'Not set')
  
  await testDirectAgentMail()
  await testWithCorrectInbox()
  
  console.log('\n' + '=' .repeat(60))
  console.log('🎯 If all tests failed, check:')
  console.log('1. AgentMail API key is valid and has credits')
  console.log('2. Inbox email address is correct')
  console.log('3. AgentMail service is working')
}

// Run if executed directly
if (require.main === module) {
  runDirectTests().catch(console.error)
}
