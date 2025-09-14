import { NextRequest, NextResponse } from 'next/server'
import { agentMailService } from '@/lib/agent-mail-service'
import { csvProcessor } from '@/lib/csv-processor'
import { aiDataManager } from '@/lib/ai-data-manager'
import { useDashboardStore } from '@/lib/dashboard-store'
import { conversationManager } from '@/lib/conversation-manager'

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()

    console.log('Agent Mail webhook received:', payload)

    // Handle incoming email that needs a response
    if (payload.type === 'email_received' && payload.requires_response) {
      try {
        console.log('Processing incoming email reply from:', payload.sender_email)
        console.log('Message content:', payload.message_content)

        // Use the conversation manager to generate intelligent response
        const conversationResponse = await conversationManager.generateResponse(
          payload.message_content,
          payload.sender_email,
          payload.thread_id,
          payload.campaign_id,
          agentMailService.getDashboardContext()
        )

        console.log('Generated conversation response:', {
          content: conversationResponse.content,
          shouldSend: conversationResponse.should_send,
          requiresReview: conversationResponse.requires_human_review,
          actions: conversationResponse.suggested_actions
        })

        // Send automated reply if appropriate
        if (conversationResponse.should_send && !conversationResponse.requires_human_review) {
          try {
            // Try to send via AgentMail first
            const replyResult = await agentMailService.replyToEmail(
              payload.thread_id,
              conversationResponse.content
            )

            if (replyResult.success) {
              console.log('✅ Automated reply sent successfully to:', payload.sender_email)
            } else {
              console.log('❌ Failed to send via AgentMail, attempting direct email send')

              // Fallback to direct email sending
              await sendDirectEmailReply(
                payload.sender_email,
                conversationResponse.content,
                payload.thread_id,
                payload.campaign_id
              )
            }
          } catch (sendError) {
            console.error('Failed to send automated reply:', sendError)
            console.log('Reply will require manual sending:', conversationResponse.content)
          }
        } else if (conversationResponse.requires_human_review) {
          console.log('⚠️ Response requires human review:', conversationResponse.content)
          // Store for human review in dashboard or notification system
        } else {
          console.log('🔄 Response generated but not sent automatically:', conversationResponse.content)
        }

        // Execute suggested actions
        for (const action of conversationResponse.suggested_actions) {
          console.log(`Suggested action: ${action.type} - ${action.details}`)
          await executeSuggestedAction(action, payload)
        }

      } catch (error) {
        console.error('Failed to process email conversation:', error)

        // Send simple fallback response
        try {
          await sendDirectEmailReply(
            payload.sender_email,
            'Thank you for your email. We will get back to you soon!',
            payload.thread_id,
            payload.campaign_id
          )
        } catch (fallbackError) {
          console.error('Failed to send fallback response:', fallbackError)
        }
      }
    }

    // Handle email replies from campaigns
    if (payload.type === 'email_reply' && payload.campaign_id) {
      try {
        // Determine sentiment (simple keyword analysis for demo)
        const message = payload.message_content.toLowerCase()
        let sentiment: 'positive' | 'negative' | 'neutral' | 'question' = 'neutral'

        if (message.includes('yes') || message.includes('interested') || message.includes('sign up') ||
            message.includes('count me in') || message.includes('participate') || message.includes('volunteer') ||
            message.includes('i\'ll be there') || message.includes('i will be there') || message.includes('count me in')) {
          sentiment = 'positive'
        } else if (message.includes('no') || message.includes('not interested') || message.includes('unsubscribe') ||
                   message.includes('remove') || message.includes('decline') || message.includes('can\'t make it') ||
                   message.includes('cannot make it') || message.includes('unable to attend')) {
          sentiment = 'negative'
        } else if (message.includes('?') || message.includes('when') || message.includes('where') ||
                   message.includes('how') || message.includes('what') || message.includes('time')) {
          sentiment = 'question'
        }

        console.log(`Processing volunteer response from ${payload.sender_email}: ${sentiment}`)

        // Handle positive responses (volunteer confirmed)
        if (sentiment === 'positive') {
          await handleVolunteerConfirmation(payload)
        }
        // Handle negative responses (volunteer declined)
        else if (sentiment === 'negative') {
          await handleVolunteerDecline(payload)
        }
        // Handle questions (send more info)
        else if (sentiment === 'question') {
          await handleVolunteerQuestion(payload)
        }

        // Record the response in CSV processor
        await csvProcessor.recordEmailResponse(
          payload.campaign_id,
          payload.sender_email,
          payload.message_content,
          sentiment
        )

        // Update contact data based on response
        const contactUpdates: any = {
          lastContact: new Date().toISOString().split('T')[0]
        }

        if (sentiment === 'positive') {
          contactUpdates.status = 'confirmed_volunteer'
        } else if (sentiment === 'negative') {
          contactUpdates.status = 'declined'
        } else if (sentiment === 'question') {
          contactUpdates.status = 'needs_followup'
        }

        await csvProcessor.updateContactData(payload.sender_email, contactUpdates)

        // Let AI analyze and take additional actions
        const aiActions = await aiDataManager.analyzeAndUpdateContact(
          payload.sender_email,
          payload.message_content,
          { campaign_id: payload.campaign_id, sentiment }
        )

        console.log(`Updated contact ${payload.sender_email} with sentiment: ${sentiment}`)
        console.log(`AI suggested ${aiActions.length} additional actions`)

      } catch (error) {
        console.error('Failed to process email reply:', error)
      }
    }

    // Handle email opens for analytics
    if (payload.type === 'email_opened' && payload.campaign_id) {
      // Update campaign stats
      const campaign = csvProcessor.getCampaign(payload.campaign_id)
      if (campaign) {
        campaign.openedCount++
        console.log(`Email opened by ${payload.recipient_email} for campaign ${payload.campaign_id}`)
      }
    }

    // Broadcast webhook to frontend for real-time updates
    if (typeof window !== 'undefined') {
      window.postMessage({
        type: 'agent-mail-webhook',
        ...payload
      }, window.location.origin)
    }

    return NextResponse.json({ success: true, message: 'Webhook processed' })

  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json(
      { success: false, error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

// Helper function to send direct email replies
async function sendDirectEmailReply(
  recipientEmail: string,
  content: string,
  threadId: string,
  campaignId?: string
) {
  try {
    // Use the existing email sender service
    const response = await fetch('/api/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contacts: [{
          email: recipientEmail,
          firstName: 'Valued',
          lastName: 'Donor'
        }],
        subject: 'Re: Blood Drive Event',
        body: content,
        eventName: 'Blood Drive Conversation',
        isReply: true,
        originalThreadId: threadId
      })
    })

    if (!response.ok) {
      throw new Error('Failed to send direct email reply')
    }

    console.log('✅ Direct email reply sent successfully')
    return true
  } catch (error) {
    console.error('Failed to send direct email reply:', error)
    return false
  }
}

