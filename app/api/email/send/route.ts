import { NextRequest, NextResponse } from 'next/server'
import { agentMailEmailSender } from '@/lib/agentmail-email-sender'

export async function POST(request: NextRequest) {
  try {
    const { contacts, subject, body, eventName, isReply, originalThreadId, replyToEmail } = await request.json()

    // Get AgentMail configuration from environment
    const fromName = process.env.SMTP_FROM_NAME || 'Red Cross Events Team'
    const fromEmail = process.env.SMTP_FROM_EMAIL || 'hackmit@agentmail.to'

    if (!process.env.AGENT_MAIL_API_KEY) {
      return NextResponse.json(
        { 
          error: 'AgentMail API key not found',
          details: 'Please set AGENT_MAIL_API_KEY in your environment variables',
          instructions: 'Get your API key from your AgentMail dashboard'
        },
        { status: 500 }
      )
    }

    console.log(`Sending emails to ${contacts.length} contacts via AgentMail API`)

    // Test AgentMail connection first
    const connectionTest = await agentMailEmailSender.testConnection()
    if (!connectionTest) {
      return NextResponse.json(
        { 
          error: 'AgentMail connection failed',
          details: 'Could not connect to AgentMail API. Please check your API key.',
          apiKey: process.env.AGENT_MAIL_API_KEY.substring(0, 8) + '...'
        },
        { status: 500 }
      )
    }

    // Prepare email campaign
    const campaign = {
      contacts: contacts,
      template: {
        subject: isReply ? `Re: ${subject}` : subject,
        body: body
      },
      eventName: eventName || 'Blood Drive Event',
      fromEmail: fromEmail,
      fromName: fromName,
      isReply: isReply || false,
      originalThreadId: originalThreadId,
      replyToEmail: replyToEmail
    }

    // Send emails via AgentMail API
    const result = await agentMailEmailSender.sendEmailCampaign(campaign)

    console.log('Email campaign result:', result)

    return NextResponse.json({
      success: result.success,
      campaignId: result.campaignId,
      message: isReply ?
        `Reply sent successfully to ${contacts.length} recipients` :
        `Email campaign completed: ${result.sent} sent, ${result.failed} failed`,
      details: {
        sent: result.sent,
        failed: result.failed,
        errors: result.errors,
        fromEmail: fromEmail,
        fromName: fromName,
        isReply: isReply || false,
        originalThreadId: originalThreadId
      }
    })

  } catch (error) {
    console.error('Error sending emails via SMTP:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Email send endpoint',
    timestamp: new Date().toISOString(),
    agentMailConfigured: !!process.env.AGENT_MAIL_API_KEY,
    connectionStatus: await agentMailEmailSender.testConnection()
  })
}
