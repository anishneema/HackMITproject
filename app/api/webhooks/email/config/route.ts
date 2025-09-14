import { NextRequest, NextResponse } from 'next/server'
import { WEBHOOK_CONFIG } from '@/lib/webhook-config'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { autoReplyEnabled } = body

    if (typeof autoReplyEnabled !== 'boolean') {
      return NextResponse.json(
        { error: 'autoReplyEnabled must be a boolean' },
        { status: 400 }
      )
    }

    // Update configuration
    WEBHOOK_CONFIG.AUTO_REPLY_ENABLED = autoReplyEnabled

    console.log(`Auto-reply ${autoReplyEnabled ? 'enabled' : 'disabled'}`)

    return NextResponse.json({
      success: true,
      message: `Auto-reply ${autoReplyEnabled ? 'enabled' : 'disabled'}`,
      config: {
        autoReplyEnabled: WEBHOOK_CONFIG.AUTO_REPLY_ENABLED
      }
    })

  } catch (error) {
    console.error('Failed to update webhook config:', error)
    return NextResponse.json(
      { error: 'Failed to update configuration' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    config: {
      autoReplyEnabled: WEBHOOK_CONFIG.AUTO_REPLY_ENABLED,
      minConfidenceThreshold: WEBHOOK_CONFIG.MIN_CONFIDENCE_THRESHOLD,
      maxReplyLength: WEBHOOK_CONFIG.MAX_REPLY_LENGTH,
      maxRepliesPerHour: WEBHOOK_CONFIG.MAX_REPLIES_PER_HOUR,
      replyDelayMs: WEBHOOK_CONFIG.REPLY_DELAY_MS,
      claudeModel: WEBHOOK_CONFIG.CLAUDE_MODEL,
      claudeTemperature: WEBHOOK_CONFIG.CLAUDE_TEMPERATURE
    }
  })
}
