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
            message.includes('count me in') || message.includes('participate') || message.includes('volunteer')) {
          sentiment = 'positive'
        } else if (message.includes('no') || message.includes('not interested') || message.includes('unsubscribe') ||
                   message.includes('remove') || message.includes('decline')) {
          sentiment = 'negative'
        } else if (message.includes('?') || message.includes('when') || message.includes('where') ||
                   message.includes('how') || message.includes('what') || message.includes('time')) {
          sentiment = 'question'
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
          contactUpdates.status = 'interested'
          // Auto-schedule if they showed interest
          if (message.includes('schedule') || message.includes('when') || message.includes('sign up')) {
            contactUpdates.status = 'scheduled'
          }
        } else if (sentiment === 'negative') {
          contactUpdates.status = 'not_interested'
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

export async function GET() {
  return NextResponse.json({
    message: 'Agent Mail webhook endpoint with conversation AI',
    timestamp: new Date().toISOString(),
    features: [
      'Intelligent conversation responses via Claude',
      'Automated reply sending',
      'Conversation state tracking',
      'Suggested action execution',
      'Human review flagging'
    ]
  })
}