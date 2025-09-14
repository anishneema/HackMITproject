import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!
})

export async function POST(request: NextRequest) {
  try {
    const {
      message,
      senderEmail,
      conversationHistory,
      dashboardContext,
      threadContext
    } = await request.json()

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'Anthropic API key not configured' },
        { status: 500 }
      )
    }

    // Build enhanced system prompt for email conversations
    const systemPrompt = `You are an intelligent AI assistant for the Red Cross Blood Drive organization. You are having a conversation with ${senderEmail} via email about blood donation events.

CONVERSATION CONTEXT:
- Participant Email: ${senderEmail}
- Campaign ID: ${threadContext.campaign_id || 'N/A'}
- Participant Name: ${threadContext.context?.participant_name || 'N/A'}

CURRENT DASHBOARD DATA:
${JSON.stringify(dashboardContext, null, 2)}

YOUR ROLE:
- You are representing the Red Cross Blood Drive team
- You help people register for blood donation events
- You answer questions about the process, timing, location, and requirements
- You can schedule appointments and provide event details
- You should be friendly, professional, and encouraging

CONVERSATION GUIDELINES:
1. Be conversational and natural, like a friendly staff member
2. Always provide helpful, accurate information about blood drive events
3. If someone expresses interest, help them get registered
4. If they have questions, provide detailed answers
5. If they decline, be respectful and thank them for their time
6. Encourage participation but don't be pushy
7. Provide specific event details (dates, times, locations) when relevant
8. If you need to escalate to human staff, indicate this clearly

RESPONSE REQUIREMENTS:
- Keep responses conversational but concise (2-4 sentences typically)
- Include specific event details when relevant
- Provide next steps when appropriate
- Be encouraging but respectful of their decision
- If they ask for information not in the dashboard, acknowledge limitations

CURRENT MESSAGE CONTEXT:
This is an ongoing email conversation. The participant just sent: "${message}"`

    // Build conversation messages
    const messages: Array<{role: 'user' | 'assistant', content: string}> = []

    // Add conversation history
    if (conversationHistory && conversationHistory.length > 0) {
      const relevantHistory = conversationHistory.slice(-8) // Keep last 8 messages for context
      relevantHistory.forEach((msg: any) => {
        messages.push({
          role: msg.type === 'user' ? 'user' : 'assistant',
          content: msg.content
        })
      })
    }

    // Add current message if not already included
    const lastMessage = messages[messages.length - 1]
    if (!lastMessage || lastMessage.content !== message) {
      messages.push({ role: 'user', content: message })
    }

    const response = await client.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 800,
      temperature: 0.7,
      system: systemPrompt,
      messages: messages
    })

    const content = response.content[0].type === 'text' ? response.content[0].text : ''

    // Analyze the response to determine if it should be sent automatically
    const lowerContent = content.toLowerCase()
    const lowerMessage = message.toLowerCase()

    // Determine if response should be sent automatically
    let shouldSend = true
    let requiresHumanReview = false
    const suggestedActions: Array<{
      type: 'schedule_appointment' | 'send_info' | 'escalate' | 'close_conversation'
      details: string
    }> = []

    // Check for scheduling requests
    if (lowerMessage.includes('schedule') ||
        lowerMessage.includes('book') ||
        lowerMessage.includes('sign up') ||
        lowerMessage.includes('register')) {
      suggestedActions.push({
        type: 'schedule_appointment',
        details: 'User wants to schedule an appointment'
      })
    }

    // Check for information requests
    if (lowerMessage.includes('?') ||
        lowerMessage.includes('when') ||
        lowerMessage.includes('where') ||
        lowerMessage.includes('how') ||
        lowerMessage.includes('what')) {
      suggestedActions.push({
        type: 'send_info',
        details: 'User is asking for information'
      })
    }

    // Check for negative responses
    if (lowerMessage.includes('no') ||
        lowerMessage.includes('not interested') ||
        lowerMessage.includes('decline') ||
        lowerMessage.includes('cannot')) {
      suggestedActions.push({
        type: 'close_conversation',
        details: 'User declined participation'
      })
    }

    // Check if human review might be needed
    if (lowerMessage.includes('complaint') ||
        lowerMessage.includes('problem') ||
        lowerMessage.includes('issue') ||
        lowerMessage.includes('concerned') ||
        lowerMessage.includes('manager') ||
        lowerMessage.includes('supervisor')) {
      requiresHumanReview = true
      suggestedActions.push({
        type: 'escalate',
        details: 'Message may require human attention'
      })
    }

    // Check for complex scheduling requests that might need human help
    if ((lowerMessage.includes('special') && lowerMessage.includes('need')) ||
        lowerMessage.includes('accommodation') ||
        lowerMessage.includes('medical') ||
        lowerMessage.includes('disability')) {
      requiresHumanReview = true
    }

    return NextResponse.json({
      content,
      should_send: shouldSend,
      requires_human_review: requiresHumanReview,
      suggested_actions: suggestedActions
    })

  } catch (error) {
    console.error('Conversation generation error:', error)
    return NextResponse.json(
      {
        content: 'Thank you for your email. We will get back to you soon!',
        should_send: true,
        requires_human_review: true,
        suggested_actions: [],
        error: 'AI conversation generation failed'
      },
      { status: 500 }
    )
  }
}