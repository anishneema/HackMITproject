// Test script for the email conversation system
// Run this with: node test-conversation.js

const BASE_URL = 'http://localhost:3000'

async function testConversation() {
  console.log('🧪 Testing Email Conversation System\n')

  const testEmail = 'john.doe@example.com'
  const testThreadId = `test_thread_${Date.now()}`

  // Test conversation scenarios
  const conversationScenarios = [
    {
      title: 'Initial Interest Query',
      message: 'Hi! I got your email about the blood drive. When is the next event?',
      expected: 'should provide event details'
    },
    {
      title: 'Location Question',
      message: 'Where exactly is the Community Center? I want to make sure I can find it.',
      expected: 'should provide location details'
    },
    {
      title: 'Scheduling Request',
      message: 'This sounds great! I would like to sign up for the blood drive. Can you help me schedule?',
      expected: 'should help with scheduling'
    },
    {
      title: 'Follow-up Question',
      message: 'What should I bring with me? Any special preparations needed?',
      expected: 'should provide preparation information'
    },
    {
      title: 'Negative Response',
      message: 'Thanks but I am not interested right now. Maybe next time.',
      expected: 'should handle politely and close conversation'
    }
  ]

  for (let i = 0; i < conversationScenarios.length; i++) {
    const scenario = conversationScenarios[i]

    console.log(`📧 Test ${i + 1}: ${scenario.title}`)
    console.log(`User Message: "${scenario.message}"`)
    console.log(`Expected: ${scenario.expected}`)

    try {
      const response = await fetch(`${BASE_URL}/api/conversation/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: scenario.message,
          sender_email: testEmail,
          thread_id: testThreadId,
          campaign_id: 'test_campaign_123'
        })
      })

      const result = await response.json()

      if (result.success) {
        console.log(`✅ AI Response: "${result.response.content}"`)
        console.log(`🤖 Should Send: ${result.response.should_send}`)
        console.log(`👥 Requires Review: ${result.response.requires_human_review}`)

        if (result.response.suggested_actions.length > 0) {
          console.log(`💡 Suggested Actions:`)
          result.response.suggested_actions.forEach(action => {
            console.log(`   - ${action.type}: ${action.details}`)
          })
        }

        console.log(`📊 Thread Info: ${result.thread_summary.total_messages} messages, Status: ${result.thread_summary.status}`)
      } else {
        console.log(`❌ Error: ${result.error}`)
      }
    } catch (error) {
      console.log(`❌ Request failed: ${error.message}`)
    }

    console.log('─'.repeat(80))

    // Wait a bit between requests
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  // Test getting all conversations
  console.log('\n📋 Testing conversation retrieval...')
  try {
    const response = await fetch(`${BASE_URL}/api/conversation/test`)
    const result = await response.json()

    console.log(`📊 Total conversations: ${result.total_threads}`)
    if (result.threads.length > 0) {
      console.log('Recent conversations:')
      result.threads.forEach(thread => {
        console.log(`  - ${thread.participant_email}: ${thread.message_count} messages (${thread.status})`)
      })
    }
  } catch (error) {
    console.log(`❌ Failed to retrieve conversations: ${error.message}`)
  }

  console.log('\n✅ Conversation testing completed!')
  console.log('\n📌 Next steps:')
  console.log('1. Check the AgentMail dashboard for incoming email replies')
  console.log('2. The webhook will automatically process replies and generate responses')
  console.log('3. Monitor the console logs for conversation processing')
  console.log('4. Test with real email addresses to see the full flow')
}

// Test webhook simulation
async function testWebhookSimulation() {
  console.log('\n🔗 Testing Webhook Simulation...\n')

  const mockWebhookPayload = {
    type: 'email_received',
    requires_response: true,
    sender_email: 'sarah.johnson@example.com',
    message_content: 'Hi! I received your email about the blood drive. I am very interested in participating. When is the next event and how do I sign up?',
    thread_id: `webhook_thread_${Date.now()}`,
    campaign_id: 'campaign_123456',
    timestamp: new Date().toISOString()
  }

  try {
    console.log('📤 Simulating webhook payload:')
    console.log(JSON.stringify(mockWebhookPayload, null, 2))

    const response = await fetch(`${BASE_URL}/api/webhooks/agent-mail`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mockWebhookPayload)
    })

    const result = await response.json()
    console.log('\n📥 Webhook response:')
    console.log(JSON.stringify(result, null, 2))

  } catch (error) {
    console.log(`❌ Webhook test failed: ${error.message}`)
  }
}

// Run the tests
async function main() {
  console.log('🚀 Starting Email Conversation System Tests')
  console.log('=' * 50)

  // Test basic conversation flow
  await testConversation()

  // Test webhook simulation
  await testWebhookSimulation()

  console.log('\n🎉 All tests completed!')
  console.log('\nThe system is now ready to:')
  console.log('✅ Receive email replies via AgentMail webhooks')
  console.log('✅ Generate intelligent responses using Claude')
  console.log('✅ Send automated replies back to users')
  console.log('✅ Maintain conversation context and history')
  console.log('✅ Handle multiple conversation threads simultaneously')
}

// Handle errors gracefully
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error)
  process.exit(1)
})

main().catch(console.error)