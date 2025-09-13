"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { MapPin, Phone, Mail, Calendar, Plus, Edit, CheckCircle, Clock, AlertTriangle } from "lucide-react"

interface Venue {
  id: number
  name: string
  address: string
  contactPerson: string
  phone: string
  email: string
  capacity: number
  amenities: string[]
  status: "available" | "booked" | "unavailable"
  upcomingEvents: number
}

export function VenueManagement() {
  const [venues, setVenues] = useState<Venue[]>([
    {
      id: 1,
      name: "Community Center",
      address: "123 Main St, Springfield, IL 62701",
      contactPerson: "Sarah Johnson",
      phone: "(555) 123-4567",
      email: "sarah@communitycenter.org",
      capacity: 50,
      amenities: ["Parking", "Wheelchair Accessible", "Kitchen", "WiFi"],
      status: "booked",
      upcomingEvents: 2,
    },
    {
      id: 2,
      name: "University Student Center",
      address: "456 College Ave, Springfield, IL 62702",
      contactPerson: "Dr. Michael Chen",
      phone: "(555) 987-6543",
      email: "mchen@university.edu",
      capacity: 100,
      amenities: ["Parking", "Wheelchair Accessible", "AV Equipment", "Security"],
      status: "available",
      upcomingEvents: 0,
    },
    {
      id: 3,
      name: "Corporate Plaza",
      address: "789 Business Blvd, Springfield, IL 62703",
      contactPerson: "Jennifer Martinez",
      phone: "(555) 456-7890",
      email: "jmartinez@corpplaza.com",
      capacity: 75,
      amenities: ["Parking", "Security", "Catering", "WiFi"],
      status: "available",
      upcomingEvents: 1,
    },
  ])

  const [bookingRequests, setBookingRequests] = useState([
    {
      id: 1,
      venue: "Community Center",
      event: "Holiday Blood Drive",
      date: "Dec 23, 2024",
      time: "10:00 AM - 4:00 PM",
      status: "pending",
      requestedBy: "Maria Rodriguez",
    },
    {
      id: 2,
      venue: "University Student Center",
      event: "New Year Drive",
      date: "Jan 5, 2025",
      time: "9:00 AM - 3:00 PM",
      status: "approved",
      requestedBy: "David Kim",
    },
  ])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "available":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "booked":
        return <Clock className="h-4 w-4 text-orange-500" />
      case "unavailable":
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      default:
        return null
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-100 text-green-800"
      case "booked":
        return "bg-orange-100 text-orange-800"
      case "unavailable":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="venues" className="space-y-4">
        <TabsList>
          <TabsTrigger value="venues">Venue Directory</TabsTrigger>
          <TabsTrigger value="bookings">Booking Requests</TabsTrigger>
          <TabsTrigger value="calendar">Availability Calendar</TabsTrigger>
        </TabsList>

        <TabsContent value="venues" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Venue Directory</h3>
              <p className="text-sm text-muted-foreground">Manage blood drive locations</p>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Venue
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Venue</DialogTitle>
                  <DialogDescription>Register a new location for blood drives</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="venueName">Venue Name</Label>
                      <Input id="venueName" placeholder="Community Center" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="capacity">Capacity</Label>
                      <Input id="capacity" type="number" placeholder="50" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input id="address" placeholder="123 Main St, City, State 12345" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="contact">Contact Person</Label>
                      <Input id="contact" placeholder="John Smith" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input id="phone" placeholder="(555) 123-4567" />
                    </div>
                  </div>
                  <Button className="w-full">Add Venue</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {venues.map((venue) => (
              <Card key={venue.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">{venue.name}</CardTitle>
                    </div>
                    <div className="flex items-center gap-1">
                      {getStatusIcon(venue.status)}
                      <Badge className={getStatusColor(venue.status)}>{venue.status}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm text-muted-foreground">
                    <p>{venue.address}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{venue.contactPerson}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{venue.phone}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Capacity:</span>
                    <span className="font-medium">{venue.capacity} donors</span>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {venue.amenities.slice(0, 3).map((amenity) => (
                      <Badge key={amenity} variant="outline" className="text-xs">
                        {amenity}
                      </Badge>
                    ))}
                    {venue.amenities.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{venue.amenities.length - 3} more
                      </Badge>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button size="sm" className="flex-1">
                      <Calendar className="h-4 w-4 mr-1" />
                      Book
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="bookings" className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Booking Requests</h3>
            <p className="text-sm text-muted-foreground">Review and approve venue bookings</p>
          </div>

          <div className="space-y-4">
            {bookingRequests.map((request) => (
              <Card key={request.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{request.event}</h4>
                        <Badge variant={request.status === "approved" ? "default" : "secondary"}>
                          {request.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {request.venue} • {request.date} • {request.time}
                      </p>
                      <p className="text-xs text-muted-foreground">Requested by {request.requestedBy}</p>
                    </div>
                    {request.status === "pending" && (
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          Decline
                        </Button>
                        <Button size="sm">Approve</Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="calendar">
          <Card>
            <CardHeader>
              <CardTitle>Availability Calendar</CardTitle>
              <CardDescription>View venue availability and scheduled events</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Calendar view coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
