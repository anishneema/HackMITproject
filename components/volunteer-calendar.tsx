"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Calendar, ChevronLeft, ChevronRight, Clock, Users, MapPin, Phone, Mail, MessageSquare, RefreshCw } from "lucide-react"
import { useDashboardStore } from "@/lib/dashboard-store"
import { apiService, APIVolunteer } from "@/lib/api-service"

export function VolunteerCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [volunteers, setVolunteers] = useState<APIVolunteer[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const bookings = useDashboardStore((state) => state.bookings)
  const dashboardEvents = useDashboardStore((state) => state.events)

  // Load volunteers from API
  useEffect(() => {
    const loadVolunteers = async () => {
      try {
        setIsLoading(true)
        const apiVolunteers = await apiService.getVolunteers()
        setVolunteers(apiVolunteers)
      } catch (error) {
        console.error('Failed to load volunteers:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadVolunteers()
  }, [])

  // Generate events from volunteer shifts dynamically
  const generateEventsFromVolunteers = (volunteers: APIVolunteer[]) => {
    const eventMap = new Map()

    volunteers.forEach(volunteer => {
      volunteer.shifts.forEach(shift => {
        if (!eventMap.has(shift.date)) {
          eventMap.set(shift.date, {
            date: shift.date,
            name: shift.event,
            location: getLocationForEvent(shift.event),
            volunteers: []
          })
        }
        eventMap.get(shift.date).volunteers.push(volunteer)
      })
    })

    return Array.from(eventMap.values())
  }

  const getLocationForEvent = (eventName: string) => {
    const locationMap: { [key: string]: string } = {
      "Community Center Drive": "Community Center Hall",
      "University Campus Drive": "University Student Center",
      "Corporate Office Drive": "TechCorp Headquarters",
      "Mall Plaza Drive": "Central Mall Atrium",
      "Tech Campus Drive": "Innovation Tech Campus"
    }
    return locationMap[eventName] || "Location TBD"
  }

  // Generate events dynamically from volunteer data
  const volunteerEvents = generateEventsFromVolunteers(volunteers)
  
  // Combine volunteer events with dashboard events
  const allEvents = [...volunteerEvents]
  
  // Add dashboard events that don't conflict with volunteer events
  dashboardEvents.forEach(dashboardEvent => {
    const existingEvent = volunteerEvents.find(event => event.date === dashboardEvent.date)
    if (!existingEvent) {
      allEvents.push({
        date: dashboardEvent.date,
        name: dashboardEvent.name,
        location: dashboardEvent.venue,
        volunteers: [],
        isDashboardEvent: true
      })
    }
  })
  
  const events = allEvents

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day)
    }

    return days
  }

  const getEventForDate = (day: number) => {
    if (!day) return null
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    
    // First check for volunteer events
    const volunteerEvent = events.find((event) => event.date === dateStr)
    if (volunteerEvent) return volunteerEvent
    
    // Then check for dashboard events
    const dashboardEvent = dashboardEvents.find((event) => event.date === dateStr)
    if (dashboardEvent) {
      return {
        date: dateStr,
        name: dashboardEvent.name,
        location: dashboardEvent.venue,
        volunteers: [], // Dashboard events don't have volunteers yet
        isDashboardEvent: true // Flag to distinguish from volunteer events
      }
    }
    
    return null
  }

  const handleDateClick = (day: number) => {
    if (!day) return
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    setSelectedDate(dateStr)
    setIsModalOpen(true)
  }

  const getSelectedEventDetails = () => {
    if (!selectedDate) return null
    const event = events.find((event) => event.date === selectedDate)
    if (!event) return null

    // Get all volunteer shifts for this date with more details
    const volunteerShifts = volunteers
      .filter(volunteer => volunteer.shifts.some(shift => shift.date === selectedDate))
      .map(volunteer => {
        const shift = volunteer.shifts.find(s => s.date === selectedDate)
        return {
          ...volunteer,
          shiftTime: shift?.time,
          shiftEvent: shift?.event
        }
      })

    return {
      ...event,
      volunteerShifts,
      formattedDate: new Date(selectedDate).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    }
  }

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev)
      if (direction === "prev") {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Volunteer Schedule
              </CardTitle>
              <CardDescription>Track volunteer assignments and shifts across all blood drives</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigateMonth("prev")}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h3 className="text-lg font-semibold min-w-[140px] text-center">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h3>
              <Button variant="outline" size="sm" onClick={() => navigateMonth("next")}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 mb-4">
            {dayNames.map((day) => (
              <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {getDaysInMonth(currentDate).map((day, index) => {
              const event = getEventForDate(day)
              return (
                <div
                  key={index}
                  className={`min-h-[100px] p-2 border rounded-lg cursor-pointer transition-all duration-200 ${
                    day ? "bg-card hover:bg-accent/50 hover:shadow-md" : "bg-muted/20"
                  } ${event ? "border-primary/50 bg-primary/5 hover:bg-primary/10" : "border-border"}`}
                  onClick={() => handleDateClick(day)}
                >
                  {day && (
                    <>
                      <div className="text-sm font-medium mb-1">{day}</div>
                      {event && (
                        <div className="space-y-1">
                          <Badge variant={event.isDashboardEvent ? "default" : "secondary"} className="text-xs">
                            {event.isDashboardEvent ? event.name : `${event.name.split(" ")[0]} Drive`}
                          </Badge>
                          <div className="flex -space-x-1">
                            {event.volunteers.slice(0, 3).map((volunteer) => (
                              <Avatar key={volunteer.id} className="h-6 w-6 border-2 border-background">
                                <AvatarImage src={volunteer.avatar || "/placeholder.svg"} />
                                <AvatarFallback className="text-xs">
                                  {volunteer.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")}
                                </AvatarFallback>
                              </Avatar>
                            ))}
                            {event.volunteers.length > 3 && (
                              <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                                <span className="text-xs">+{event.volunteers.length - 3}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Shifts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Upcoming Shifts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {events.map((event) => (
              <div key={event.date} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">{event.name}</h4>
                  <Badge variant="outline">{new Date(event.date).toLocaleDateString()}</Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {event.location}
                </div>
                <div className="space-y-2">
                  {event.volunteers.map((volunteer) => {
                    const shift = volunteer.shifts.find((s) => s.date === event.date)
                    return (
                      <div key={volunteer.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={volunteer.avatar || "/placeholder.svg"} />
                            <AvatarFallback>
                              {volunteer.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{volunteer.name}</p>
                            <p className="text-xs text-muted-foreground">{volunteer.role}</p>
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {shift?.time}
                        </Badge>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Volunteer Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <RefreshCw className="h-6 w-6 animate-spin" />
              </div>
            ) : volunteers.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No volunteers found. Add volunteers to see them here.
              </p>
            ) : (
              volunteers.map((volunteer) => (
                <div key={volunteer.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={volunteer.avatar || "/placeholder.svg"} />
                      <AvatarFallback>
                        {volunteer.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{volunteer.name}</p>
                      <p className="text-sm text-muted-foreground">{volunteer.role}</p>
                      {volunteer.email && (
                        <p className="text-xs text-muted-foreground">{volunteer.email}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{volunteer.shifts.length} shifts</p>
                    <p className="text-xs text-muted-foreground">This month</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Email RSVPs powered by AgentMail */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Email RSVPs
            </CardTitle>
            <CardDescription>
              Recent confirmations received via email (powered by AgentMail)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {bookings.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No email RSVPs received yet
              </p>
            ) : (
              <div className="space-y-4">
                {bookings.slice(0, 5).map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {booking.participantName.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{booking.participantName}</p>
                        <p className="text-xs text-muted-foreground">{booking.participantEmail}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary" className="text-xs">
                        {booking.eventDate.toLocaleDateString()}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        via {booking.source}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Event Details Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Event Details
            </DialogTitle>
            <DialogDescription>
              Detailed information about the selected date
            </DialogDescription>
          </DialogHeader>
          
          {(() => {
            const eventDetails = getSelectedEventDetails()
            if (!eventDetails) {
              return (
                <div className="py-8 text-center text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No Event Scheduled</h3>
                  <p>There are no blood drive events scheduled for {eventDetails?.formattedDate || selectedDate}</p>
                </div>
              )
            }

            return (
              <div className="space-y-6">
                {/* Event Header */}
                <div className="bg-primary/5 p-4 rounded-lg border">
                  <h3 className="text-xl font-semibold mb-2">{eventDetails.name}</h3>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {eventDetails.formattedDate}
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {eventDetails.location}
                    </div>
                  </div>
                </div>

                {/* Event Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-card p-3 rounded-lg border text-center">
                    <Users className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <div className="text-2xl font-bold">{eventDetails.volunteerShifts.length}</div>
                    <div className="text-xs text-muted-foreground">Volunteers</div>
                  </div>
                  <div className="bg-card p-3 rounded-lg border text-center">
                    <Clock className="h-6 w-6 mx-auto mb-2 text-secondary" />
                    <div className="text-2xl font-bold">{eventDetails.volunteerShifts.length}</div>
                    <div className="text-xs text-muted-foreground">Shifts</div>
                  </div>
                  <div className="bg-card p-3 rounded-lg border text-center">
                    <Badge variant="outline" className="text-lg px-3 py-1">
                      Active
                    </Badge>
                    <div className="text-xs text-muted-foreground mt-1">Status</div>
                  </div>
                  <div className="bg-card p-3 rounded-lg border text-center">
                    <div className="text-2xl font-bold text-green-600">100%</div>
                    <div className="text-xs text-muted-foreground">Coverage</div>
                  </div>
                </div>

                {/* Volunteer Schedule */}
                <div>
                  <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Volunteer Schedule
                  </h4>
                  <div className="space-y-3">
                    {eventDetails.volunteerShifts.map((volunteer) => (
                      <div key={volunteer.id} className="flex items-center justify-between p-3 bg-card border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={volunteer.avatar || "/placeholder.svg"} />
                            <AvatarFallback>
                              {volunteer.name.split(" ").map((n) => n[0]).join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{volunteer.name}</p>
                            <p className="text-sm text-muted-foreground">{volunteer.role}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="secondary" className="text-xs">
                            {volunteer.shiftTime}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Event Notes */}
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Event Notes</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• All volunteers have been confirmed</li>
                    <li>• Venue setup begins 2 hours before event start</li>
                    <li>• Parking available at the venue</li>
                    <li>• Refreshments will be provided for volunteers</li>
                  </ul>
                </div>
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>
    </div>
  )
}
