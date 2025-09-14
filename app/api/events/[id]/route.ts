import { NextRequest, NextResponse } from 'next/server'

// This would be imported from your events route or shared storage
// For now, we'll simulate it (in production, use a database)
let events: any[] = []

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const event = events.find(e => e.id === params.id)

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      event
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch event' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const updates = await request.json()
    const eventIndex = events.findIndex(e => e.id === params.id)

    if (eventIndex === -1) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    events[eventIndex] = {
      ...events[eventIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    }

    return NextResponse.json({
      success: true,
      event: events[eventIndex]
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update event' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const eventIndex = events.findIndex(e => e.id === params.id)

    if (eventIndex === -1) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    events.splice(eventIndex, 1)

    return NextResponse.json({
      success: true,
      message: 'Event deleted successfully'
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete event' },
      { status: 500 }
    )
  }
}