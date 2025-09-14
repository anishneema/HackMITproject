import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!
})

export async function POST(request: NextRequest) {
  try {
    const { message, dashboardData, conversationHistory } = await request.json()

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'Anthropic API key not configured' },
        { status: 500 }
      )
    }

    const systemPrompt = `You are an intelligent AI assistant for the Red Cross Blood Drive Management System. You have access to real-time dashboard data including events, volunteers, email campaigns, bookings, and analytics.

Your capabilities include:
1. Answering questions about dashboard data (events, volunteers, email campaigns, bookings, etc.)
2. Creating new blood drive events with details like date, time, venue, target donors
3. Analyzing volunteer participation patterns and suggesting improvements
4. Providing insights on email campaign effectiveness
5. Helping with venue recommendations and logistics
6. Generating reports and summaries from the data

Current Dashboard Data:
${JSON.stringify(dashboardData, null, 2)}

When creating events, provide structured responses that can be parsed for automation. Always be helpful, accurate, and focused on blood drive management tasks.

IMPORTANT: When you create or suggest creating an event, respond with a clear indication that an event should be created, including all the necessary details like name, date, time, venue, and target donors. Format this as a clear action that can be detected and processed.`

    // Build conversation messages including history
    const messages: Array<{role: 'user' | 'assistant', content: string}> = []

    if (conversationHistory && conversationHistory.length > 0) {
      const relevantHistory = conversationHistory.slice(-10) // Keep last 10 messages
      relevantHistory.forEach((msg: any) => {
        messages.push({
          role: msg.type === 'user' ? 'user' : 'assistant',
          content: msg.content
        })
      })
    }

    // Add current message
    messages.push({ role: 'user', content: message })

    const response = await client.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1000,
      temperature: 0.7,
      system: systemPrompt,
      messages: messages
    })

    const content = response.content[0].type === 'text' ? response.content[0].text : ''

    // Parse response for automated actions
    const actions: Array<{
      type: 'event_created' | 'csv_processed' | 'email_campaign' | 'venue_search' | 'data_query'
      status: 'completed' | 'pending' | 'failed'
      details: string
    }> = []

    // Check if the response indicates an event should be created
    const eventCreationKeywords = [
      'create an event', 'schedule a blood drive', 'new event', 'add event',
      'blood drive for', 'organize.*blood drive'
    ]

    const shouldCreateEvent = eventCreationKeywords.some(keyword =>
      content.toLowerCase().match(new RegExp(keyword))
    )

    if (shouldCreateEvent) {
      actions.push({
        type: 'event_created',
        status: 'pending',
        details: 'AI suggested creating an event based on the conversation'
      })
    }

    return NextResponse.json({
      content,
      actions
    })

  } catch (error) {
    console.error('Claude AI Error:', error)
    return NextResponse.json(
      { error: 'Failed to process AI request' },
      { status: 500 }
    )
  }
}