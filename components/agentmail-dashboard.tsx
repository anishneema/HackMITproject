'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Mail,
  Send,
  Calendar,
  Clock,
  User,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react'
import { agentMailService, EmailThread, EmailMessage, CalendarEvent } from '@/lib/agent-mail-service'
import { useDashboardStore } from '@/lib/dashboard-store'

export function AgentMailDashboard() {
  const [isInitialized, setIsInitialized] = useState(false)
  const [emailThreads, setEmailThreads] = useState<EmailThread[]>([])
  const [selectedThread, setSelectedThread] = useState<EmailThread | null>(null)
  const [threadMessages, setThreadMessages] = useState<EmailMessage[]>([])
  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([])
  const [replyContent, setReplyContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('inbox')

  const store = useDashboardStore()
  const dashboardData = store.getDashboardTotals()

  useEffect(() => {
    const initializeAgentMail = async () => {
      try {
        // Initialize AgentMail with API key from environment
        agentMailService.initialize()
        setIsInitialized(agentMailService.isReady())

        if (agentMailService.isReady()) {
          await loadInboxThreads()
          await loadUpcomingEvents()
        }
      } catch (error) {
        console.error('Failed to initialize AgentMail:', error)
      }
    }

    initializeAgentMail()
  }, [])

  const loadInboxThreads = async () => {
    setLoading(true)
    try {
      const threads = await agentMailService.getInboxThreads(20)
      setEmailThreads(threads)
    } catch (error) {
      console.error('Failed to load inbox threads:', error)
    }
    setLoading(false)
  }

  const loadThreadMessages = async (thread: EmailThread) => {
    setSelectedThread(thread)
    setLoading(true)
    try {
      const messages = await agentMailService.getEmailMessages(thread.id)
      setThreadMessages(messages)
    } catch (error) {
      console.error('Failed to load thread messages:', error)
    }
    setLoading(false)
  }

  const loadUpcomingEvents = async () => {
    try {
      const events = await agentMailService.getUpcomingEvents()
      setUpcomingEvents(events)
    } catch (error) {
      console.error('Failed to load upcoming events:', error)
    }
  }

  const handleSendReply = async () => {
    if (!selectedThread || !replyContent.trim()) return

    setLoading(true)
    try {
      const result = await agentMailService.replyToEmail(selectedThread.id, replyContent)
      if (result.success) {
        setReplyContent('')
        await loadThreadMessages(selectedThread)
      } else {
        console.error('Failed to send reply:', result.error)
      }
    } catch (error) {
      console.error('Failed to send reply:', error)
    }
    setLoading(false)
  }

  const handleScheduleEvent = async (attendeeEmail: string, attendeeName: string) => {
    const eventData = {
      title: `Meeting with ${attendeeName}`,
      description: 'Automatically scheduled from email response',
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      endTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000), // 1 hour meeting
      attendees: [attendeeEmail],
      location: 'TBD',
      status: 'confirmed' as const
    }

    try {
      const result = await agentMailService.scheduleCalendarEvent(eventData)
      if (result.success) {
        await loadUpcomingEvents()
      } else {
        console.error('Failed to schedule event:', result.error)
      }
    } catch (error) {
      console.error('Failed to schedule event:', error)
    }
  }

  if (!isInitialized) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            AgentMail Integration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            AgentMail service is not initialized. Please check your API key configuration.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            AgentMail Dashboard
          </CardTitle>
          <CardDescription>
            Manage emails, responses, and calendar scheduling automatically
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Mail className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Emails Sent</p>
                <p className="text-2xl font-bold">{dashboardData.totalEmailsSent}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm font-medium">Response Rate</p>
                <p className="text-2xl font-bold">{dashboardData.averageResponseRate.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-purple-600" />
              <div>
                <p className="text-sm font-medium">Bookings</p>
                <p className="text-2xl font-bold">{dashboardData.totalBookings}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="inbox">
            <Mail className="h-4 w-4 mr-2" />
            Inbox
          </TabsTrigger>
          <TabsTrigger value="calendar">
            <Calendar className="h-4 w-4 mr-2" />
            Calendar
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <CheckCircle className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Email Threads</CardTitle>
                <Button variant="outline" size="sm" onClick={loadInboxThreads} disabled={loading}>
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {emailThreads.map((thread) => (
                      <div
                        key={thread.id}
                        className={`p-3 border rounded-lg cursor-pointer hover:bg-muted ${
                          selectedThread?.id === thread.id ? 'bg-muted' : ''
                        }`}
                        onClick={() => loadThreadMessages(thread)}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-medium truncate">{thread.subject}</p>
                            <p className="text-sm text-muted-foreground">
                              {thread.participants.join(', ')}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {thread.lastMessage.toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={thread.isRead ? "secondary" : "default"}>
                              {thread.messageCount}
                            </Badge>
                            {!thread.isRead && (
                              <div className="w-2 h-2 bg-blue-600 rounded-full" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {selectedThread ? selectedThread.subject : 'Select a thread'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedThread ? (
                  <div className="space-y-4">
                    <ScrollArea className="h-[250px] border rounded p-4">
                      <div className="space-y-4">
                        {threadMessages.map((message) => (
                          <div key={message.id} className="space-y-2">
                            <div className="flex justify-between">
                              <p className="font-medium">{message.from}</p>
                              <p className="text-sm text-muted-foreground">
                                {message.timestamp.toLocaleString()}
                              </p>
                            </div>
                            <div className="text-sm bg-muted/50 p-3 rounded">
                              {message.body}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>

                    <div className="space-y-2">
                      <Textarea
                        placeholder="Type your reply..."
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        rows={4}
                      />
                      <div className="flex justify-between">
                        <Button
                          variant="outline"
                          onClick={() => handleScheduleEvent(
                            selectedThread.participants[0],
                            selectedThread.participants[0].split('@')[0]
                          )}
                        >
                          <Calendar className="h-4 w-4 mr-2" />
                          Schedule Meeting
                        </Button>
                        <Button onClick={handleSendReply} disabled={loading || !replyContent.trim()}>
                          <Send className="h-4 w-4 mr-2" />
                          Send Reply
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    Select an email thread to view messages and reply
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="calendar" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Events</CardTitle>
              <CardDescription>
                Events automatically scheduled from email responses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {upcomingEvents.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No upcoming events scheduled
                  </p>
                ) : (
                  upcomingEvents.map((event) => (
                    <div key={event.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold">{event.title}</h3>
                          {event.description && (
                            <p className="text-sm text-muted-foreground">{event.description}</p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {event.startTime.toLocaleString()}
                            </div>
                            <div className="flex items-center gap-1">
                              <User className="h-4 w-4" />
                              {event.attendees.length} attendees
                            </div>
                          </div>
                        </div>
                        <Badge variant={event.status === 'confirmed' ? 'default' : 'secondary'}>
                          {event.status}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3">
                    {dashboardData.recentActivity.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">
                        No recent activity
                      </p>
                    ) : (
                      dashboardData.recentActivity.map((activity, index) => (
                        <div key={index} className="flex items-start space-x-3">
                          <div className="flex-shrink-0">
                            {activity.type === 'booking_received' && (
                              <CheckCircle className="h-4 w-4 text-green-600 mt-1" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{activity.eventName}</p>
                            <p className="text-xs text-muted-foreground">{activity.details}</p>
                            <p className="text-xs text-muted-foreground">
                              {activity.timestamp.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Total Events</span>
                    <span className="font-semibold">{dashboardData.totalEvents}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Active Events</span>
                    <span className="font-semibold">{dashboardData.activeEvents}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Emails Sent</span>
                    <span className="font-semibold">{dashboardData.totalEmailsSent}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Average Response Rate</span>
                    <span className="font-semibold">{dashboardData.averageResponseRate.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Bookings</span>
                    <span className="font-semibold">{dashboardData.totalBookings}</span>
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