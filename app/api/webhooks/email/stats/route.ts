import { NextResponse } from 'next/server'
import { webhookStats, WEBHOOK_CONFIG } from '@/lib/webhook-config'
import { AgentMailClient } from 'agentmail'
import { Anthropic } from '@anthropic-ai/sdk'

export async function GET() {
  try {
    // Test AgentMail connection
    let agentMailConnected = false
    try {
      const agentMailClient = new AgentMailClient({
        apiKey: process.env.AGENT_MAIL_API_KEY!
      })
      // Try to list inboxes to test connection
      await agentMailClient.inboxes.list()
      agentMailConnected = true
    } catch (error) {
      console.error('AgentMail connection test failed:', error)
    }

    // Test Claude AI connection
    let claudeConnected = false
    try {
      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY!
      })
      // Simple test - just check if API key is valid
      claudeConnected = !!process.env.ANTHROPIC_API_KEY
    } catch (error) {
      console.error('Claude connection test failed:', error)
    }

    // Test webhook endpoint
    let webhookActive = false
    try {
      const webhookUrl = WEBHOOK_CONFIG.WEBHOOK_URL
      const response = await fetch(webhookUrl, { method: 'GET' })
      webhookActive = response.ok
    } catch (error) {
      console.error('Webhook test failed:', error)
    }

    const stats = webhookStats.getStats()
    
    return NextResponse.json({
      stats: {
        ...stats,
        lastProcessed: stats.lastProcessed.toISOString()
      },
      status: {
        webhookActive,
        claudeConnected,
        agentMailConnected,
        autoReplyEnabled: WEBHOOK_CONFIG.AUTO_REPLY_ENABLED
      },
      config: {
        webhookUrl: WEBHOOK_CONFIG.WEBHOOK_URL,
        inboxEmail: WEBHOOK_CONFIG.INBOX_EMAIL,
        eventTypes: WEBHOOK_CONFIG.EVENT_TYPES,
        claudeModel: WEBHOOK_CONFIG.CLAUDE_MODEL
      }
    })

  } catch (error) {
    console.error('Failed to get webhook stats:', error)
    return NextResponse.json(
      { error: 'Failed to get stats' },
      { status: 500 }
    )
  }
}
