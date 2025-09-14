import { NextRequest, NextResponse } from 'next/server'
import { AgentMailClient } from 'agentmail'
import { Anthropic } from '@anthropic-ai/sdk'

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Testing webhook system components...')

    const results = {
      agentMail: false,
      claude: false,
      webhook: false,
      errors: [] as string[]
    }

    // Test AgentMail connection
    try {
      const agentMailClient = new AgentMailClient({
        apiKey: process.env.AGENT_MAIL_API_KEY!
      })
      
      // Try to list inboxes
      await agentMailClient.inboxes.list()
      results.agentMail = true
      console.log('✅ AgentMail connection successful')
    } catch (error) {
      results.errors.push(`AgentMail: ${error}`)
      console.error('❌ AgentMail test failed:', error)
    }

    // Test Claude AI connection
    try {
      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY!
      })
      
      // Test with a simple message
      const response = await anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hello' }]
      })
      
      results.claude = true
      console.log('✅ Claude AI connection successful')
    } catch (error) {
      results.errors.push(`Claude: ${error}`)
      console.error('❌ Claude test failed:', error)
    }

    // Test webhook endpoint
    try {
      const webhookUrl = process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}/api/webhooks/email`
        : 'http://localhost:3000/api/webhooks/email'
      
      const response = await fetch(webhookUrl, { 
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })
      
      results.webhook = response.ok
      console.log('✅ Webhook endpoint accessible')
    } catch (error) {
      results.errors.push(`Webhook: ${error}`)
      console.error('❌ Webhook test failed:', error)
    }

    const allTestsPassed = results.agentMail && results.claude && results.webhook

    return NextResponse.json({
      success: allTestsPassed,
      results,
      message: allTestsPassed 
        ? 'All webhook system tests passed! 🎉'
        : 'Some tests failed. Check the errors below.',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Webhook test error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Test failed with error: ' + error,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
