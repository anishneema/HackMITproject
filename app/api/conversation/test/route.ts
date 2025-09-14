import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { message, sender_email, thread_id, campaign_id } = await request.json()

    if (!message || !sender_email) {
      return NextResponse.json(
        { error: 'Message and sender_email are required' },
        { status: 400 }
      )
    }

    const threadIdToUse = thread_id || `test_thread_${sender_email.replace('@', '_at_')}_${Date.now()}`

    console.log('Testing conversation with:', {
      message,
      sender_email,
      thread_id: threadIdToUse,
      campaign_id
    })

    // Generate response using direct API call (server-side)
    const response = await generateConversationResponse({
      message,
      senderEmail: sender_email,
      threadId: threadIdToUse,
      campaignId: campaign_id
    })

    // Mock thread summary for testing
    const thread = {
      thread_id: threadIdToUse,
      participant_email: sender_email,
      messages: [{ content: message }, { content: response.content }],
      last_message_at: new Date(),
      status: 'active'
    }

    return NextResponse.json({
      success: true,
      response,
      thread_summary: {
        thread_id: threadIdToUse,
        participant_email: sender_email,
        total_messages: thread?.messages.length || 0,
        last_message_at: thread?.last_message_at,
        status: thread?.status
      },
      message: 'Conversation processed successfully'
    })

  } catch (error) {
    console.error('Conversation test error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process conversation',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const threadId = url.searchParams.get('thread_id')

    if (threadId) {
      // Get specific conversation thread
      const thread = conversationManager.getConversationThread(threadId)
      if (!thread) {
        return NextResponse.json(
          { error: 'Thread not found' },
          { status: 404 }
        )
      }

      return NextResponse.json({
        thread,
        message: 'Thread retrieved successfully'
      })
    } else {
      // Return mock conversations for testing
      const mockThreads = [{
        thread_id: 'test_thread_123',
        participant_email: 'test@example.com',
        campaign_id: 'campaign_123',
        message_count: 2,
        last_message_at: new Date(),
        status: 'active',
        context: { participant_name: 'Test User' }
      }]

      return NextResponse.json({
        threads: mockThreads,
        total_threads: mockThreads.length,
        message: 'Mock conversation threads retrieved'
      })
    }

  } catch (error) {
    console.error('Failed to retrieve conversations:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve conversations' },
      { status: 500 }
    )
  }
}

// Server-side conversation response generation
async function generateConversationResponse({ message, senderEmail, threadId, campaignId }) {
  try {
    const response = await fetch(`http://localhost:3001/api/conversation/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        senderEmail,
        conversationHistory: [], // Start with empty history for test
        dashboardContext: getTestDashboardContext(),
        threadContext: {
          campaign_id: campaignId,
          participant_email: senderEmail,
          context: { participant_name: extractNameFromEmail(senderEmail) }
        }
      })
    })

    if (!response.ok) {
      throw new Error('Failed to generate conversation response')
    }

    return await response.json()
  } catch (error) {
    console.error('Failed to generate response:', error)
    return {
      content: 'Thank you for your email. We will get back to you soon!',
      should_send: true,
      requires_human_review: false,
      suggested_actions: []
    }
  }
}

function getTestDashboardContext() {
  return {
    events: [{
      id: '1',
      name: "Community Center Blood Drive",
      date: "2025-09-20",
      time: "9:00 AM - 3:00 PM",
      targetDonors: 50,
      currentRSVPs: 12,
      venue: "Downtown Community Center",
      status: 'active'
    }],
    analytics: {
      totalEvents: 2,
      activeEvents: 2,
      totalEmailsSent: 45,
      averageResponseRate: 72.5,
      totalBookings: 18
    }
  }
}

function extractNameFromEmail(email) {
  const localPart = email.split('@')[0]
  return localPart.split('.').map(part =>
    part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
  ).join(' ')
}