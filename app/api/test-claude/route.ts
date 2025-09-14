import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!
})

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Testing Claude API...')
    console.log('API Key exists:', !!process.env.ANTHROPIC_API_KEY)
    console.log('API Key prefix:', process.env.ANTHROPIC_API_KEY?.substring(0, 10))

    const testMessage = {
      from: 'test@example.com',
      subject: 'Test Blood Drive Interest',
      text: 'Hi, I am interested in participating in your blood drive. Can you send me more details?'
    }

    const systemPrompt = `You are an AI assistant for a Red Cross blood drive organization. Your job is to analyze incoming email messages and decide:

1. Should we reply to this message? (YES/NO)
2. What type of reply should we send?
3. What should the reply content be?

REPLY TYPES:
- thank_you: Simple thank you for positive responses
- information: Provide event details, location, requirements
- scheduling: Help with appointment booking
- question_response: Answer specific questions
- polite_decline: Polite response to negative replies

CURRENT EVENT CONTEXT:
- Next Event: Community Center Blood Drive on September 20, 2025
- Time: 9:00 AM - 3:00 PM
- Location: Downtown Community Center
- Available spots: 38 out of 50

GUIDELINES:
- Always be polite and professional
- Keep replies concise but helpful
- For positive interest, provide event details and next steps
- For questions, answer specifically and offer additional help
- For negative responses, thank them politely and wish them well
- For spam or irrelevant messages, don't reply

Respond ONLY with a valid JSON object with these exact fields:
- shouldReply: boolean
- replyType: string (one of the types above)
- replyContent: string (the actual reply text)
- confidence: number (0-1, how confident you are in this decision)

Do not include any other text or explanation outside the JSON.`

    const userPrompt = `INCOMING MESSAGE:
From: ${testMessage.from}
Subject: ${testMessage.subject}
Content: ${testMessage.text}

Please analyze this message and provide your reply decision as JSON only.`

    console.log('Making Claude API call...')
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1000,
      temperature: 0.7,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    })

    const content = response.content[0].type === 'text' ? response.content[0].text : ''
    console.log('✅ Claude response received:', content)

    // Try to parse JSON response
    try {
      const decision = JSON.parse(content)
      console.log('✅ JSON parsed successfully:', decision)

      return NextResponse.json({
        success: true,
        claudeResponse: content,
        parsedDecision: decision,
        timestamp: new Date().toISOString()
      })

    } catch (parseError) {
      console.error('❌ Failed to parse Claude response as JSON:', parseError)
      console.log('Raw response:', content)

      return NextResponse.json({
        success: false,
        error: 'Failed to parse JSON',
        claudeResponse: content,
        parseError: parseError.message,
        timestamp: new Date().toISOString()
      })
    }

  } catch (error) {
    console.error('❌ Claude API error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Claude API test endpoint',
    usage: 'POST to test Claude API with sample message',
    timestamp: new Date().toISOString()
  })
}