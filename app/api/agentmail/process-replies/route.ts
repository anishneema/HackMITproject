import { NextRequest, NextResponse } from 'next/server'
import { agentMailConversationService } from '@/lib/agentmail-conversation-service'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!
})

interface ReplyDecision {
  shouldReply: boolean
  replyType: 'thank_you' | 'information' | 'scheduling' | 'question_response' | 'polite_decline'
  replyContent: string
  confidence: number
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Processing AgentMail replies...')

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'Anthropic API key not configured'
      }, { status: 500 })
    }

    // Get unread messages from AgentMail
    const unreadMessages = await agentMailConversationService.getUnreadMessages()

    console.log(`📬 Found ${unreadMessages.length} unread messages`)

    if (unreadMessages.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No new messages to process',
        processed: 0,
        timestamp: new Date().toISOString()
      })
    }

    const results = []

    // Process each message
    for (const message of unreadMessages) {
      try {
        console.log(`📧 Processing message from ${message.from}: "${message.subject}"`)

        // Use Claude to decide what to reply
        const replyDecision = await analyzeMessageAndDecideReply(message)

        if (replyDecision.shouldReply) {
          console.log(`💬 Sending ${replyDecision.replyType} reply to ${message.from}`)

          // Send the reply through AgentMail
          const sent = await agentMailConversationService.sendMessage(
            message.from,
            message.subject.startsWith('Re:') ? message.subject : `Re: ${message.subject}`,
            replyDecision.replyContent,
            message.thread_id
          )

          if (sent) {
            // Mark original message as read
            await agentMailConversationService.markAsRead(message.id)

            results.push({
              messageId: message.id,
              from: message.from,
              subject: message.subject,
              replyType: replyDecision.replyType,
              replySent: true,
              confidence: replyDecision.confidence
            })

            console.log(`✅ Reply sent to ${message.from}`)
          } else {
            results.push({
              messageId: message.id,
              from: message.from,
              subject: message.subject,
              replyType: replyDecision.replyType,
              replySent: false,
              error: 'Failed to send reply',
              confidence: replyDecision.confidence
            })

            console.log(`❌ Failed to send reply to ${message.from}`)
          }
        } else {
          console.log(`⏭️ No reply needed for message from ${message.from}`)

          // Still mark as read since we processed it
          await agentMailConversationService.markAsRead(message.id)

          results.push({
            messageId: message.id,
            from: message.from,
            subject: message.subject,
            replyType: 'no_reply',
            replySent: false,
            reason: 'Claude determined no reply needed',
            confidence: replyDecision.confidence
          })
        }

      } catch (error) {
        console.error(`❌ Error processing message ${message.id}:`, error)

        results.push({
          messageId: message.id,
          from: message.from,
          subject: message.subject,
          error: error instanceof Error ? error.message : 'Unknown error',
          replySent: false
        })
      }

      // Add a small delay between processing messages
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    const successCount = results.filter(r => r.replySent).length

    return NextResponse.json({
      success: true,
      message: `Processed ${results.length} messages, sent ${successCount} replies`,
      processed: results.length,
      repliesSent: successCount,
      results: results,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error processing AgentMail replies:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

async function analyzeMessageAndDecideReply(message: any): Promise<ReplyDecision> {
  try {
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

IMPORTANT: You must respond with ONLY a valid JSON object. Do not include any other text, explanation, or commentary. Only return the JSON.

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
Content: ${message.text || 'No text content'}

Please analyze this message and provide your reply decision.`

    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1000,
      temperature: 0.7,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    })

    const content = response.content[0].type === 'text' ? response.content[0].text : ''

    // Try to parse JSON response - handle cases where Claude adds extra text
    try {
      let jsonStr = content.trim()

      // Try to extract JSON from the response if it contains extra text
      const jsonStartIndex = jsonStr.indexOf('{')
      const jsonEndIndex = jsonStr.lastIndexOf('}') + 1

      if (jsonStartIndex !== -1 && jsonEndIndex !== -1 && jsonEndIndex > jsonStartIndex) {
        jsonStr = jsonStr.substring(jsonStartIndex, jsonEndIndex)
      }

      console.log('🔍 Attempting to parse JSON:', jsonStr.substring(0, 200))

      const decision = JSON.parse(jsonStr)

      // Validate the response has required fields
      if (typeof decision.shouldReply !== 'boolean' || !decision.replyContent) {
        throw new Error('Invalid response format from Claude')
      }

      console.log('✅ Successfully parsed Claude decision:', {
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
      console.error('❌ Failed to parse Claude response as JSON:', parseError)
      console.log('🔍 Claude raw response:', content)

      // Fallback: analyze content manually
      return analyzeContentFallback(message, content)
    }

  } catch (error) {
    console.error('Error getting Claude analysis:', error)

    // Fallback analysis
    return {
      shouldReply: true,
      replyType: 'thank_you',
      replyContent: 'Thank you for your email! We appreciate your interest in our blood drive event. If you have any questions, please don\'t hesitate to reach out.',
      confidence: 0.5
    }
  }
}

function analyzeContentFallback(message: any, claudeResponse: string): ReplyDecision {
  const text = (message.text || '').toLowerCase()
  const subject = (message.subject || '').toLowerCase()

  // Check for positive responses
  if (text.includes('yes') || text.includes('interested') || text.includes('sign up') ||
      text.includes('participate') || text.includes('count me in')) {
    return {
      shouldReply: true,
      replyType: 'information',
      replyContent: `Thank you for your interest in our blood drive! Our next event is the Community Center Blood Drive on September 20, 2025, from 9:00 AM to 3:00 PM at the Downtown Community Center.

We currently have 38 spots available out of 50. The donation process typically takes about an hour, and your contribution can help save up to 3 lives!

Would you like me to help you register for a specific time slot? Please reply with your preferred time and we'll get you all set up.

Thank you for helping us save lives!

Best regards,
Red Cross Events Team`,
      confidence: 0.9
    }
  }

  // Check for questions
  if (text.includes('?') || text.includes('when') || text.includes('where') ||
      text.includes('what') || text.includes('how')) {
    return {
      shouldReply: true,
      replyType: 'question_response',
      replyContent: `Thank you for your question! Here are the details for our upcoming blood drive:

📅 Event: Community Center Blood Drive
🗓️ Date: September 20, 2025
⏰ Time: 9:00 AM - 3:00 PM
📍 Location: Downtown Community Center
🎯 Available spots: 38 out of 50

The donation process is quick and safe, typically taking about an hour from check-in to completion. You'll be helping save lives - one donation can help save up to 3 people!

Is there anything specific you'd like to know about the donation process or the event? I'm here to help!

Best regards,
Red Cross Events Team`,
      confidence: 0.8
    }
  }

  // Check for negative responses
  if (text.includes('no') || text.includes('not interested') || text.includes('cannot') ||
      text.includes("can't") || text.includes('decline')) {
    return {
      shouldReply: true,
      replyType: 'polite_decline',
      replyContent: `Thank you for letting us know. We completely understand that not everyone is available or able to donate at this time.

If your circumstances change in the future, we'd love to have you join us at a future blood drive. Every donation makes a difference in saving lives.

Thank you for considering our request, and have a wonderful day!

Best regards,
Red Cross Events Team`,
      confidence: 0.8
    }
  }

  // Default: send a thank you
  return {
    shouldReply: true,
    replyType: 'thank_you',
    replyContent: `Thank you for your email! We appreciate you taking the time to respond to our blood drive invitation.

Our next event is the Community Center Blood Drive on September 20, 2025, from 9:00 AM to 3:00 PM at the Downtown Community Center. We have 38 spots available out of 50.

If you're interested in participating or have any questions, please don't hesitate to reply. We're here to help make the donation process as easy as possible for you.

Thank you for supporting our mission to save lives!

Best regards,
Red Cross Events Team`,
    confidence: 0.7
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'AgentMail reply processing endpoint',
    usage: 'POST to process all unread messages and send intelligent replies',
    timestamp: new Date().toISOString()
  })
}