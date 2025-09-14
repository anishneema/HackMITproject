"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { useChatStore } from "@/lib/chat-manager"
import { useDashboardStore } from "@/lib/dashboard-store"
import { claudeAI, AIResponse } from "@/lib/claude-ai-service"
import { queryDashboardData } from "@/lib/query-dashboard-data"
import { CSVReader } from "@/lib/email-automation/csv-reader"
import { agentMailService } from "@/lib/agent-mail-service"
import { Bot, User, Send, Upload, Calendar, MapPin, Mail, Users, CheckCircle, Clock, AlertCircle, BarChart } from "lucide-react"
import { ChatSidebar } from "./chat-sidebar"
// import "@/lib/sample-data" // Initialize sample data - temporarily disabled for debugging

export function SmartAIAssistant() {
  const [inputValue, setInputValue] = useState("")
  const {
    sessions,
    activeSessionId,
    createSession,
    setActiveSession,
    getActiveSession,
    addMessage,
    updateMessage,
    setProcessing,
    isProcessing: isSessionProcessing,
  } = useChatStore()

  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const activeSession = getActiveSession()
  const isProcessing = activeSession ? isSessionProcessing(activeSession.id) : false

  // Get dashboard data
  const dashboardStore = useDashboardStore()
  const { events, campaigns, bookings, getDashboardTotals, addEvent, addCampaign, onEmailSent } = dashboardStore

  // Create initial session if none exists
  useEffect(() => {
    if (sessions.length === 0) {
      const sessionId = createSession()
      setActiveSession(sessionId)
    }
  }, [sessions.length, createSession, setActiveSession])

  // Auto scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: 'smooth'
      })
    }
  }, [activeSession?.messages])

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !activeSessionId) return

    // Add user message
    addMessage(activeSessionId, {
      type: "user",
      content: inputValue,
    })

    const currentInput = inputValue
    setInputValue("")
    setProcessing(activeSessionId, true)

    try {
      // Process with Claude AI using dashboard data and conversation history
      const conversationHistory = activeSession.messages.map(msg => ({
        type: msg.type,
        content: msg.content,
        timestamp: msg.timestamp
      }))

      const aiResponse: AIResponse = await queryDashboardData(currentInput, conversationHistory)

      // Handle any automation triggers
      await handleAutomationTriggers(currentInput, aiResponse)

      // Add assistant message
      addMessage(activeSessionId, {
        type: "assistant",
        content: aiResponse.content,
        actions: aiResponse.actions,
      })
    } catch (error) {
      console.error("Error getting AI response:", error)
      addMessage(activeSessionId, {
        type: "assistant",
        content: "I apologize, but I encountered an error while processing your request. Please try again or rephrase your question.",
        actions: [{
          type: "data_query",
          status: "failed",
          details: "Error processing request"
        }]
      })
    } finally {
      setProcessing(activeSessionId, false)
    }
  }

  const handleAutomationTriggers = async (userInput: string, aiResponse: AIResponse) => {
    const lowerInput = userInput.toLowerCase()

    // Check if any actions indicate event creation
    const hasEventCreationAction = aiResponse.actions?.some(action => action.type === 'event_created')

    if (hasEventCreationAction || (lowerInput.includes("create") && lowerInput.includes("event"))) {
      const eventName = extractEventName(userInput) || "New Blood Drive Event"

      // Extract date information from user input
      let eventDate = "TBD"
      let eventTime = "9:00 AM"

      // Look for dates in various formats
      const dateMatches = [
        userInput.match(/(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i),
        userInput.match(/(next week|this week|tomorrow|today)/i),
        userInput.match(/(\d{1,2}\/\d{1,2}\/?\d{0,4})/),
        userInput.match(/(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})/i),
        userInput.match(/(\d{1,2})(st|nd|rd|th)/i)
      ]

      for (const match of dateMatches) {
        if (match) {
          eventDate = match[1] || match[0]
          break
        }
      }

      // Look for times
      const timeMatch = userInput.match(/(\d{1,2}:\d{2}\s*(am|pm)?|\d{1,2}\s*(am|pm))/i)
      if (timeMatch) {
        eventTime = timeMatch[0]
      }

      // Extract venue information
      let venue = "TBD"
      const venueMatch = userInput.match(/(?:at|in|venue|location)\s+([^,.]+)/i)
      if (venueMatch) {
        venue = venueMatch[1].trim()
      }

      // Extract target number
      let targetDonors = 30
      const targetMatch = userInput.match(/(\d+)\s*(?:donors?|people|volunteers?)/i)
      if (targetMatch) {
        targetDonors = parseInt(targetMatch[1])
      }

      console.log("Creating event:", {
        name: eventName,
        date: eventDate,
        time: eventTime,
        targetDonors,
        currentRSVPs: 0,
        venue,
        status: "active",
        emailsSent: 0,
        emailsOpened: 0,
        emailsReplied: 0
      })

      const newEventId = addEvent({
        name: eventName,
        date: eventDate,
        time: eventTime,
        targetDonors,
        currentRSVPs: 0,
        venue,
        status: "active",
        emailsSent: 0,
        emailsOpened: 0,
        emailsReplied: 0
      })

      console.log("Created event with ID:", newEventId)
      console.log("Total events after creation:", events.length)

      // Update the AI response actions to show completion
      if (aiResponse.actions) {
        aiResponse.actions.forEach(action => {
          if (action.type === 'event_created') {
            action.status = 'completed'
            action.details = `Created "${eventName}" for ${eventDate} at ${eventTime}`
          }
        })
      }
    }

    // Handle other automation triggers based on actions
    if (aiResponse.actions) {
      for (const action of aiResponse.actions) {
        if (action.type === 'venue_search' && action.status === 'pending') {
          // Simulate venue search completion
          setTimeout(() => {
            action.status = 'completed'
            action.details = 'Found 3 suitable venues - Community Center, University Hall, Library'
          }, 2000)
        }

        if (action.type === 'email_campaign' && action.status === 'pending') {
          // Create a sample campaign
          const eventId = events.length > 0 ? events[0].id : null
          if (eventId) {
            addCampaign({
              eventId,
              name: "AI Generated Campaign",
              totalSent: 50,
              opened: 0,
              replied: 0,
              bounced: 0,
              unsubscribed: 0,
              responseRate: 0,
              sentimentBreakdown: {
                positive: 0,
                negative: 0,
                neutral: 0,
                questions: 0
              },
              lastActivity: new Date(),
              status: 'sending'
            })
          }
        }
      }
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !file.name.endsWith(".csv") || !activeSessionId) return

    // Add user message for file upload
    addMessage(activeSessionId, {
      type: "user",
      content: `Uploaded CSV file: ${file.name}`,
    })

    setProcessing(activeSessionId, true)

    try {
      // Process with Claude AI
      const aiResponse = await claudeAI.handleCSVUpload(file)

      // Process CSV and start email automation
      const contacts = await CSVReader.parseCSVFile(file)

      // Create a sample event for the campaign if none exists
      let eventId = events.length > 0 ? events[0].id : null
      if (!eventId) {
        eventId = addEvent({
          name: "Blood Drive Campaign",
          date: "This Saturday",
          time: "9:00 AM",
          targetDonors: contacts.length,
          currentRSVPs: 0,
          venue: "Community Center",
          status: "active"
        })
      }

      // Add campaign
      const campaignId = addCampaign({
        eventId,
        name: `Email Campaign - ${file.name}`,
        totalSent: contacts.length,
        opened: 0,
        replied: 0,
        bounced: 0,
        unsubscribed: 0,
        responseRate: 0,
        sentimentBreakdown: {
          positive: 0,
          negative: 0,
          neutral: 0,
          questions: 0
        },
        lastActivity: new Date(),
        status: 'sending'
      })

      // Simulate email sending
      setTimeout(() => {
        onEmailSent(eventId!, contacts.length)
      }, 2000)

      // Start Agent Mail campaign if available
      if (agentMailService.isReady()) {
        await agentMailService.startEmailCampaign({
          eventId,
          eventName: "Blood Drive Campaign",
          contacts,
          emailTemplate: {
            subject: "Join Us for a Life-Saving Blood Drive!",
            body: `Hello {{firstName}},\n\nWe hope this message finds you well. We're reaching out to invite you to participate in our upcoming blood drive.\n\nYour support has always been invaluable to our mission, and we would be honored to have you join us for this important initiative.\n\nPlease feel free to reply to this email with any questions or to confirm your participation.\n\nThank you for your continued support of the Red Cross mission.\n\nBest regards,\nRed Cross Events Team`
          }
        })
      }

      // Add assistant response
      addMessage(activeSessionId, {
        type: "assistant",
        content: aiResponse.content,
        actions: aiResponse.actions,
      })

    } catch (error) {
      console.error('Error processing CSV:', error)
      addMessage(activeSessionId, {
        type: "assistant",
        content: "I encountered an error processing your CSV file. Please make sure it includes columns for 'email', 'firstName', and 'lastName'. You can try uploading the file again.",
        actions: [{
          type: "csv_processed",
          status: "failed",
          details: "CSV processing failed - please check file format"
        }]
      })
    } finally {
      setProcessing(activeSessionId, false)
    }
  }

  const extractEventName = (input: string): string | null => {
    const match = input.match(/(?:called|named|for)\s+["']?([^"'\n]+)["']?/i)
    return match ? match[1].trim() : null
  }

  const getActionIcon = (type: string) => {
    switch (type) {
      case "venue_search":
        return <MapPin className="h-4 w-4" />
      case "email_campaign":
        return <Mail className="h-4 w-4" />
      case "event_created":
        return <Calendar className="h-4 w-4" />
      case "csv_processed":
        return <Users className="h-4 w-4" />
      case "data_query":
        return <BarChart className="h-4 w-4" />
      default:
        return <CheckCircle className="h-4 w-4" />
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-3 w-3 text-green-600" />
      case "pending":
        return <Clock className="h-3 w-3 text-yellow-600" />
      case "failed":
        return <AlertCircle className="h-3 w-3 text-red-600" />
      default:
        return <Clock className="h-3 w-3 text-gray-400" />
    }
  }

  if (!activeSession) {
    return (
      <div className="flex h-[600px] bg-background border rounded-lg overflow-hidden">
        <ChatSidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <Bot className="h-12 w-12 mx-auto mb-4" />
            <p>Loading chat...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-[600px] bg-background border rounded-lg overflow-hidden">
      {/* Sidebar */}
      <ChatSidebar />

      {/* Chat Interface */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="p-4 border-b border-border bg-card">
          <h2 className="font-semibold truncate">{activeSession.title}</h2>
          <p className="text-sm text-muted-foreground">
            {activeSession.messages.length} messages
            {isProcessing && " • Processing..."}
          </p>
        </div>

        {/* Chat Messages */}
        <div 
          className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0" 
          ref={scrollAreaRef}
        >
            {activeSession.messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.type === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {message.type === "assistant" && (
                  <div className="flex items-center justify-center w-8 h-8 bg-primary rounded-full flex-shrink-0">
                    <Bot className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}

                <div className={`max-w-[80%] ${message.type === "user" ? "order-first" : ""}`}>
                  <div
                    className={`p-3 rounded-lg ${
                      message.type === "user"
                        ? "bg-primary text-primary-foreground ml-auto"
                        : "bg-muted"
                    }`}
                  >
                    <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                  </div>

                  {/* AI Actions */}
                  {message.actions && message.actions.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {message.actions.map((action, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 p-2 bg-card border rounded-lg text-sm"
                        >
                          {getActionIcon(action.type)}
                          <span className="flex-1">{action.details}</span>
                          {getStatusIcon(action.status)}
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </p>
                </div>

                {message.type === "user" && (
                  <div className="flex items-center justify-center w-8 h-8 bg-secondary rounded-full flex-shrink-0">
                    <User className="h-4 w-4 text-secondary-foreground" />
                  </div>
                )}
              </div>
            ))}

            {isProcessing && (
              <div className="flex gap-3 justify-start">
                <div className="flex items-center justify-center w-8 h-8 bg-primary rounded-full">
                  <Bot className="h-4 w-4 text-primary-foreground" />
                </div>
                <div className="bg-muted p-3 rounded-lg">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                    <div
                      className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                  </div>
                </div>
              </div>
            )}
        </div>

        <Separator />

        {/* Input Area */}
        <div className="p-4 bg-card">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              className="flex-shrink-0"
              disabled={isProcessing}
            >
              <Upload className="h-4 w-4" />
            </Button>
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask about your dashboard data or upload a CSV file..."
              onKeyPress={(e) => e.key === "Enter" && !isProcessing && handleSendMessage()}
              className="flex-1"
              disabled={isProcessing}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isProcessing}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Upload CSV files for automated donor outreach or ask questions about your dashboard data
          </p>
        </div>
      </div>
    </div>
  )
}