import { NextRequest, NextResponse } from 'next/server'

// In-memory storage for events (in production, this would be a database)
let events: any[] = []
let nextId = 1

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      events
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const eventData = await request.json()

    const newEvent = {
      id: `event-${nextId++}`,
      ...eventData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      currentRSVPs: eventData.currentRSVPs || 0,
      emailsSent: eventData.emailsSent || 0,
      emailsOpened: eventData.emailsOpened || 0,
      emailsReplied: eventData.emailsReplied || 0,
      status: eventData.status || 'draft'
    }

    events.push(newEvent)

    return NextResponse.json({
      success: true,
      event: newEvent
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create event' },
      { status: 500 }
    )
  }
}