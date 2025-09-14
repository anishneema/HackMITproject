import { useDashboardStore } from './dashboard-store'

let sampleDataAdded = false

export function addSampleEvents() {
  if (sampleDataAdded) {
    console.log('Sample data already added, skipping...')
    return
  }

  const store = useDashboardStore.getState()

  // Check if events already exist
  if (store.events.length > 0) {
    console.log('Events already exist in store, skipping sample data')
    sampleDataAdded = true
    return
  }

  // Add some sample events
  const sampleEvents = [
    {
      name: "Community Center Blood Drive",
      date: "2025-09-20",
      time: "9:00 AM - 3:00 PM",
      targetDonors: 50,
      currentRSVPs: 12,
      venue: "Downtown Community Center",
      status: 'active' as const
    },
    {
      name: "University Campus Drive",
      date: "2025-09-25",
      time: "10:00 AM - 4:00 PM",
      targetDonors: 75,
      currentRSVPs: 8,
      venue: "State University Student Center",
      status: 'active' as const
    },
    {
      name: "Corporate Office Drive",
      date: "2025-10-02",
      time: "11:00 AM - 2:00 PM",
      targetDonors: 30,
      currentRSVPs: 5,
      venue: "TechCorp Main Office",
      status: 'active' as const
    }
  ]

  sampleEvents.forEach(event => {
    store.addEvent(event)
  })

  // Simulate some email activity
  store.onEmailSent('sample-event-1', 25)
  store.onEmailOpened('sample-event-1', 15)
  store.onEmailReplied('sample-event-1', {
    sentiment: 'positive',
    participantEmail: 'participant@example.com',
    content: 'I would love to participate!'
  })

  // Add some sample bookings
  store.onBookingReceived('sample-event-1', {
    participantEmail: 'sarah.johnson@example.com',
    participantName: 'Sarah Johnson',
    eventDate: new Date('2025-09-20')
  })

  sampleDataAdded = true
  console.log('Sample data added to dashboard')
}