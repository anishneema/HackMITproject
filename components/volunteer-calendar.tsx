"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Calendar, ChevronLeft, ChevronRight, Clock, Users, MapPin } from "lucide-react"

export function VolunteerCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date())

  // Sample volunteer data
  const volunteers = [
    {
      id: 1,
      name: "Sarah Johnson",
      role: "Nurse",
      avatar: "/placeholder.svg?height=32&width=32",
      shifts: [
        { date: "2024-12-16", time: "9:00 AM - 1:00 PM", event: "Community Center Drive" },
        { date: "2024-12-18", time: "10:00 AM - 2:00 PM", event: "University Campus Drive" },
      ],
    },
    {
      id: 2,
      name: "Mike Chen",
      role: "Registration",
      avatar: "/placeholder.svg?height=32&width=32",
      shifts: [
        { date: "2024-12-16", time: "8:30 AM - 12:30 PM", event: "Community Center Drive" },
        { date: "2024-12-20", time: "12:00 PM - 4:00 PM", event: "Corporate Office Drive" },
      ],
    },
    {
      id: 3,
      name: "Emily Rodriguez",
      role: "Phlebotomist",
      avatar: "/placeholder.svg?height=32&width=32",
      shifts: [
        { date: "2024-12-16", time: "9:00 AM - 1:00 PM", event: "Community Center Drive" },
        { date: "2024-12-18", time: "10:00 AM - 2:00 PM", event: "University Campus Drive" },
        { date: "2024-12-20", time: "1:00 PM - 5:00 PM", event: "Corporate Office Drive" },
      ],
    },
    {
      id: 4,
      name: "David Park",
      role: "Setup Crew",
      avatar: "/placeholder.svg?height=32&width=32",
      shifts: [
        { date: "2024-12-16", time: "7:00 AM - 11:00 AM", event: "Community Center Drive" },
        { date: "2024-12-18", time: "8:00 AM - 12:00 PM", event: "University Campus Drive" },
      ],
    },
  ]

  const events = [
    {
      date: "2024-12-16",
      name: "Community Center Drive",
      location: "Community Center",
      volunteers: volunteers.filter((v) => v.shifts.some((s) => s.date === "2024-12-16")),
    },
    {
      date: "2024-12-18",
      name: "University Campus Drive",
      location: "University Campus",
      volunteers: volunteers.filter((v) => v.shifts.some((s) => s.date === "2024-12-18")),
    },
    {
      date: "2024-12-20",
      name: "Corporate Office Drive",
      location: "Corporate Office",
      volunteers: volunteers.filter((v) => v.shifts.some((s) => s.date === "2024-12-20")),
    },
  ]

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
    return events.find((event) => event.date === dateStr)
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
                  className={`min-h-[100px] p-2 border rounded-lg ${
                    day ? "bg-card hover:bg-accent/50" : "bg-muted/20"
                  } ${event ? "border-primary/50 bg-primary/5" : "border-border"}`}
                >
                  {day && (
                    <>
                      <div className="text-sm font-medium mb-1">{day}</div>
                      {event && (
                        <div className="space-y-1">
                          <Badge variant="secondary" className="text-xs">
                            {event.name.split(" ")[0]} Drive
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
            {volunteers.map((volunteer) => (
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
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{volunteer.shifts.length} shifts</p>
                  <p className="text-xs text-muted-foreground">This month</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
