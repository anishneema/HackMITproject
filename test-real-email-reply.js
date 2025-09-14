#!/usr/bin/env node

/**
 * Test Real Email Reply - Send test email to real email address
 */

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' })

async function testRealEmailReply() {
  console.log('🧪 Testing Real Email Reply System...')
  
  const testPayload = {
    id: "real-email-test",
    type: "message.received",
    data: {
      id: "msg-real-test",
      from: "anishneema0@gmail.com", // Your real email address
      to: ["orcha@agentmail.to"],
      subject: "I want to donate blood - please help me schedule",
      text: "Hi! I'm very interested in donating blood at your upcoming blood drive event. Can you please tell me more about the requirements and how I can schedule an appointment? I'm available this weekend.",
      thread_id: "thread-real-test",
      created_at: new Date().toISOString()
    }
  }

  try {
    console.log('📤 Sending webhook to process email from:', testPayload.data.from)
    console.log('📝 Subject:', testPayload.data.subject)
    console.log('💬 Content:', testPayload.data.text)
    
    const response = await fetch('http://localhost:3000/api/webhooks/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-agentmail-signature': 'real-test-signature'
      },
      body: JSON.stringify(testPayload)
    })

    const result = await response.json()
    
    console.log('\n📊 Webhook Response:')
    console.log('Status:', response.status)
    console.log('Result:', JSON.stringify(result, null, 2))
    
    if (result.success && result.message === 'Reply sent automatically') {
      console.log('\n🎉 SUCCESS! Email reply should have been sent!')
      console.log('📧 Check your Gmail inbox (anishneema0@gmail.com) for the automated reply')
      console.log('🎯 Reply type:', result.replyType)
      console.log('🎯 Confidence:', result.confidence)
      console.log('\n⏰ It may take a few minutes for the email to arrive')
    } else if (result.success && result.message === 'No reply needed') {
      console.log('\n⚠️  System decided no reply was needed')
      console.log('💡 The email content might not have triggered a response')
    } else {
      console.log('\n❌ Something went wrong:', result.message)
      console.log('🔍 Check your dev server terminal for detailed error logs')
    }

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

async function testWithDifferentEmailContent() {
  console.log('\n🔄 Testing with different email content...')
  
  const testPayload = {
    id: "real-email-test-2",
    type: "message.received",
    data: {
      id: "msg-real-test-2",
      from: "anishneema0@gmail.com",
      to: ["orcha@agentmail.to"],
      subject: "Blood donation requirements question",
      text: "Hello! I received your email about the blood drive. What are the requirements to donate blood? Do I need to bring anything with me? Also, what time slots are available on Saturday?",
      thread_id: "thread-real-test-2",
      created_at: new Date().toISOString()
    }
  }

  try {
    const response = await fetch('http://localhost:3000/api/webhooks/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-agentmail-signature': 'real-test-signature'
      },
      body: JSON.stringify(testPayload)
    })

    const result = await response.json()
    
    console.log('📊 Response:', JSON.stringify(result, null, 2))
    
    if (result.success && result.message === 'Reply sent automatically') {
      console.log('✅ This email should have triggered a reply!')
      console.log('📧 Check your Gmail inbox for the automated response')
    }

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

async function runRealEmailTests() {
  console.log('🚀 Starting Real Email Reply Tests')
  console.log('=' .repeat(60))
  
  console.log('📧 Target Email: anishneema0@gmail.com')
  console.log('📬 From Inbox: orcha@agentmail.to')
  console.log('🤖 AI System: Claude AI')
  
  await testRealEmailReply()
  
  // Wait a bit between tests
  console.log('\n⏳ Waiting 3 seconds before next test...')
  await new Promise(resolve => setTimeout(resolve, 3000))
  
  await testWithDifferentEmailContent()
  
  console.log('\n' + '=' .repeat(60))
  console.log('🎯 What to Check:')
  console.log('1. 📧 Check your Gmail inbox (anishneema0@gmail.com)')
  console.log('2. 📱 Check your dev server terminal for detailed logs')
  console.log('3. 🔍 Look for messages like "📤 Sending reply via AgentMail"')
  console.log('4. ⏰ Emails may take 1-2 minutes to arrive')
  
  console.log('\n📊 Check Stats:')
  console.log('curl http://localhost:3000/api/webhooks/email/stats')
}

// Run if executed directly
if (require.main === module) {
  runRealEmailTests().catch(console.error)
}