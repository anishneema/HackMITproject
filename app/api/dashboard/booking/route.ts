import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { eventId, booking } = await request.json()
    
    console.log('📅 Dashboard booking update received:', {
      eventId,
      booking
    })

    // Create the booking record
    const bookingRecord = {
      eventId,
      participantEmail: booking.participantEmail,
      participantName: booking.participantName,
      eventDate: booking.eventDate,
      status: 'confirmed',
      source: 'email_response'
    }

    // Store in bookings file (this will be read by the dashboard)
    const fs = require('fs')
    const path = require('path')
    const bookingsFile = path.join(process.cwd(), 'lib', '.bookings.json')
    
    let bookings = []
    try {
      if (fs.existsSync(bookingsFile)) {
        const data = fs.readFileSync(bookingsFile, 'utf8')
        bookings = JSON.parse(data)
      }
    } catch (error) {
      console.log('📝 Creating new bookings file')
    }

    const newBooking = {
      id: `booking-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...bookingRecord,
      createdAt: new Date().toISOString()
    }

    bookings.push(newBooking)
    
    try {
      fs.writeFileSync(bookingsFile, JSON.stringify(bookings, null, 2))
      console.log('✅ Booking saved to file:', newBooking.id)
    } catch (error) {
      console.error('❌ Error saving booking to file:', error)
    }

    return NextResponse.json({
      success: true,
      message: 'Booking recorded successfully',
      bookingId: newBooking.id,
      eventId,
      participantName: booking.participantName,
      participantEmail: booking.participantEmail
    })

  } catch (error) {
    console.error('❌ Dashboard booking update error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to update dashboard booking'
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    const fs = require('fs')
    const path = require('path')
    const bookingsFile = path.join(process.cwd(), 'lib', '.bookings.json')
    
    let bookings = []
    try {
      if (fs.existsSync(bookingsFile)) {
        const data = fs.readFileSync(bookingsFile, 'utf8')
        bookings = JSON.parse(data)
        console.log(`📊 Found ${bookings.length} bookings in local file`)
      } else {
        console.log('📝 No bookings file found, returning empty array')
      }
    } catch (error) {
      console.log('📝 Error reading bookings file:', error)
    }

    return NextResponse.json({
      success: true,
      bookings
    })

  } catch (error) {
    console.error('❌ Failed to get bookings:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to get bookings'
    }, { status: 500 })
  }
}
