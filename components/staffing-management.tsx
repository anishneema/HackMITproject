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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Users, UserPlus, Calendar, Clock, Award, Phone, Mail, Plus, Edit } from "lucide-react"

interface Volunteer {
  id: number
  name: string
  email: string
  phone: string
  role: string
  certifications: string[]
  availability: string[]
  hoursThisMonth: number
  totalHours: number
  status: "active" | "inactive" | "training"
  avatar?: string
}

interface Shift {
  id: number
  event: string
  date: string
  time: string
  role: string
  volunteer?: string
  status: "open" | "filled" | "confirmed"
}

export function StaffingManagement() {
  const [volunteers, setVolunteers] = useState<Volunteer[]>([
    {
      id: 1,
      name: "Sarah Johnson",
      email: "sarah.j@email.com",
      phone: "(555) 123-4567",
      role: "Nurse",
      certifications: ["RN License", "CPR Certified", "Blood Collection"],
      availability: ["Monday", "Wednesday", "Saturday"],
      hoursThisMonth: 24,
      totalHours: 156,
      status: "active",
    },
    {
      id: 2,
      name: "Michael Chen",
      email: "m.chen@email.com",
      phone: "(555) 987-6543",
      role: "Registration",
      certifications: ["First Aid", "Customer Service"],
      availability: ["Tuesday", "Thursday", "Sunday"],
      hoursThisMonth: 16,
      totalHours: 89,
      status: "active",
    },
    {
      id: 3,
      name: "Jennifer Martinez",
      email: "j.martinez@email.com",
      phone: "(555) 456-7890",
      role: "Coordinator",
      certifications: ["Event Management", "CPR Certified"],
      availability: ["Monday", "Tuesday", "Wednesday", "Friday"],
      hoursThisMonth: 32,
      totalHours: 234,
      status: "active",
    },
    {
      id: 4,
      name: "David Kim",
      email: "d.kim@email.com",
      phone: "(555) 321-0987",
      role: "Setup Crew",
      certifications: ["Safety Training"],
      availability: ["Saturday", "Sunday"],
      hoursThisMonth: 8,
      totalHours: 45,
      status: "training",
    },
  ])

  const [shifts, setShifts] = useState<Shift[]>([
    {
      id: 1,
      event: "Community Center Drive",
      date: "Dec 16, 2024",
      time: "8:00 AM - 12:00 PM",
      role: "Nurse",
      volunteer: "Sarah Johnson",
      status: "confirmed",
    },
    {
      id: 2,
      event: "Community Center Drive",
      date: "Dec 16, 2024",
      time: "12:00 PM - 4:00 PM",
      role: "Nurse",
      status: "open",
    },
    {
      id: 3,
      event: "University Campus Drive",
      date: "Dec 18, 2024",
      time: "9:00 AM - 1:00 PM",
      role: "Registration",
      volunteer: "Michael Chen",
      status: "filled",
    },
    {
      id: 4,
      event: "University Campus Drive",
      date: "Dec 18, 2024",
      time: "1:00 PM - 5:00 PM",
      role: "Coordinator",
      status: "open",
    },
  ])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800"
      case "inactive":
        return "bg-gray-100 text-gray-800"
      case "training":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getShiftStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-red-100 text-red-800"
      case "filled":
        return "bg-yellow-100 text-yellow-800"
      case "confirmed":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="volunteers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="volunteers">Volunteers</TabsTrigger>
          <TabsTrigger value="shifts">Shift Management</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
        </TabsList>

        <TabsContent value="volunteers" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Volunteer Directory</h3>
              <p className="text-sm text-muted-foreground">Manage volunteer information and assignments</p>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Volunteer
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Volunteer</DialogTitle>
                  <DialogDescription>Register a new volunteer for blood drive events</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="volunteerName">Full Name</Label>
                      <Input id="volunteerName" placeholder="John Smith" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role">Role</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="nurse">Nurse</SelectItem>
                          <SelectItem value="registration">Registration</SelectItem>
                          <SelectItem value="coordinator">Coordinator</SelectItem>
                          <SelectItem value="setup">Setup Crew</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" placeholder="john@email.com" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input id="phone" placeholder="(555) 123-4567" />
                    </div>
                  </div>
                  <Button className="w-full">Add Volunteer</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {volunteers.map((volunteer) => (
              <Card key={volunteer.id}>
                <CardHeader className="pb-3">
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
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{volunteer.name}</h4>
                        <Badge className={getStatusColor(volunteer.status)}>{volunteer.status}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{volunteer.role}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{volunteer.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{volunteer.phone}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">This Month:</span>
                      <span className="font-medium">{volunteer.hoursThisMonth}h</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Total Hours:</span>
                      <span className="font-medium">{volunteer.totalHours}h</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Certifications:</p>
                    <div className="flex flex-wrap gap-1">
                      {volunteer.certifications.slice(0, 2).map((cert) => (
                        <Badge key={cert} variant="outline" className="text-xs">
                          <Award className="h-3 w-3 mr-1" />
                          {cert}
                        </Badge>
                      ))}
                      {volunteer.certifications.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{volunteer.certifications.length - 2}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button size="sm" className="flex-1">
                      <Calendar className="h-4 w-4 mr-1" />
                      Assign
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="shifts" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Shift Management</h3>
              <p className="text-sm text-muted-foreground">Assign volunteers to event shifts</p>
            </div>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Shift
            </Button>
          </div>

          <div className="space-y-4">
            {shifts.map((shift) => (
              <Card key={shift.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{shift.event}</h4>
                        <Badge className={getShiftStatusColor(shift.status)}>{shift.status}</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {shift.date}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {shift.time}
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {shift.role}
                        </div>
                      </div>
                      {shift.volunteer && (
                        <p className="text-sm font-medium text-primary">Assigned to: {shift.volunteer}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {shift.status === "open" && <Button size="sm">Assign Volunteer</Button>}
                      {shift.status === "filled" && (
                        <Button size="sm" variant="outline">
                          Confirm
                        </Button>
                      )}
                      {shift.status === "confirmed" && (
                        <Button size="sm" variant="outline">
                          Reassign
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="schedule">
          <Card>
            <CardHeader>
              <CardTitle>Volunteer Schedule</CardTitle>
              <CardDescription>View upcoming assignments and availability</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Schedule view coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
