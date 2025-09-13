"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import { Progress } from "@/components/ui/progress"
import { Mail, MessageSquare, Users, Send, Eye, Calendar, Phone, Plus, Edit, Target, TrendingUp } from "lucide-react"

interface Campaign {
  id: number
  name: string
  type: "email" | "sms" | "both"
  status: "draft" | "scheduled" | "sent" | "active"
  event: string
  recipients: number
  sent: number
  opened: number
  clicked: number
  rsvps: number
  scheduledDate?: string
  createdDate: string
}

interface Donor {
  id: number
  name: string
  email: string
  phone: string
  lastDonation: string
  totalDonations: number
  preferredContact: "email" | "sms" | "both"
  status: "active" | "inactive" | "opted-out"
  tags: string[]
}

export function OutreachManagement() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([
    {
      id: 1,
      name: "Community Center Drive Invitation",
      type: "email",
      status: "sent",
      event: "Community Center Drive",
      recipients: 250,
      sent: 250,
      opened: 187,
      clicked: 89,
      rsvps: 23,
      createdDate: "Dec 10, 2024",
    },
    {
      id: 2,
      name: "University Campus Reminder",
      type: "both",
      status: "scheduled",
      event: "University Campus Drive",
      recipients: 180,
      sent: 0,
      opened: 0,
      clicked: 0,
      rsvps: 0,
      scheduledDate: "Dec 15, 2024",
      createdDate: "Dec 12, 2024",
    },
    {
      id: 3,
      name: "Holiday Drive Follow-up",
      type: "sms",
      status: "draft",
      event: "Holiday Blood Drive",
      recipients: 150,
      sent: 0,
      opened: 0,
      clicked: 0,
      rsvps: 0,
      createdDate: "Dec 13, 2024",
    },
  ])

  const [donors, setDonors] = useState<Donor[]>([
    {
      id: 1,
      name: "Sarah Johnson",
      email: "sarah.j@email.com",
      phone: "(555) 123-4567",
      lastDonation: "Nov 15, 2024",
      totalDonations: 8,
      preferredContact: "email",
      status: "active",
      tags: ["Regular Donor", "O+"],
    },
    {
      id: 2,
      name: "Michael Chen",
      email: "m.chen@email.com",
      phone: "(555) 987-6543",
      lastDonation: "Oct 22, 2024",
      totalDonations: 12,
      preferredContact: "both",
      status: "active",
      tags: ["Frequent Donor", "AB-", "University"],
    },
    {
      id: 3,
      name: "Jennifer Martinez",
      email: "j.martinez@email.com",
      phone: "(555) 456-7890",
      lastDonation: "Sep 8, 2024",
      totalDonations: 5,
      preferredContact: "sms",
      status: "active",
      tags: ["New Donor", "A+"],
    },
  ])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "sent":
        return "bg-green-100 text-green-800"
      case "scheduled":
        return "bg-blue-100 text-blue-800"
      case "active":
        return "bg-orange-100 text-orange-800"
      case "draft":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "email":
        return <Mail className="h-4 w-4" />
      case "sms":
        return <MessageSquare className="h-4 w-4" />
      case "both":
        return <Users className="h-4 w-4" />
      default:
        return <Mail className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="campaigns" className="space-y-4">
        <TabsList>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="donors">Donor Database</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Campaign Management</h3>
              <p className="text-sm text-muted-foreground">Create and manage donor outreach campaigns</p>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Campaign
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Campaign</DialogTitle>
                  <DialogDescription>Set up a new outreach campaign for donors</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="campaignName">Campaign Name</Label>
                      <Input id="campaignName" placeholder="Holiday Drive Invitation" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="event">Associated Event</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select event" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="community">Community Center Drive</SelectItem>
                          <SelectItem value="university">University Campus Drive</SelectItem>
                          <SelectItem value="corporate">Corporate Office Drive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="type">Campaign Type</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="email">Email Only</SelectItem>
                          <SelectItem value="sms">SMS Only</SelectItem>
                          <SelectItem value="both">Email + SMS</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="audience">Target Audience</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select audience" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Donors</SelectItem>
                          <SelectItem value="regular">Regular Donors</SelectItem>
                          <SelectItem value="lapsed">Lapsed Donors</SelectItem>
                          <SelectItem value="new">New Donors</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject Line</Label>
                    <Input id="subject" placeholder="Your Community Needs You - Blood Drive This Saturday" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      placeholder="Dear [Name], We're hosting a blood drive this Saturday..."
                      rows={4}
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1 bg-transparent">
                      Save as Draft
                    </Button>
                    <Button className="flex-1">Schedule Campaign</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {campaigns.map((campaign) => (
              <Card key={campaign.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {getTypeIcon(campaign.type)}
                      <div>
                        <CardTitle className="text-base">{campaign.name}</CardTitle>
                        <CardDescription className="text-sm">{campaign.event}</CardDescription>
                      </div>
                    </div>
                    <Badge className={getStatusColor(campaign.status)}>{campaign.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Recipients</p>
                      <p className="font-medium">{campaign.recipients}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">RSVPs</p>
                      <p className="font-medium text-primary">{campaign.rsvps}</p>
                    </div>
                  </div>

                  {campaign.status === "sent" && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Open Rate</span>
                        <span>{Math.round((campaign.opened / campaign.sent) * 100)}%</span>
                      </div>
                      <Progress value={(campaign.opened / campaign.sent) * 100} className="h-2" />
                    </div>
                  )}

                  {campaign.scheduledDate && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>Scheduled: {campaign.scheduledDate}</span>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button size="sm" className="flex-1">
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="donors" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Donor Database</h3>
              <p className="text-sm text-muted-foreground">Manage donor contacts and preferences</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">Import Donors</Button>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Donor
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {donors.map((donor) => (
              <Card key={donor.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{donor.name}</CardTitle>
                      <CardDescription>{donor.totalDonations} donations</CardDescription>
                    </div>
                    <Badge variant={donor.status === "active" ? "default" : "secondary"}>{donor.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{donor.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{donor.phone}</span>
                    </div>
                  </div>

                  <div className="text-sm">
                    <p className="text-muted-foreground">Last Donation:</p>
                    <p className="font-medium">{donor.lastDonation}</p>
                  </div>

                  <div className="text-sm">
                    <p className="text-muted-foreground">Prefers:</p>
                    <p className="font-medium capitalize">{donor.preferredContact}</p>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {donor.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button size="sm" className="flex-1">
                      <Send className="h-4 w-4 mr-1" />
                      Contact
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Message Templates</h3>
              <p className="text-sm text-muted-foreground">Pre-built templates for common campaigns</p>
            </div>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Template
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Blood Drive Invitation</CardTitle>
                <CardDescription>Standard invitation template</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <p className="font-medium">Subject: Your Community Needs You - Blood Drive This [Date]</p>
                  <p className="text-muted-foreground">
                    Dear [Name], We're hosting a blood drive on [Date] at [Location]. Your donation can save up to three
                    lives...
                  </p>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" size="sm">
                    Preview
                  </Button>
                  <Button size="sm">Use Template</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Reminder Message</CardTitle>
                <CardDescription>24-hour reminder template</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <p className="font-medium">Subject: Reminder: Blood Drive Tomorrow at [Location]</p>
                  <p className="text-muted-foreground">
                    Hi [Name], Just a friendly reminder about tomorrow's blood drive at [Location] from [Time]...
                  </p>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" size="sm">
                    Preview
                  </Button>
                  <Button size="sm">Use Template</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Thank You Message</CardTitle>
                <CardDescription>Post-donation thank you</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <p className="font-medium">Subject: Thank You for Saving Lives Today!</p>
                  <p className="text-muted-foreground">
                    Dear [Name], Thank you for donating blood today at [Location]. Your generous donation will help save
                    lives...
                  </p>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" size="sm">
                    Preview
                  </Button>
                  <Button size="sm">Use Template</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Re-engagement Campaign</CardTitle>
                <CardDescription>For lapsed donors</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <p className="font-medium">Subject: We Miss You - Come Back and Save Lives</p>
                  <p className="text-muted-foreground">
                    Hi [Name], It's been a while since your last donation. The need for blood is constant...
                  </p>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" size="sm">
                    Preview
                  </Button>
                  <Button size="sm">Use Template</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Campaign Analytics</h3>
            <p className="text-sm text-muted-foreground">Track performance and engagement metrics</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Campaigns</p>
                    <p className="text-2xl font-bold text-primary">12</p>
                  </div>
                  <Send className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Open Rate</p>
                    <p className="text-2xl font-bold text-secondary">74%</p>
                  </div>
                  <Eye className="h-8 w-8 text-secondary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">RSVP Rate</p>
                    <p className="text-2xl font-bold text-accent">28%</p>
                  </div>
                  <Target className="h-8 w-8 text-accent" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Growth</p>
                    <p className="text-2xl font-bold text-green-600">+15%</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Campaign Performance</CardTitle>
                <CardDescription>Last 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {campaigns
                    .filter((c) => c.status === "sent")
                    .map((campaign) => (
                      <div key={campaign.id} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">{campaign.name}</span>
                          <span className="text-sm text-muted-foreground">
                            {campaign.rsvps}/{campaign.recipients} RSVPs
                          </span>
                        </div>
                        <Progress value={(campaign.rsvps / campaign.recipients) * 100} className="h-2" />
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Donor Engagement Trends</CardTitle>
                <CardDescription>Monthly comparison</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">December 2024</p>
                      <p className="text-sm text-muted-foreground">Current month</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-primary">89 RSVPs</p>
                      <p className="text-sm text-green-600">+12% vs last month</p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">November 2024</p>
                      <p className="text-sm text-muted-foreground">Previous month</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">79 RSVPs</p>
                      <p className="text-sm text-muted-foreground">Baseline</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
