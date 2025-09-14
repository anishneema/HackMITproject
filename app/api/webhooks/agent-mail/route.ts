import { NextRequest, NextResponse } from 'next/server'
import { agentMailService } from '@/lib/agent-mail-service'
import { csvProcessor } from '@/lib/csv-processor'
import { aiDataManager } from '@/lib/ai-data-manager'
import { useDashboardStore } from '@/lib/dashboard-store'

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()

    console.log('Agent Mail webhook received:', payload)

    // Handle incoming email that needs a response
    if (payload.type === 'email_received' && payload.requires_response) {
      try {
        // For now, generate a simple fallback response
        let contextualResponse = 'Thank you for your email. We will get back to you soon.'

        // Try to generate a contextual response if possible
        try {
          contextualResponse = await agentMailService.generateContextualResponse(
            payload.message_content,
            payload.sender_email
          )
        } catch (contextError) {
          console.warn('Could not generate contextual response, using fallback:', contextError.message)

          // Fallback contextual response based on message content
          const messageLower = payload.message_content.toLowerCase()
          if (messageLower.includes('next event') || messageLower.includes('when')) {
            contextualResponse = 'Thank you for your interest! Our next blood drive event is "Community Center Blood Drive" scheduled for September 20, 2025 at 9:00 AM - 3:00 PM at Downtown Community Center. We currently have 12 RSVPs out of 50 target donors, so there are 38 spots still available. Would you like me to help you register?'
          } else if (messageLower.includes('location') || messageLower.includes('where')) {
            contextualResponse = 'Our next blood drive event will be held at Downtown Community Center on September 20, 2025 at 9:00 AM - 3:00 PM. This location is easily accessible with parking available. Would you like me to send you directions or help you register for this event?'
          }
        }

        console.log('Generated contextual response:', contextualResponse)

        // For now, just log instead of actually sending email
        console.log('Would send reply to thread:', payload.thread_id)

      } catch (error) {
        console.error('Failed to process contextual response:', error)
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

export async function GET() {
  return NextResponse.json({
    message: 'Agent Mail webhook endpoint',
    timestamp: new Date().toISOString()
  })
}