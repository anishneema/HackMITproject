import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { email, response, eventName } = await request.json()

    if (!email || !response) {
      return NextResponse.json(
        { error: 'Email and response are required' },
        { status: 400 }
      )
    }

    // Simulate a webhook payload for testing
    const webhookPayload = {
      type: 'email_reply',
      sender_email: email,
      message_content: response,
      campaign_id: `test_campaign_${Date.now()}`,
      thread_id: `test_thread_${Date.now()}`,
      event_name: eventName || 'Test Blood Drive Event'
    }

    console.log('🧪 Testing volunteer reply with payload:', webhookPayload)

    // Send the webhook to our webhook handler
    const webhookResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/webhooks/agent-mail`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookPayload)
    })

    if (webhookResponse.ok) {
      const result = await webhookResponse.json()
      return NextResponse.json({
        success: true,
        message: 'Volunteer reply processed successfully',
        webhookResult: result,
        testPayload: webhookPayload
      })
    } else {
      const errorData = await webhookResponse.json()
      return NextResponse.json({
        success: false,
        error: 'Webhook processing failed',
        details: errorData
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Test volunteer reply error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Test failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Volunteer reply test endpoint',
    usage: 'POST with { email, response, eventName }',
    examples: [
      {
        email: 'john.doe@example.com',
        response: 'Yes, I would love to volunteer!',
        eventName: 'Community Blood Drive'
      },
      {
        email: 'jane.smith@example.com', 
        response: 'No, I cannot make it this time',
        eventName: 'Community Blood Drive'
      },
      {
        email: 'bob.wilson@example.com',
        response: 'What time does the event start?',
        eventName: 'Community Blood Drive'
      }
    ]
  })
}
