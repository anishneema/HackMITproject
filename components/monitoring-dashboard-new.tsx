"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Bot, Mail, MessageSquare, Users, MapPin, CheckCircle, Clock, AlertTriangle, TrendingUp, Calendar, Target } from "lucide-react"
import { useDashboardStore } from "@/lib/dashboard-store"

export function MonitoringDashboard() {
  const { events, campaigns, bookings, getDashboardTotals, addEvent } = useDashboardStore()
  const totals = getDashboardTotals()

  console.log("MonitoringDashboard render - events:", events)
  console.log("MonitoringDashboard render - totals:", totals)

  const handleTestEvent = () => {
    console.log("Creating test event...")
    addEvent({
      name: "Test Event for Sept 22nd",
      date: "September 22nd",
      time: "10:00 AM",
      targetDonors: 50,
      currentRSVPs: 0,
      venue: "Test Venue",
      status: "active",
      emailsSent: 0,
      emailsOpened: 0,
      emailsReplied: 0
    })
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      active: "bg-green-100 text-green-800",
      draft: "bg-yellow-100 text-yellow-800",
      completed: "bg-blue-100 text-blue-800",
      cancelled: "bg-red-100 text-red-800"
    }
    return variants[status as keyof typeof variants] || "bg-gray-100 text-gray-800"
  }

  const activeEvents = events.filter(e => e.status === 'active')
  const draftEvents = events.filter(e => e.status === 'draft')

  return (
    <div className="space-y-6">
      {/* Debug Test Button */}
      <Card>
        <CardContent className="p-4">
          <Button onClick={handleTestEvent} variant="outline">
            🧪 Test: Create Event for Sept 22nd
          </Button>
        </CardContent>
      </Card>

      {/* Dashboard Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.totalEvents}</div>
            <p className="text-xs text-muted-foreground">
              {totals.activeEvents} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Emails Sent</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.totalEmailsSent}</div>
            <p className="text-xs text-muted-foreground">
              {totals.averageResponseRate > 0 ? `${(totals.averageResponseRate * 100).toFixed(1)}% response rate` : 'No campaigns yet'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Volunteers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.totalBookings}</div>
            <p className="text-xs text-muted-foreground">
              Confirmed bookings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Actions</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.recentActivity.length}</div>
            <p className="text-xs text-muted-foreground">
              Recent activities
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Events Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Blood Drive Events</CardTitle>
            <CardDescription>All scheduled events and their status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {events.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No events yet. Ask the AI to create your first blood drive!
                </p>
              ) : (
                events.map((event) => (
                  <div key={event.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{event.name}</h4>
                        <Badge className={getStatusBadge(event.status)}>
                          {event.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {event.date} at {event.time}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        📍 {event.venue}
                      </p>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="text-sm">
                        <span className="font-medium">{event.currentRSVPs}</span>
                        <span className="text-muted-foreground">/{event.targetDonors}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {event.emailsSent || 0} emails sent
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent AI Activity</CardTitle>
            <CardDescription>Automated actions and updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {totals.recentActivity.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No recent activity. Start chatting with the AI assistant!
                </p>
              ) : (
                totals.recentActivity.slice(0, 5).map((activity, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                    <div className="flex-shrink-0 mt-1">
                      {activity.type === 'email_sent' && <Mail className="h-4 w-4 text-blue-500" />}
                      {activity.type === 'email_replied' && <MessageSquare className="h-4 w-4 text-green-500" />}
                      {activity.type === 'booking_received' && <Users className="h-4 w-4 text-purple-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium capitalize">
                        {activity.type.replace('_', ' ')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {activity.eventName} - {activity.details}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(activity.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Email Campaigns */}
      {campaigns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Email Campaigns</CardTitle>
            <CardDescription>Active and completed outreach campaigns</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {campaigns.map((campaign) => (
                <div key={campaign.id} className="p-4 border rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">{campaign.name}</h4>
                    <Badge className={getStatusBadge(campaign.status)}>
                      {campaign.status}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span>Sent:</span>
                      <span>{campaign.totalSent}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Opened:</span>
                      <span>{campaign.opened}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Replied:</span>
                      <span>{campaign.replied}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Response Rate:</span>
                      <span>{(campaign.responseRate * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}