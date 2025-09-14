"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Bot, Mail, MessageSquare, Users, MapPin, CheckCircle, Clock, AlertTriangle, TrendingUp, RefreshCw } from "lucide-react"
import { useDashboardData } from "@/lib/use-dashboard-data"
import { apiService } from "@/lib/api-service"

export function MonitoringDashboard() {
  const { events, campaigns, bookings, activities, isLoading, error, totals, initialized, refreshDashboard } = useDashboardData()
  const [metricsChanges, setMetricsChanges] = useState({
    emailsSent: '+0%',
    responseRate: '+0%',
    activeEvents: '+0%',
    totalBookings: '+0%'
  })

  // Load metrics changes
  useEffect(() => {
    if (initialized) {
      apiService.getMetricsChanges()
        .then(setMetricsChanges)
        .catch(error => console.error('Failed to load metrics changes:', error))
    }
  }, [initialized, totals])

  if (!initialized && isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Loading dashboard data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-2" />
          <p className="text-destructive mb-4">Error loading dashboard: {error}</p>
          <Button onClick={refreshDashboard} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    )
  }

  // Format activities for display
  const formatTimestamp = (timestamp: Date) => {
    const now = new Date()
    const diff = now.getTime() - timestamp.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`
    return `${days} day${days !== 1 ? 's' : ''} ago`
  }

  const aiActivities = activities.slice(0, 6).map(activity => ({
    ...activity,
    timestamp: formatTimestamp(activity.timestamp)
  }))

  const campaignMetrics = [
    { label: "Emails Sent", value: totals.totalEmailsSent, change: metricsChanges.emailsSent, icon: Mail },
    { label: "Response Rate", value: `${totals.averageResponseRate.toFixed(1)}%`, change: metricsChanges.responseRate, icon: MessageSquare },
    { label: "Active Events", value: totals.activeEvents, change: metricsChanges.activeEvents, icon: Users },
    { label: "Total Bookings", value: totals.totalBookings, change: metricsChanges.totalBookings, icon: CheckCircle },
  ]

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "active":
        return <Clock className="h-4 w-4 text-blue-600" />
      case "scheduled":
        return <Clock className="h-4 w-4 text-yellow-600" />
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-400" />
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "venue":
        return <MapPin className="h-4 w-4" />
      case "email":
        return <Mail className="h-4 w-4" />
      case "followup":
        return <MessageSquare className="h-4 w-4" />
      default:
        return <Bot className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-6">
      {/* AI Activity Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {campaignMetrics.map((metric) => (
          <Card key={metric.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{metric.label}</p>
                  <p className="text-2xl font-bold">{metric.value}</p>
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    {metric.change}
                  </p>
                </div>
                <metric.icon className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Actions Log */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              AI Actions Log
            </CardTitle>
            <CardDescription>Recent automated actions and their status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {aiActivities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    {getTypeIcon(activity.type)}
                    {getStatusIcon(activity.status)}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{activity.action}</p>
                    <p className="text-sm text-muted-foreground">{activity.details}</p>
                    <p className="text-xs text-muted-foreground mt-1">{activity.timestamp}</p>
                  </div>
                  <Badge variant={activity.status === "completed" ? "default" : "secondary"}>{activity.status}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Response Tracking */}
        <Card>
          <CardHeader>
            <CardTitle>Response Tracking</CardTitle>
            <CardDescription>Real-time donor engagement metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Total Emails Sent</span>
                <span className="text-sm text-muted-foreground">{totals.totalEmailsSent}</span>
              </div>
              <Progress value={Math.min(totals.totalEmailsSent, 100)} className="h-2" />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Response Rate</span>
                <span className="text-sm text-muted-foreground">{totals.averageResponseRate.toFixed(1)}%</span>
              </div>
              <Progress value={totals.averageResponseRate} className="h-2" />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Active Events</span>
                <span className="text-sm text-muted-foreground">{totals.activeEvents}</span>
              </div>
              <Progress value={Math.min(totals.activeEvents * 20, 100)} className="h-2" />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Total Bookings</span>
                <span className="text-sm text-muted-foreground">{totals.totalBookings}</span>
              </div>
              <Progress value={Math.min(totals.totalBookings * 10, 100)} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaign Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Performance</CardTitle>
          <CardDescription>Automated outreach effectiveness by event</CardDescription>
        </CardHeader>
        <CardContent>
          {events.length > 0 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {events.map((event) => {
                  const conversionRate = event.emailsSent > 0 ? 
                    ((event.emailsReplied || 0) / event.emailsSent * 100).toFixed(1) : '0'
                  
                  return (
                    <div key={event.id} className="p-4 border rounded-lg">
                      <h4 className="font-medium">{event.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {new Date(event.date).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}
                      </p>
                      <div className="mt-2 space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Invites Sent:</span>
                          <span>{event.emailsSent || 0}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>RSVPs:</span>
                          <span className="text-green-600">{event.currentRSVPs || 0}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Conversion:</span>
                          <span>{conversionRate}%</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Target Donors:</span>
                          <span>{event.targetDonors || 0}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Status:</span>
                          <span className={`px-2 py-1 rounded text-xs ${
                            event.status === 'active' ? 'bg-green-100 text-green-800' : 
                            event.status === 'completed' ? 'bg-blue-100 text-blue-800' : 
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {event.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              <p>No events created yet.</p>
              <p className="text-sm">Create your first blood drive event using the AI Assistant!</p>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  )
}
