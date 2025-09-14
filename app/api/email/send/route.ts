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

    // Update or create event with email count
    if (result.success && result.sent > 0) {
      try {
        // First, try to find an existing event with this name
        const eventsResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/events`)
        const eventsData = await eventsResponse.json()

        let existingEvent = null
        if (eventsData.success && eventsData.events) {
          existingEvent = eventsData.events.find((event: any) => event.name === eventName)
        }

        if (existingEvent) {
          // Update existing event's email count
          const updatedEmailsSent = (existingEvent.emailsSent || 0) + result.sent
          const updateResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/events/${existingEvent.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              emailsSent: updatedEmailsSent,
              lastEmailSent: new Date().toISOString()
            })
          })

          if (updateResponse.ok) {
            console.log(`Updated event ${eventName} with ${result.sent} new emails (total: ${updatedEmailsSent})`)
          } else {
            console.warn('Failed to update event email count:', await updateResponse.text())
          }
        } else {
          // Create new event
          const newEvent = {
            name: eventName,
            date: new Date().toISOString().split('T')[0], // Today's date as default
            time: '10:00 AM',
            targetDonors: 50,
            currentRSVPs: 0,
            venue: 'Community Center',
            status: 'active',
            emailsSent: result.sent,
            emailsOpened: 0,
            emailsReplied: 0,
            lastEmailSent: new Date().toISOString()
          }

          const createResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/events`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(newEvent)
          })

          if (createResponse.ok) {
            console.log(`Created new event ${eventName} with ${result.sent} emails sent`)
          } else {
            console.warn('Failed to create event:', await createResponse.text())
          }
        }
      } catch (error) {
        console.error('Error updating event email count:', error)
      }
    }

    // Create activity log entry for the email sending
    try {
      const activityData = {
        action: isReply ? 'Email Reply Sent' : 'Email Campaign Sent',
        details: `Sent ${result.sent} emails to ${contacts.length} contacts for ${eventName}. Subject: "${subject}"`,
        timestamp: new Date().toISOString(),
        status: result.success ? 'completed' : 'failed',
        type: 'email',
        eventId: eventName // This could be improved to use actual event ID
      }

      // Post to activities API
      const activityResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/activities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(activityData)
      })

      if (activityResponse.ok) {
        console.log('Activity logged successfully')
      } else {
        console.warn('Failed to log activity:', await activityResponse.text())
      }
    } catch (error) {
      console.error('Error logging activity:', error)
    }

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
