import { NextRequest, NextResponse } from 'next/server'
import { AgentMailClient } from 'agentmail'
import { Anthropic } from '@anthropic-ai/sdk'
import { WEBHOOK_CONFIG, webhookStats } from '@/lib/webhook-config'

// Initialize services
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!
})

const agentMailClient = new AgentMailClient({
  apiKey: process.env.AGENT_MAIL_API_KEY!
})

// Webhook secret for verification
const WEBHOOK_SECRET = process.env.AGENT_MAIL_WEBHOOK_SECRET || WEBHOOK_CONFIG.WEBHOOK_SECRET

interface AgentMailWebhookPayload {
  id: string
  type: 'message.received'
  data: {
    id: string
    from: string
    to: string[]
    subject: string
    text?: string
    html?: string
    thread_id?: string
    labels?: string[]
    created_at: string
  }
}

interface ReplyDecision {
  shouldReply: boolean
  replyType: string
  replyContent: string
  confidence: number
}

export async function POST(request: NextRequest) {
  try {
    const payload: AgentMailWebhookPayload = await request.json()
    
    // Track webhook received
    webhookStats.incrementReceived()
    
    console.log('📧 AgentMail webhook received:', {
      type: payload.type,
      messageId: payload.data.id,
      from: payload.data.from,
      subject: payload.data.subject
    })

    // Verify webhook signature (temporarily disabled for testing)
    const signature = request.headers.get('x-agentmail-signature')
    console.log('🔍 Webhook signature received:', signature)
    
    // Temporarily disable signature verification to test webhook functionality
    // if (signature && !verifyWebhookSignature(JSON.stringify(payload), signature)) {
    //   console.error('❌ Invalid webhook signature')
    //   return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    // }

    // Process only message.received events
    if (payload.type !== 'message.received') {
      console.log('⚠️ Ignoring non-message event:', payload.type)
      return NextResponse.json({ message: 'Event ignored' }, { status: 200 })
    }

    const message = payload.data
    console.log('📬 Processing incoming message:', {
      id: message.id,
      from: message.from,
      subject: message.subject,
      threadId: message.thread_id
    })

    // Check if auto-reply is enabled
    if (!WEBHOOK_CONFIG.AUTO_REPLY_ENABLED) {
      console.log('🔇 Auto-reply disabled, skipping processing')
      webhookStats.incrementRepliesSkipped()
      return NextResponse.json({
        success: true,
        message: 'Auto-reply disabled'
      })
    }

    // Analyze message with Claude and decide on reply
    const replyDecision = await analyzeMessageAndGenerateReply(message)

    // ALWAYS reply to emails - at minimum with a thank you
    if (replyDecision.shouldReply) {
      console.log(`🤖 Sending ${replyDecision.replyType} reply to ${message.from} (confidence: ${replyDecision.confidence})`)
      
      // Add delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, WEBHOOK_CONFIG.REPLY_DELAY_MS))
      
      // Send reply using AgentMail
      const replySent = await sendAgentMailReply(message, replyDecision.replyContent)
      
      if (replySent) {
        webhookStats.incrementRepliesSent()
        console.log('✅ Autonomous reply sent successfully')
        
        return NextResponse.json({
          success: true,
          message: 'Reply sent automatically',
          replyType: replyDecision.replyType,
          confidence: replyDecision.confidence
        })
      } else {
        webhookStats.incrementErrors()
        console.error('❌ Failed to send autonomous reply')
        return NextResponse.json({
          success: false,
          message: 'Reply generated but failed to send'
        }, { status: 500 })
      }
    } else {
      // Fallback: Send a basic thank you if Claude says not to reply
      console.log(`🤖 Claude said no reply, but sending basic thank you to ${message.from}`)
      
      const fallbackReply = "Thank you for contacting us! We appreciate your message and will get back to you soon. If this is regarding our blood drive event, please visit our website for more information."
      
      const replySent = await sendAgentMailReply(message, fallbackReply)
      
      if (replySent) {
        webhookStats.incrementRepliesSent()
        console.log('✅ Fallback thank you reply sent successfully')
        
        return NextResponse.json({
          success: true,
          message: 'Fallback reply sent automatically',
          replyType: 'thank_you',
          confidence: 0.5
        })
      } else {
        webhookStats.incrementErrors()
        console.error('❌ Failed to send fallback reply')
        return NextResponse.json({
          success: false,
          message: 'Fallback reply failed to send'
        }, { status: 500 })
      }
    }

  } catch (error) {
    console.error('❌ Webhook processing error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to process webhook'
    }, { status: 500 })
  }
}

