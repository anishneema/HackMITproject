"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Bot, Mail, MessageSquare, Users, MapPin, CheckCircle, Clock, AlertTriangle, TrendingUp } from "lucide-react"

export function MonitoringDashboard() {
  const aiActivities = [
    {
      id: 1,
      action: "Venue Research Completed",
      details: "Found 8 suitable venues, sent 3 booking requests",
      timestamp: "2 minutes ago",
      status: "completed",
      type: "venue",
    },
    {
      id: 2,
      action: "Email Campaign Launched",
      details: "Sent 247 personalized invitations to registered donors",
      timestamp: "15 minutes ago",
      status: "active",
      type: "email",
    },
    {
      id: 3,
      action: "RSVP Follow-up Scheduled",
      details: "Automated reminders set for 72 non-responders",
      timestamp: "1 hour ago",
      status: "scheduled",
      type: "followup",
    },
    {
      id: 4,
      action: "Venue Confirmation Received",
      details: "Community Center confirmed for Dec 16, contract sent",
      timestamp: "2 hours ago",
      status: "completed",
      type: "venue",
    },
  ]

  const campaignMetrics = [
    { label: "Emails Sent", value: 247, change: "+12%", icon: Mail },
    { label: "SMS Sent", value: 189, change: "+8%", icon: MessageSquare },
    { label: "Responses", value: 156, change: "+24%", icon: Users },
    { label: "RSVPs", value: 89, change: "+18%", icon: CheckCircle },
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
                <span className="text-sm font-medium">Email Open Rate</span>
                <span className="text-sm text-muted-foreground">68%</span>
              </div>
              <Progress value={68} className="h-2" />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Click-through Rate</span>
                <span className="text-sm text-muted-foreground">42%</span>
              </div>
              <Progress value={42} className="h-2" />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">RSVP Conversion</span>
                <span className="text-sm text-muted-foreground">36%</span>
              </div>
              <Progress value={36} className="h-2" />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">SMS Response Rate</span>
                <span className="text-sm text-muted-foreground">24%</span>
              </div>
              <Progress value={24} className="h-2" />
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
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium">Community Center Drive</h4>
                <p className="text-sm text-muted-foreground">Dec 16, 2024</p>
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Invites Sent:</span>
                    <span>89</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>RSVPs:</span>
                    <span className="text-green-600">23</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Conversion:</span>
                    <span>26%</span>
                  </div>
                </div>
              </div>

              <div className="p-4 border rounded-lg">
                <h4 className="font-medium">University Campus Drive</h4>
                <p className="text-sm text-muted-foreground">Dec 18, 2024</p>
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Invites Sent:</span>
                    <span>124</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>RSVPs:</span>
                    <span className="text-green-600">42</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Conversion:</span>
                    <span>34%</span>
                  </div>
                </div>
              </div>

              <div className="p-4 border rounded-lg">
                <h4 className="font-medium">Corporate Office Drive</h4>
                <p className="text-sm text-muted-foreground">Dec 20, 2024</p>
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Invites Sent:</span>
                    <span>67</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>RSVPs:</span>
                    <span className="text-green-600">18</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Conversion:</span>
                    <span>27%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
