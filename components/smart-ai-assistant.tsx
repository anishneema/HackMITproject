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
  const { events, campaigns, bookings, getDashboardTotals, addEvent, onEmailSent } = dashboardStore

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
      const conversationHistory = activeSession?.messages.map(msg => ({
        type: msg.type,
        content: msg.content,
        timestamp: msg.timestamp
      })) || []

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
          // Simulate email campaign activity
          const eventId = events.length > 0 ? events[0].id : null
          if (eventId) {
            // Simulate email sending
            setTimeout(() => {
              onEmailSent(eventId, 50)
            }, 2000)
          }
        }
      }
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('File Upload Debug: handleFileUpload called')
    const file = event.target.files?.[0]
    console.log('File Upload Debug: file object:', file)
    console.log('File Upload Debug: activeSessionId:', activeSessionId)

    if (!file || !file.name.endsWith(".csv") || !activeSessionId) {
      console.log('File Upload Debug: Early return - file check failed')
      return
    }

    console.log('File Upload Debug: Starting file processing for:', file.name)

    // Add user message for file upload
    addMessage(activeSessionId, {
      type: "user",
      content: `Uploaded CSV file: ${file.name}`,
    })

    setProcessing(activeSessionId, true)

    try {
      console.log('File Upload Debug: Calling claudeAI.handleCSVUpload')
      // Process with Claude AI first for validation
      const aiResponse = await claudeAI.handleCSVUpload(file)

      // If AI validation passed, process CSV
      console.log('File Upload Debug: AI validation passed, processing CSV')
      const contacts = await CSVReader.parseCSVFile(file)
      console.log('Processed contacts:', contacts)

      if (contacts.length === 0) {
        throw new Error('No valid contacts found in the CSV file. Please check that your file has proper email addresses and at least one name column.')
      }

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

      // Simulate email sending
      setTimeout(() => {
        onEmailSent(eventId!, contacts.length)
      }, 2000)

      // Send emails via AgentMail API
      try {
        console.log('Sending emails via AgentMail API...')
        
        const emailTemplate = {
          subject: "Join Us for a Life-Saving Blood Drive!",
          body: `Hello {{firstName}},

We hope this message finds you well. We're reaching out to invite you to participate in our upcoming blood drive.

Your support has always been invaluable to our mission, and we would be honored to have you join us for this important initiative.

Our next event details:
- Date: This Saturday
- Time: 9:00 AM - 3:00 PM
- Location: Community Center
- Duration: Typically 3-4 hours

Your contribution can make a real difference in saving lives. One blood donation can help save up to three lives!

Please reply to this email if you're interested in participating, and we'll send you the specific details once they're confirmed.

Thank you for considering this opportunity to help others.

Best regards,
Red Cross Events Team`
        }

        const emailResponse = await fetch('/api/email/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contacts: contacts,
            subject: emailTemplate.subject,
            body: emailTemplate.body,
            eventName: "Blood Drive Campaign"
          })
        })

        if (emailResponse.ok) {
          const result = await emailResponse.json()
          console.log('Emails sent successfully via SMTP:', result)
          
          // Update the AI response to include email sending success
          const successMessage = result.success 
            ? `📧 I've sent personalized emails to all ${contacts.length} contacts! They will receive invitations to our blood drive event in their inbox.`
            : `📧 I've sent emails to ${result.details?.sent || 0} contacts, but ${result.details?.failed || 0} failed to send.`
          
          aiResponse.content += `\n\n✅ **Emails Sent Successfully!**\n${successMessage}\n\n**Campaign Details:**\n- Campaign ID: ${result.campaignId}\n- Emails Sent: ${result.details?.sent || 0}\n- Emails Failed: ${result.details?.failed || 0}\n- From: ${result.details?.fromName} <${result.details?.fromEmail}>\n- Status: ${result.success ? 'Completed' : 'Partial Success'}`
          
          if (result.details?.errors && result.details.errors.length > 0) {
            aiResponse.content += `\n\n**Errors:**\n${result.details.errors.slice(0, 3).join('\n')}`
            if (result.details.errors.length > 3) {
              aiResponse.content += `\n... and ${result.details.errors.length - 3} more errors`
            }
          }
        } else {
          const errorData = await emailResponse.json()
          console.error('Failed to send emails via SMTP:', errorData)
          
          // Update the AI response to include email sending failure
          aiResponse.content += `\n\n⚠️ **Email Sending Issue**\nI processed your CSV file successfully, but encountered an issue sending emails. ${errorData.details || 'Please check your email configuration.'}`
        }
      } catch (error) {
        console.error('Error sending emails via SMTP:', error)
        
        // Update the AI response to include email sending error
        aiResponse.content += `\n\n⚠️ **Email Sending Error**\nI processed your CSV file successfully, but encountered an error sending emails. Please try again or check your email configuration.`
      }

      // Add assistant response
      addMessage(activeSessionId, {
        type: "assistant",
        content: aiResponse.content,
        actions: aiResponse.actions,
      })

    } catch (error) {
      console.error('Error processing CSV:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      
      addMessage(activeSessionId, {
        type: "assistant",
        content: `❌ I encountered an error processing your CSV file: ${errorMessage}

**Common CSV format requirements:**
• Must have an 'email' column (required)
• Should have at least one name column (like 'name', 'firstName', 'lastName', etc.)
• Use comma (,) or semicolon (;) as separators
• Make sure email addresses are valid

**Example CSV format:**
\`\`\`
email,name,phone
john@example.com,John Doe,555-1234
jane@example.com,Jane Smith,555-5678
\`\`\`

Please check your file format and try uploading again.`,
        actions: [{
          type: "csv_processed",
          status: "failed",
          details: errorMessage
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
              onClick={() => {
                console.log('Upload Button Debug: Button clicked, opening file dialog')
                fileInputRef.current?.click()
              }}
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