const fs = require('fs')
const path = require('path')

const BOOKINGS_FILE = path.join(__dirname, '.bookings.json')

class BookingsStorage {
  constructor() {
    this.bookings = this.loadBookings()
  }

  loadBookings() {
    try {
      if (fs.existsSync(BOOKINGS_FILE)) {
        const data = fs.readFileSync(BOOKINGS_FILE, 'utf8')
        return JSON.parse(data)
      }
    } catch (error) {
      console.log('📝 Creating new bookings file')
    }
    return []
  }

  saveBookings() {
    try {
      fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(this.bookings, null, 2))
    } catch (error) {
      console.error('❌ Error saving bookings:', error)
    }
  }

  addBooking(bookingData) {
    const booking = {
      id: `booking-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...bookingData,
      createdAt: new Date().toISOString()
    }
    
    this.bookings.push(booking)
    this.saveBookings()
    
    console.log('✅ Booking added to storage:', booking.id)
    return booking
  }

  getBookings() {
    return this.bookings
  }

  getBookingsByEventId(eventId) {
    return this.bookings.filter(booking => booking.eventId === eventId)
  }

  getRecentBookings(limit = 10) {
    return this.bookings
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit)
  }
}

module.exports = new BookingsStorage()
