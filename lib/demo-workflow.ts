import { csvProcessor } from './csv-processor'
import { aiDataManager } from './ai-data-manager'
import { useDashboardStore } from './dashboard-store'

export async function runDemoWorkflow() {
  console.log('🚀 Starting AgentMail Demo Workflow...')

  try {
    // Step 1: Load demo CSV data
    console.log('📄 Step 1: Processing demo CSV data...')

    // Create a demo CSV file content
    const demoCSVContent = `Name,Phone Number,Email,Location,Interests,Status
Dheeraj Tsai,9254049856,tsaidheeraj@gmail.com,San Francisco CA,tech volunteer,active
Sarah Johnson,5551234567,sarah.johnson@email.com,Boston MA,blood donation volunteer,active
Michael Chen,5551234568,m.chen@techcorp.com,San Francisco CA,corporate giving,pending
Emily Rodriguez,5551234569,emily.r@university.edu,Austin TX,student health initiatives,active`

    // Create a File object from the content
    const blob = new Blob([demoCSVContent], { type: 'text/csv' })
    const file = new File([blob], 'demo-contacts.csv', { type: 'text/csv' })

    const contacts = await csvProcessor.processCSVFile(file)
    console.log(`✅ Processed ${contacts.length} contacts from CSV`)

    // Step 2: Create email campaign
    console.log('📧 Step 2: Creating email campaign...')

    const campaign = await csvProcessor.createEmailCampaign(
      'Demo Blood Drive Outreach',
      contacts,
      {
        subject: 'Join us for our upcoming blood drive - Your community needs you!',
        body: `Dear {{name}},

I hope this message finds you well! I'm reaching out from the Red Cross to invite you to participate in our upcoming blood drive event in {{location}}.

As someone interested in {{interests}}, I thought you'd appreciate knowing that your contribution can make a real difference. One blood donation can help save up to three lives!

Our next event details:
- Event: Community Blood Drive
- Date: September 25th, 2025
- Time: 10:00 AM - 4:00 PM
- Location: Downtown Community Center

We especially value volunteers with backgrounds in {{interests}} as you bring valuable perspective to our mission.

Would you be interested in participating? Simply reply to this email with "YES" if you'd like to donate, or "VOLUNTEER" if you'd like to help organize the event.

Thank you for considering this opportunity to help save lives in our community.

Best regards,
Red Cross Events Team
Phone: {{phone}} (for any questions)`
      }
    )

    console.log(`✅ Created campaign: ${campaign.name}`)

    // Step 3: Simulate sending emails (in real implementation, this would actually send)
    console.log('🔄 Step 3: Simulating email sending...')

    // Simulate campaign start
    campaign.status = 'sending'
    for (const contact of contacts) {
      campaign.sentCount++
      console.log(`📤 Email sent to: ${contact.name} (${contact.email})`)

      // Update dashboard analytics
      const dashboardStore = useDashboardStore.getState()
      dashboardStore.onEmailSent(campaign.id, 1)
    }

    campaign.status = 'completed'
    console.log(`✅ Campaign completed: ${campaign.sentCount} emails sent`)

    // Step 4: Simulate responses and AI processing
    console.log('💬 Step 4: Simulating email responses and AI processing...')

    const demoResponses = [
      {
        email: 'tsaidheeraj@gmail.com',
        name: 'Dheeraj Tsai',
        message: 'Yes, I\'m very interested! When exactly is the event? I\'d love to volunteer as well.',
        sentiment: 'positive' as const
      },
      {
        email: 'sarah.johnson@email.com',
        name: 'Sarah Johnson',
        message: 'I have some questions about the donation process. What should I expect?',
        sentiment: 'question' as const
      },
      {
        email: 'm.chen@techcorp.com',
        name: 'Michael Chen',
        message: 'COUNT ME IN! Our company would also like to sponsor the event.',
        sentiment: 'positive' as const
      },
      {
        email: 'emily.r@university.edu',
        name: 'Emily Rodriguez',
        message: 'Sorry, I\'m not available on that date. Maybe next time.',
        sentiment: 'negative' as const
      }
    ]

    for (const response of demoResponses) {
      // Record the response
      await csvProcessor.recordEmailResponse(
        campaign.id,
        response.email,
        response.message,
        response.sentiment
      )

      // Let AI analyze and take actions
      const aiActions = await aiDataManager.analyzeAndUpdateContact(
        response.email,
        response.message
      )

      console.log(`💡 ${response.name}: ${response.sentiment} response, AI suggested ${aiActions.length} actions`)

      // Update dashboard
      const dashboardStore = useDashboardStore.getState()
      dashboardStore.onEmailReplied(campaign.id, {
        sentiment: response.sentiment,
        participantEmail: response.email
      })

      // If positive response, create booking
      if (response.sentiment === 'positive') {
        dashboardStore.onBookingReceived(campaign.id, {
          participantEmail: response.email,
          participantName: response.name,
          eventDate: new Date('2025-09-25')
        })
      }
    }

    // Step 5: AI bulk categorization
    console.log('🤖 Step 5: Running AI bulk categorization...')
    await aiDataManager.categorizeBulkContacts(contacts)

    // Step 6: Process queued AI actions
    console.log('⚙️ Step 6: Processing AI queued actions...')
    await aiDataManager.processQueuedActions()

    // Step 7: Display results
    console.log('📊 Step 7: Campaign Results Summary...')

    const stats = csvProcessor.getCampaignStats(campaign.id)
    const aiStats = aiDataManager.getActionStats()

    console.log('📈 Campaign Statistics:')
    console.log(`  • Total Contacts: ${stats?.totalContacts || contacts.length}`)
    console.log(`  • Emails Sent: ${stats?.sentCount || campaign.sentCount}`)
    console.log(`  • Replies Received: ${stats?.repliedCount || campaign.repliedCount}`)
    console.log(`  • Response Rate: ${stats?.responseRate.toFixed(1) || 0}%`)
    console.log(`  • Positive Responses: ${stats?.sentimentBreakdown.positive || 0}`)
    console.log(`  • Questions: ${stats?.sentimentBreakdown.question || 0}`)
    console.log(`  • Need Follow-up: ${stats?.requiresAction || 0}`)

    console.log('🤖 AI Agent Statistics:')
    console.log(`  • Total Actions: ${aiStats.total}`)
    console.log(`  • Completed: ${aiStats.completed}`)
    console.log(`  • Success Rate: ${aiStats.successRate.toFixed(1)}%`)

    const recentActions = aiDataManager.getRecentActions(5)
    console.log('⚡ Recent AI Actions:')
    recentActions.forEach(action => {
      console.log(`  • ${action.contactName}: ${action.action} (${action.status})`)
    })

    console.log('🎉 Demo workflow completed successfully!')

    return {
      campaign,
      stats,
      aiStats,
      contacts: contacts.length,
      success: true
    }

  } catch (error) {
    console.error('❌ Demo workflow failed:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Function to test the webhook functionality
export async function simulateWebhookResponse(email: string, message: string, campaignId: string) {
  console.log(`📥 Simulating webhook response from ${email}`)

  // This simulates what would happen when AgentMail sends a webhook
  const mockPayload = {
    type: 'email_reply',
    campaign_id: campaignId,
    sender_email: email,
    message_content: message,
    timestamp: new Date().toISOString(),
    thread_id: `thread_${Date.now()}`
  }

  try {
    // Process the webhook (this would normally be done by the actual webhook endpoint)
    const response = await fetch('/api/webhooks/agent-mail', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mockPayload)
    })

    if (response.ok) {
      console.log('✅ Webhook processed successfully')
      return true
    } else {
      console.error('❌ Webhook processing failed')
      return false
    }
  } catch (error) {
    console.error('❌ Webhook simulation failed:', error)
    return false
  }
}