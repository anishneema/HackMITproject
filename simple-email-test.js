#!/usr/bin/env node

/**
 * Simple Email Test - Test sending emails through the webhook system
 */

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' })

async function testEmailSending() {
  console.log('🧪 Testing Email Sending via Webhook...')
  
  // Test with a real email address (replace with your email for testing)
  const testEmail = 'your-email@example.com' // Change this to your actual email
  
  const testPayload = {
    id: "email-test",
    type: "message.received",
    data: {
      id: "msg-email-test",
      from: testEmail,
      to: ["orcha@agentmail.to"], // Your actual inbox
      subject: "Test email - please reply",
      text: "Hello! This is a test email to see if the autonomous reply system works. Please send me information about the blood drive event.",
      thread_id: "thread-email-test",
      created_at: new Date().toISOString()
    }
  }

  try {
    console.log('📤 Sending test webhook...')
    console.log('From:', testPayload.data.from)
    console.log('Subject:', testPayload.data.subject)
    
    const response = await fetch('http://localhost:3000/api/webhooks/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-agentmail-signature': 'test-signature'
      },
      body: JSON.stringify(testPayload)
    })

    const result = await response.json()
    
    console.log('\n📊 Webhook Response:')
    console.log('Status:', response.status)
    console.log('Result:', JSON.stringify(result, null, 2))
    
    if (result.success && result.message === 'Reply sent automatically') {
      console.log('\n✅ SUCCESS! Email reply should have been sent!')
      console.log('📧 Check your email inbox for the automated reply')
      console.log('🎯 Reply type:', result.replyType)
      console.log('🎯 Confidence:', result.confidence)
    } else if (result.success && result.message === 'No reply needed') {
      console.log('\n⚠️  System decided no reply was needed')
      console.log('💡 Try with a different email content')
    } else {
      console.log('\n❌ Something went wrong:', result.message)
    }

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

async function testWithDifferentContent() {
  console.log('\n🔄 Testing with different email content...')
  
  const testPayload = {
    id: "email-test-2",
    type: "message.received",
    data: {
      id: "msg-email-test-2",
      from: "test@example.com",
      to: ["orcha@agentmail.to"],
      subject: "I want to donate blood - help me schedule",
      text: "Hi! I'm very interested in donating blood at your upcoming event. Can you please tell me more about the requirements and how I can schedule an appointment?",
      thread_id: "thread-email-test-2",
      created_at: new Date().toISOString()
    }
  }

  try {
    const response = await fetch('http://localhost:3000/api/webhooks/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-agentmail-signature': 'test-signature'
      },
      body: JSON.stringify(testPayload)
    })

    const result = await response.json()
    
    console.log('📊 Response:', JSON.stringify(result, null, 2))
    
    if (result.success && result.message === 'Reply sent automatically') {
      console.log('✅ This one should have triggered a reply!')
    }

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

async function runTests() {
  console.log('🚀 Starting Simple Email Tests')
  console.log('=' .repeat(50))
  
  console.log('\n📋 Instructions:')
  console.log('1. Change the testEmail variable to your actual email address')
  console.log('2. Make sure your dev server is running (npm run dev)')
  console.log('3. Check your email inbox after running the test')
  console.log('4. Also check your dev server terminal for detailed logs')
  
  await testEmailSending()
  await testWithDifferentContent()
  
  console.log('\n' + '=' .repeat(50))
  console.log('🎯 Next Steps:')
  console.log('1. Check your dev server terminal for detailed logs')
  console.log('2. Look for messages like "📤 Sending reply via AgentMail"')
  console.log('3. Check if there are any error messages')
  console.log('4. If emails are being sent, check your AgentMail dashboard')
}

// Run if executed directly
if (require.main === module) {
  runTests().catch(console.error)
}
