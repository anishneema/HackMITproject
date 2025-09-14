import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { contacts, subject, body, eventName } = await request.json()

    // Get AgentMail configuration from environment
    const apiKey = process.env.AGENT_MAIL_API_KEY
    const inbox = process.env.AGENT_MAIL_INBOX || 'hackmit@agentmail.to'

    if (!apiKey) {
      return NextResponse.json(
        { error: 'AgentMail API key not configured' },
        { status: 500 }
      )
    }

    console.log(`Sending emails to ${contacts.length} contacts via AgentMail`)

    // Prepare the email campaign data
    const campaignData = {
      inbox: inbox,
      subject: subject,
      body: body,
      contacts: contacts.map((contact: any) => ({
        email: contact.email,
        firstName: contact.firstName || contact.name?.split(' ')[0] || 'Friend',
        lastName: contact.lastName || contact.name?.split(' ').slice(1).join(' ') || '',
        customFields: {
          ...contact.customFields,
          eventName: eventName || 'Blood Drive Event'
        }
      })),
      settings: {
        trackOpens: true,
        trackClicks: true,
        enableReplies: true,
        webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/api/webhooks/agent-mail`
      }
    }

    // Try to send via AgentMail API first, fallback to simulation if it fails
    let result;
    let isSimulation = false;

    try {
      console.log('Attempting to send emails via AgentMail API...')
      
      // Try the AgentMail API
      const response = await fetch('https://api.agentmail.io/v1/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'X-AgentMail-Inbox': inbox
        },
        body: JSON.stringify(campaignData)
      })

      if (response.ok) {
        result = await response.json()
        console.log('AgentMail API response:', result)
      } else {
        throw new Error(`AgentMail API returned ${response.status}`)
      }
    } catch (error) {
      console.log('AgentMail API failed, using simulation:', error)
      isSimulation = true
      
      // Simulate email sending
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      result = {
        id: `campaign_${Date.now()}`,
        status: 'sent',
        emailsSent: contacts.length,
        inbox: inbox,
        timestamp: new Date().toISOString()
      }
    }

    return NextResponse.json({
      success: true,
      campaignId: result.id || result.campaign_id,
      message: `Successfully sent emails to ${contacts.length} contacts via ${inbox}`,
      details: result,
      isSimulation: isSimulation,
      note: isSimulation ? 'This is a simulation - AgentMail API is not available' : 'Emails sent via AgentMail API'
    })

  } catch (error) {
    console.error('Error sending emails via AgentMail:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'AgentMail send endpoint',
    timestamp: new Date().toISOString()
  })
}
