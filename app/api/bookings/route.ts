import { NextRequest, NextResponse } from 'next/server'

// In-memory storage for bookings (in production, this would be a database)
let bookings: any[] = []
let nextId = 1

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      bookings
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch bookings' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const bookingData = await request.json()

    const newBooking = {
      id: `booking-${nextId++}`,
      ...bookingData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: bookingData.status || 'confirmed',
      source: bookingData.source || 'direct_booking'
    }

    bookings.push(newBooking)

    return NextResponse.json({
      success: true,
      booking: newBooking
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create booking' },
      { status: 500 }
    )
  }
}