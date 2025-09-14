import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const apiKey = process.env.AGENT_MAIL_API_KEY
    const inbox = process.env.AGENT_MAIL_INBOX || 'hackmit@agentmail.to'

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'AgentMail API key not configured',
        details: 'Please set AGENT_MAIL_API_KEY in your environment variables'
      }, { status: 500 })
    }

    // Test the AgentMail API connection - try different endpoints
    let response;
    let endpoint = '';
    
    try {
      // Try the inboxes endpoint first
      endpoint = 'https://api.agentmail.io/v1/inboxes'
      response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      })
    } catch (error) {
      console.log('Inboxes endpoint failed, trying status endpoint...')
      try {
        // Try a status/health endpoint
        endpoint = 'https://api.agentmail.io/v1/status'
        response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        })
      } catch (error2) {
        console.log('Status endpoint failed, trying root endpoint...')
        // Try the root API endpoint
        endpoint = 'https://api.agentmail.io/v1/'
        response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        })
      }
    }

    if (!response.ok) {
      const errorData = await response.text()
      return NextResponse.json({
        success: false,
        error: 'AgentMail API connection failed',
        details: errorData,
        apiKey: apiKey.substring(0, 10) + '...',
        inbox: inbox
      }, { status: response.status })
    }

    const data = await response.json()

    return NextResponse.json({
      success: true,
      message: 'AgentMail API connection successful',
      endpoint: endpoint,
      inbox: inbox,
      apiKey: apiKey.substring(0, 10) + '...',
      data: data
    })

  } catch (error) {
    console.error('AgentMail test error:', error)
    return NextResponse.json({
      success: false,
      error: 'AgentMail test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      apiKey: process.env.AGENT_MAIL_API_KEY ? process.env.AGENT_MAIL_API_KEY.substring(0, 10) + '...' : 'Not found',
      inbox: process.env.AGENT_MAIL_INBOX || 'hackmit@agentmail.to'
    }, { status: 500 })
  }
}
