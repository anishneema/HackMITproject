import { NextRequest, NextResponse } from 'next/server'
import { agentMailConversationService } from '@/lib/agentmail-conversation-service'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const action = url.searchParams.get('action')
    const limit = parseInt(url.searchParams.get('limit') || '20', 10)

    console.log(`📥 AgentMail API: ${action || 'inbox'} messages (limit: ${limit})`)

    let messages = []
    let status = 'success'

    switch (action) {
      case 'unread':
        messages = await agentMailConversationService.getUnreadMessages()
        break

      case 'test':
        const connectionOk = await agentMailConversationService.testConnection()
        return NextResponse.json({
          success: connectionOk,
          message: connectionOk ? 'AgentMail API connection successful' : 'AgentMail API connection failed',
          timestamp: new Date().toISOString()
        })

      case 'inbox':
      default:
        messages = await agentMailConversationService.getInboxMessages(limit)
        break
    }

    return NextResponse.json({
      success: true,
      action: action || 'inbox',
      messages: messages.map(msg => ({
        id: msg.id,
        from: msg.from,
        to: msg.to,
        subject: msg.subject,
        text: msg.text?.substring(0, 200) + (msg.text && msg.text.length > 200 ? '...' : ''),
        timestamp: msg.timestamp,
        thread_id: msg.thread_id
      })),
      count: messages.length,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('AgentMail messages API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch messages',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, to, subject, content, message_id, thread_id } = await request.json()

    console.log(`📤 AgentMail API: ${action}`)

    let result = false
    let message = ''

    switch (action) {
      case 'reply':
        if (!message_id || !content) {
          throw new Error('message_id and content are required for reply')
        }
        result = await agentMailConversationService.sendReply(message_id, content, subject)
        message = result ? 'Reply sent successfully' : 'Failed to send reply'
        break

      case 'send':
        if (!to || !subject || !content) {
          throw new Error('to, subject, and content are required for send')
        }
        result = await agentMailConversationService.sendMessage(to, subject, content, thread_id)
        message = result ? 'Message sent successfully' : 'Failed to send message'
        break

      case 'mark_read':
        if (!message_id) {
          throw new Error('message_id is required for mark_read')
        }
        result = await agentMailConversationService.markAsRead(message_id)
        message = result ? 'Message marked as read' : 'Failed to mark message as read'
        break

      default:
        throw new Error(`Unknown action: ${action}`)
    }

    return NextResponse.json({
      success: result,
      action,
      message,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('AgentMail messages API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 400 }
    )
  }
}