// Helper function to execute suggested actions
async function executeSuggestedAction(
  action: { type: string; details: string },
  payload: any
) {
  try {
    switch (action.type) {
      case 'schedule_appointment':
        console.log('📅 Would schedule appointment for:', payload.sender_email)
        // Integration point for calendar scheduling
        break

      case 'send_info':
        console.log('📋 Would send additional information to:', payload.sender_email)
        // Integration point for sending brochures/info
        break

      case 'escalate':
        console.log('🚨 Escalating to human staff:', payload.sender_email)
        // Integration point for staff notifications
        break

      case 'close_conversation':
        console.log('✅ Closing conversation with:', payload.sender_email)
        conversationManager.markThreadAsCompleted(payload.thread_id)
        break

      default:
        console.log('Unknown action type:', action.type)
    }
  } catch (error) {
    console.error('Failed to execute suggested action:', error)
  }
}

// Helper function to handle volunteer confirmation
async function handleVolunteerConfirmation(payload: any) {
  try {
    console.log(`🎉 Volunteer confirmed: ${payload.sender_email}`)
    
    // Extract volunteer name from email or use email as fallback
    const emailParts = payload.sender_email.split('@')[0]
    const volunteerName = emailParts.replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    
    // Try to get event details from the campaign
    let eventDetails = {
      date: new Date().toISOString().split('T')[0], // Today's date as default
      time: '10:00 AM',
      event: 'Blood Drive Event',
      eventId: payload.campaign_id
    }

    // Try to fetch event details from the events API
    try {
      const eventsResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/events`)
      if (eventsResponse.ok) {
        const eventsData = await eventsResponse.json()
        if (eventsData.success && eventsData.events && eventsData.events.length > 0) {
          // Find the most recent active event
          const activeEvent = eventsData.events.find((event: any) => event.status === 'active')
          if (activeEvent) {
            eventDetails = {
              date: activeEvent.date,
              time: activeEvent.time,
              event: activeEvent.name,
              eventId: activeEvent.id
            }
            console.log(`Found event details: ${activeEvent.name} on ${activeEvent.date}`)
          }
        }
      }
    } catch (error) {
      console.log('Could not fetch event details, using defaults')
    }
    
    // Create volunteer record
    const volunteerData = {
      name: volunteerName,
      email: payload.sender_email,
      role: 'Volunteer',
      shifts: [eventDetails]
    }

    // Add volunteer to the database
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/volunteers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(volunteerData)
    })

    if (response.ok) {
      const result = await response.json()
      console.log(`✅ Volunteer added to calendar: ${volunteerName} for ${eventDetails.event}`)
      
      // Send confirmation email with event details
      await sendVolunteerConfirmationEmail(payload.sender_email, volunteerName, eventDetails)
    } else {
      console.error('Failed to add volunteer to database')
    }

  } catch (error) {
    console.error('Error handling volunteer confirmation:', error)
  }
}

// Helper function to handle volunteer decline
async function handleVolunteerDecline(payload: any) {
  try {
    console.log(`😔 Volunteer declined: ${payload.sender_email}`)
    
    // Send polite decline response
    const declineMessage = `Thank you for your response. We completely understand that you're unable to participate this time.

We'll make sure to reach out to you for our next blood drive event. Your support means the world to us, and we hope to see you at a future event!

Best regards,
Red Cross Events Team`

    await sendDirectEmailReply(
      payload.sender_email,
      declineMessage,
      payload.thread_id,
      payload.campaign_id
    )

    console.log(`✅ Decline response sent to: ${payload.sender_email}`)

  } catch (error) {
    console.error('Error handling volunteer decline:', error)
  }
}

// Helper function to handle volunteer questions
async function handleVolunteerQuestion(payload: any) {
  try {
    console.log(`❓ Volunteer has questions: ${payload.sender_email}`)
    
    // Send helpful information email
    const infoMessage = `Thank you for your interest in our blood drive event! We're happy to answer your questions.

Here are some common details about our events:

**Event Information:**
• Location: Community Center (address will be provided closer to the date)
• Duration: Typically 4-6 hours
• What to bring: Just yourself and a valid ID
• What to expect: Quick health screening, comfortable donation process, refreshments provided

**Preparation:**
• Get a good night's sleep
• Eat a healthy meal before donating
• Stay hydrated
• Bring a list of any medications you're taking

If you have specific questions not covered here, please reply to this email and we'll get back to you with detailed information.

We look forward to seeing you at the event!

Best regards,
Red Cross Events Team`

    await sendDirectEmailReply(
      payload.sender_email,
      infoMessage,
      payload.thread_id,
      payload.campaign_id
    )

    console.log(`✅ Information email sent to: ${payload.sender_email}`)

  } catch (error) {
    console.error('Error handling volunteer question:', error)
  }
}

// Helper function to send volunteer confirmation email
async function sendVolunteerConfirmationEmail(email: string, name: string, eventDetails?: any) {
  try {
    const confirmationMessage = `🎉 **Welcome to the team, ${name}!**

Thank you for confirming your participation in our blood drive event. We're thrilled to have you as a volunteer!

**What's Next:**
• You'll receive a reminder email 24 hours before the event
• Please arrive 15 minutes early for orientation
• We'll provide all necessary training and materials
• Refreshments and snacks will be available throughout the day

**Event Details:**
• Date: ${eventDetails?.date || 'TBD'}
• Time: ${eventDetails?.time || 'TBD'}
• Event: ${eventDetails?.event || 'Blood Drive Event'}
• Duration: Approximately 4-6 hours

If you have any questions or need to make changes to your availability, please don't hesitate to reach out.

Thank you for making a difference in our community!

Best regards,
Red Cross Events Team`

    await sendDirectEmailReply(
      email,
      confirmationMessage,
      `confirmation_${Date.now()}`,
      'volunteer_confirmation'
    )

    console.log(`✅ Confirmation email sent to: ${email}`)

  } catch (error) {
    console.error('Error sending confirmation email:', error)
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Agent Mail webhook endpoint with conversation AI and volunteer management',
    timestamp: new Date().toISOString(),
    features: [
      'Intelligent conversation responses via Claude',
      'Automated reply sending',
      'Conversation state tracking',
      'Suggested action execution',
      'Human review flagging',
      'Volunteer response processing',
      'Automatic calendar updates',
      'Smart email responses for yes/no/questions'
    ]
  })
}