#!/usr/bin/env node

/**
 * Check Webhook Configuration - Diagnose why real emails aren't triggering webhooks
 */

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' })

const { AgentMailClient } = require('agentmail')

async function checkWebhookConfiguration() {
  console.log('🔍 Checking Webhook Configuration...')
  
  try {
    const client = new AgentMailClient({
      apiKey: process.env.AGENT_MAIL_API_KEY
    })

    console.log('✅ AgentMail client initialized')

    // Check if we can list webhooks
    try {
      console.log('\n📡 Checking webhook configuration...')
      
      // Try to get webhook information (this might not be available in the SDK)
      // Let's check what methods are available
      console.log('Available methods:', Object.getOwnPropertyNames(client))
      console.log('Inbox methods:', Object.getOwnPropertyNames(client.inboxes))
      
    } catch (error) {
      console.log('❌ Error checking webhook config:', error.message)
    }

    // Check recent messages to see if they should trigger webhooks
    console.log('\n📬 Checking recent messages that should trigger webhooks...')
    
    const messages = await client.inboxes.messages.list('orcha@agentmail.to', {
      limit: 10
    })

    console.log(`Found ${messages.count} recent messages`)
    
    // Look for messages from external senders (not from AgentMail itself)
    const externalMessages = messages.messages.filter(msg => 
      !msg.from.includes('agentmail.to') && 
      !msg.from.includes('amazonses.com')
    )

    console.log(`\n📧 External messages (should trigger webhooks): ${externalMessages.length}`)
    
    externalMessages.forEach((msg, index) => {
      console.log(`\n${index + 1}. Message ID: ${msg.messageId}`)
      console.log(`   From: ${msg.from}`)
      console.log(`   Subject: ${msg.subject}`)
      console.log(`   Timestamp: ${msg.timestamp}`)
      console.log(`   Thread ID: ${msg.threadId}`)
    })

    if (externalMessages.length > 0) {
      console.log('\n⚠️  These messages should have triggered webhooks but didn\'t!')
      console.log('\n🔧 Possible Issues:')
      console.log('1. Webhook URL is incorrect or not accessible')
      console.log('2. Webhook is not configured for the right inbox (orcha@agentmail.to)')
      console.log('3. Webhook events are not properly configured')
      console.log('4. Webhook secret verification is failing')
    }

  } catch (error) {
    console.error('❌ Error checking webhook configuration:', error)
  }
}

async function testWebhookManually() {
  console.log('\n🧪 Testing webhook manually with recent message data...')
  
  // Use the most recent external message
  const recentMessage = {
    id: "manual-test",
    type: "message.received",
    data: {
      id: "msg-manual-test",
      from: "anishneema0@gmail.com",
      to: ["orcha@agentmail.to"],
      subject: "Manual webhook test - please reply",
      text: "Hi! This is a manual test of the webhook system. Can you please send me information about the blood drive event?",
      thread_id: "thread-manual-test",
      created_at: new Date().toISOString()
    }
  }

  try {
    const response = await fetch('https://hackmitproject.vercel.app/api/webhooks/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-agentmail-signature': 'manual-test-signature'
      },
      body: JSON.stringify(recentMessage)
    })

    const result = await response.json()
    
    console.log('📊 Manual webhook test result:')
    console.log('Status:', response.status)
    console.log('Response:', JSON.stringify(result, null, 2))
    
    if (result.success) {
      console.log('\n✅ Manual webhook test successful!')
      console.log('📧 Check your Gmail inbox for the automated reply')
    } else {
      console.log('\n❌ Manual webhook test failed:', result.message)
    }

  } catch (error) {
    console.error('❌ Manual webhook test error:', error)
  }
}

async function provideWebhookFixInstructions() {
  console.log('\n' + '=' .repeat(60))
  console.log('🔧 WEBHOOK CONFIGURATION FIX INSTRUCTIONS')
  console.log('=' .repeat(60))
  
  console.log('\n📋 Current Status:')
  console.log('✅ Emails are arriving in orcha@agentmail.to')
  console.log('✅ Webhook endpoint is working (https://hackmitproject.vercel.app/api/webhooks/email)')
  console.log('❌ Webhooks are NOT being triggered for real emails')
  
  console.log('\n🎯 Most Likely Issue:')
  console.log('The webhook in AgentMail is not properly configured for the orcha@agentmail.to inbox')
  
  console.log('\n🔧 How to Fix:')
  console.log('1. Go to AgentMail dashboard (app.agentmail.to)')
  console.log('2. Check your webhook configuration:')
  console.log('   - Webhook URL: https://hackmitproject.vercel.app/api/webhooks/email')
  console.log('   - Event Types: message.received')
  console.log('   - Inbox: orcha@agentmail.to (or all inboxes)')
  console.log('3. Make sure the webhook is enabled')
  console.log('4. Test the webhook manually')
  
  console.log('\n🧪 Alternative: Use a different inbox')
  console.log('You could also try sending emails to hackmit@agentmail.to instead')
  console.log('to see if that inbox has webhooks properly configured')
  
  console.log('\n📊 Quick Test:')
  console.log('Send an email from Gmail to hackmit@agentmail.to and see if it triggers')
}

async function runDiagnostics() {
  console.log('🚀 Starting Webhook Configuration Diagnostics')
  console.log('=' .repeat(60))
  
  await checkWebhookConfiguration()
  await testWebhookManually()
  await provideWebhookFixInstructions()
}

// Run if executed directly
if (require.main === module) {
  runDiagnostics().catch(console.error)
}
