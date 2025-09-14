import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()

    console.log('Agent Mail webhook received:', payload)

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