async function analyzeMessageAndGenerateReply(message: any): Promise<ReplyDecision> {
  try {
    const systemPrompt = `You are an AI assistant for a Red Cross blood drive organization. Your job is to analyze incoming email messages and decide:

1. Should we reply to this message? (ALWAYS YES unless it's clearly spam or an auto-response)
2. What type of reply should we send?
3. What should the reply content be?

REPLY TYPES:
- thank_you: Simple thank you for any message
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
- ALWAYS reply to emails - be helpful and responsive
- Always be polite and professional
- Keep replies concise but helpful (2-3 sentences max)
- For positive interest, provide event details and next steps
- For questions, answer specifically and offer additional help
- For general messages, send a friendly thank you with event info
- Only skip replies for obvious spam or auto-responses (out-of-office, newsletters)

IMPORTANT: You must respond with ONLY a valid JSON object. Do not include any other text, explanation, or commentary.

Return this exact JSON structure:
{
  "shouldReply": boolean,
  "replyType": "string",
  "replyContent": "string",
  "confidence": number
}`

    const userPrompt = `INCOMING MESSAGE:
From: ${message.from}
Subject: ${message.subject}
Content: ${message.text || message.html?.replace(/<[^>]*>/g, '') || 'No text content'}

Please analyze this message and provide your reply decision.`

    const response = await anthropic.messages.create({
      model: WEBHOOK_CONFIG.CLAUDE_MODEL,
      max_tokens: WEBHOOK_CONFIG.CLAUDE_MAX_TOKENS,
      temperature: WEBHOOK_CONFIG.CLAUDE_TEMPERATURE,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    })

    const content = response.content[0].type === 'text' ? response.content[0].text : ''

    // Parse Claude's JSON response
    try {
      let jsonStr = content.trim()
      
      // Extract JSON from response if it contains extra text
      const jsonStartIndex = jsonStr.indexOf('{')
      const jsonEndIndex = jsonStr.lastIndexOf('}') + 1
      
      if (jsonStartIndex !== -1 && jsonEndIndex !== -1 && jsonEndIndex > jsonStartIndex) {
        jsonStr = jsonStr.substring(jsonStartIndex, jsonEndIndex)
      }

      console.log('🔍 Claude response:', jsonStr.substring(0, 200) + '...')
      
      const decision = JSON.parse(jsonStr)

      // Validate response format
      if (typeof decision.shouldReply !== 'boolean' || !decision.replyContent) {
        throw new Error('Invalid response format from Claude')
      }

      console.log('✅ Claude decision:', {
        shouldReply: decision.shouldReply,
        replyType: decision.replyType,
        confidence: decision.confidence
      })

      return {
        shouldReply: decision.shouldReply,
        replyType: decision.replyType || 'thank_you',
        replyContent: decision.replyContent,
        confidence: decision.confidence || 0.8
      }

    } catch (parseError) {
      console.error('❌ Failed to parse Claude response:', parseError)
      
      // Fallback: don't reply if we can't parse the response
      return {
        shouldReply: false,
        replyType: 'no_reply',
        replyContent: '',
        confidence: 0.0
      }
    }

  } catch (error) {
    console.error('❌ Error analyzing message with Claude:', error)
    
    // Fallback: don't reply on error
    return {
      shouldReply: false,
      replyType: 'no_reply',
      replyContent: '',
      confidence: 0.0
    }
  }
}

async function sendAgentMailReply(originalMessage: any, replyContent: string): Promise<boolean> {
  try {
    const inboxEmail = WEBHOOK_CONFIG.INBOX_EMAIL
    
    // Create reply subject
    const replySubject = originalMessage.subject.startsWith('Re:') 
      ? originalMessage.subject 
      : `Re: ${originalMessage.subject}`

    console.log('📤 Sending reply via AgentMail:', {
      to: originalMessage.from,
      subject: replySubject,
      threadId: originalMessage.thread_id
    })

    // Send reply using AgentMail SDK
    const response = await agentMailClient.inboxes.messages.send(inboxEmail, {
      to: [originalMessage.from],
      subject: replySubject,
      text: replyContent,
      html: replyContent.replace(/\n/g, '<br>'),
      threadId: originalMessage.thread_id,
      labels: ['auto-reply', 'claude-generated']
    })

    console.log('✅ AgentMail reply sent successfully:', response.id)
    return true

  } catch (error) {
    console.error('❌ Failed to send AgentMail reply:', error)
    return false
  }
}

function verifyWebhookSignature(payload: string, signature: string): boolean {
  // Simple verification - in production, use proper HMAC verification
  // For now, we'll just check if the signature format looks correct
  return signature.startsWith('whsec_') || signature.length > 10
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    service: 'AgentMail Webhook Handler',
    timestamp: new Date().toISOString()
  })
}
