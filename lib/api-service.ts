'use client'

export interface APIEvent {
  id: string
  name: string
  date: string
  time: string
  targetDonors: number
  currentRSVPs: number
  venue: string
  status: 'draft' | 'active' | 'completed' | 'cancelled'
  emailsSent?: number
  emailsOpened?: number
  emailsReplied?: number
  lastEmailSent?: string
  createdAt: string
  updatedAt: string
}

export interface APICampaign {
  id: string
  eventId: string
  name: string
  totalSent: number
  opened: number
  replied: number
  bounced: number
  unsubscribed: number
  responseRate: number
  lastActivity: string
  status: 'draft' | 'sending' | 'completed' | 'paused'
  createdAt: string
  updatedAt: string
}

export interface APIBooking {
  id: string
  eventId: string
  participantEmail: string
  participantName: string
  bookingDate: string
  eventDate: string
  status: 'confirmed' | 'tentative' | 'cancelled'
  source: 'email_response' | 'direct_booking' | 'phone' | 'other'
  createdAt: string
  updatedAt: string
}

export interface APIActivity {
  id: string
  action: string
  details: string
  timestamp: string
  status: 'completed' | 'active' | 'scheduled' | 'failed'
  type: 'venue' | 'email' | 'followup' | 'volunteer' | 'sms' | 'ai_response' | 'booking' | 'campaign'
  eventId?: string
  createdAt: string
}

export interface APIVolunteer {
  id: string
  name: string
  role: string
  avatar?: string
  email?: string
  phone?: string
  shifts: Array<{
    date: string
    time: string
    event: string
    eventId?: string
  }>
  createdAt: string
  updatedAt: string
}

class APIService {
  private baseURL = '/api'

  // Events API
  async getEvents(): Promise<APIEvent[]> {
    const response = await fetch(`${this.baseURL}/events`)
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch events')
    }

    return data.events
  }

  async createEvent(eventData: Partial<APIEvent>): Promise<APIEvent> {
    const response = await fetch(`${this.baseURL}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventData)
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to create event')
    }

    return data.event
  }

  async updateEvent(id: string, updates: Partial<APIEvent>): Promise<APIEvent> {
    const response = await fetch(`${this.baseURL}/events/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates)
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to update event')
    }

    return data.event
  }

  async deleteEvent(id: string): Promise<void> {
    const response = await fetch(`${this.baseURL}/events/${id}`, {
      method: 'DELETE'
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Failed to delete event')
    }
  }

  // Campaigns API
  async getCampaigns(): Promise<APICampaign[]> {
    const response = await fetch(`${this.baseURL}/campaigns`)
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch campaigns')
    }

    return data.campaigns
  }

  async createCampaign(campaignData: Partial<APICampaign>): Promise<APICampaign> {
    const response = await fetch(`${this.baseURL}/campaigns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(campaignData)
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to create campaign')
    }

    return data.campaign
  }

  // Bookings API
  async getBookings(): Promise<APIBooking[]> {
    const response = await fetch(`${this.baseURL}/bookings`)
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch bookings')
    }

    return data.bookings
  }

  async createBooking(bookingData: Partial<APIBooking>): Promise<APIBooking> {
    const response = await fetch(`${this.baseURL}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bookingData)
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to create booking')
    }

    return data.booking
  }

  // Activities API
  async getActivities(): Promise<APIActivity[]> {
    const response = await fetch(`${this.baseURL}/activities`)
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch activities')
    }

    return data.activities
  }

  async createActivity(activityData: Partial<APIActivity>): Promise<APIActivity> {
    const response = await fetch(`${this.baseURL}/activities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(activityData)
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to create activity')
    }

    return data.activity
  }

  // Metrics API
  async getMetricsChanges(): Promise<{ emailsSent: string; responseRate: string; activeEvents: string; totalBookings: string }> {
    const response = await fetch(`${this.baseURL}/metrics`)
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch metrics changes')
    }

    return data.changes
  }

  // Volunteers API
  async getVolunteers(): Promise<APIVolunteer[]> {
    const response = await fetch(`${this.baseURL}/volunteers`)
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch volunteers')
    }

    return data.volunteers
  }

  async createVolunteer(volunteerData: Partial<APIVolunteer>): Promise<APIVolunteer> {
    const response = await fetch(`${this.baseURL}/volunteers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(volunteerData)
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to create volunteer')
    }

    return data.volunteer
  }
}

export const apiService = new APIService()