import { NextResponse } from 'next/server'
import { agentMailConversationService } from '@/lib/agentmail-conversation-service'

export async function POST() {
  try {
    console.log('🔧 Creating AgentMail inbox with specifications...')

    // Create the inbox with the specified parameters
    const created = await agentMailConversationService.createInbox()

    if (created) {
      return NextResponse.json({
        success: true,
        message: 'Inbox created successfully',
        inbox: {
          username: 'team',
          domain: 'hackmit.com',
          email: 'team@hackmit.com',
          displayName: 'Blood Drive Volunteer Request'
        }
      })
    } else {
      return NextResponse.json({
        success: false,
        error: 'Failed to create inbox',
        message: 'Check server logs for details'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('❌ Error creating inbox:', error)

    return NextResponse.json({
      success: false,
      error: 'Failed to create inbox',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'AgentMail inbox creation endpoint',
    usage: 'POST to create inbox with specifications: username=team, domain=hackmit.com, displayName=Blood Drive Volunteer Request',
    timestamp: new Date().toISOString()
  })
}