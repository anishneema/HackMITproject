#!/usr/bin/env node

/**
 * Local Testing Script for Autonomous Email System
 * This script simulates AgentMail webhook calls to test your system locally
 */

const testWebhookUrl = 'http://localhost:3000/api/webhooks/email'

// Test payloads simulating different types of emails
const testEmails = [
  {
    name: "Positive Interest",
    payload: {
      id: "test-1",
      type: "message.received",
      data: {
        id: "msg-test-1",
        from: "john.doe@example.com",
        to: ["hackmit@agentmail.to"],
        subject: "Interested in blood drive",
        text: "Hi! I'm interested in participating in your blood drive event. When is it scheduled?",
        html: "<p>Hi! I'm interested in participating in your blood drive event. When is it scheduled?</p>",
        thread_id: "thread-test-1",
        labels: ["inquiry"],
        created_at: new Date().toISOString()
      }
    }
  },
  {
    name: "Question about Requirements",
    payload: {
      id: "test-2",
      type: "message.received",
      data: {
        id: "msg-test-2",
        from: "jane.smith@example.com",
        to: ["hackmit@agentmail.to"],
        subject: "Blood donation requirements",
        text: "What are the requirements to donate blood? Do I need to bring anything?",
        html: "<p>What are the requirements to donate blood? Do I need to bring anything?</p>",
        thread_id: "thread-test-2",
        labels: ["question"],
        created_at: new Date().toISOString()
      }
    }
  },
  {
    name: "Scheduling Request",
    payload: {
      id: "test-3",
      type: "message.received",
      data: {
        id: "msg-test-3",
        from: "mike.wilson@example.com",
        to: ["hackmit@agentmail.to"],
        subject: "Book appointment",
        text: "I'd like to book an appointment for the blood drive. What times are available?",
        html: "<p>I'd like to book an appointment for the blood drive. What times are available?</p>",
        thread_id: "thread-test-3",
        labels: ["booking"],
        created_at: new Date().toISOString()
      }
    }
  },
  {
    name: "Negative Response",
    payload: {
      id: "test-4",
      type: "message.received",
      data: {
        id: "msg-test-4",
        from: "sarah.jones@example.com",
        to: ["hackmit@agentmail.to"],
        subject: "Can't participate",
        text: "Sorry, I won't be able to participate in the blood drive this time.",
        html: "<p>Sorry, I won't be able to participate in the blood drive this time.</p>",
        thread_id: "thread-test-4",
        labels: ["decline"],
        created_at: new Date().toISOString()
      }
    }
  },
  {
    name: "Spam/Unrelated",
    payload: {
      id: "test-5",
      type: "message.received",
      data: {
        id: "msg-test-5",
        from: "spam@example.com",
        to: ["hackmit@agentmail.to"],
        subject: "Buy cheap watches",
        text: "Buy cheap watches online! Limited time offer!",
        html: "<p>Buy cheap watches online! Limited time offer!</p>",
        thread_id: "thread-test-5",
        labels: ["spam"],
        created_at: new Date().toISOString()
      }
    }
  }
]

async function testWebhook(payload, testName) {
  try {
    console.log(`\n🧪 Testing: ${testName}`)
    console.log(`📧 Email from: ${payload.data.from}`)
    console.log(`📝 Subject: ${payload.data.subject}`)
    console.log(`💬 Content: ${payload.data.text}`)
    
    const response = await fetch(testWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-agentmail-signature': 'test-signature'
      },
      body: JSON.stringify(payload)
    })

    const result = await response.json()
    
    if (response.ok) {
      console.log(`✅ Status: ${response.status}`)
      console.log(`📊 Result:`, result)
    } else {
      console.log(`❌ Status: ${response.status}`)
      console.log(`🚨 Error:`, result)
    }

    return { success: response.ok, result }

  } catch (error) {
    console.log(`❌ Request failed:`, error.message)
    return { success: false, error: error.message }
  }
}

async function testSystemHealth() {
  try {
    console.log('\n🏥 Testing System Health...')
    
    const response = await fetch(testWebhookUrl, {
      method: 'GET'
    })
    
    const result = await response.json()
    console.log(`✅ Health Check:`, result)
    return true
  } catch (error) {
    console.log(`❌ Health Check Failed:`, error.message)
    return false
  }
}

async function testStats() {
  try {
    console.log('\n📊 Testing Stats Endpoint...')
    
    const response = await fetch('http://localhost:3000/api/webhooks/email/stats')
    const result = await response.json()
    
    console.log(`📈 Stats:`, JSON.stringify(result, null, 2))
    return true
  } catch (error) {
    console.log(`❌ Stats Test Failed:`, error.message)
    return false
  }
}

async function runAllTests() {
  console.log('🚀 Starting Autonomous Email System Tests')
  console.log('=' .repeat(50))
  
  // Test system health first
  const isHealthy = await testSystemHealth()
  if (!isHealthy) {
    console.log('\n❌ System health check failed. Make sure your dev server is running on port 3000')
    return
  }

  // Test stats endpoint
  await testStats()

  // Run all email tests
  const results = []
  for (const testEmail of testEmails) {
    const result = await testWebhook(testEmail.payload, testEmail.name)
    results.push({ ...testEmail, result })
    
    // Add delay between tests
    await new Promise(resolve => setTimeout(resolve, 2000))
  }

  // Summary
  console.log('\n' + '=' .repeat(50))
  console.log('📋 TEST SUMMARY')
  console.log('=' .repeat(50))
  
  const successful = results.filter(r => r.result.success).length
  const failed = results.filter(r => !r.result.success).length
  
  console.log(`✅ Successful: ${successful}`)
  console.log(`❌ Failed: ${failed}`)
  console.log(`📊 Total: ${results.length}`)
  
  if (failed > 0) {
    console.log('\n🚨 Failed Tests:')
    results.filter(r => !r.result.success).forEach(test => {
      console.log(`   - ${test.name}: ${test.result.error || 'Unknown error'}`)
    })
  }

  console.log('\n🎉 Testing complete!')
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests().catch(console.error)
}

module.exports = { testWebhook, testSystemHealth, testStats, runAllTests }
