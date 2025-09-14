"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Bot, User, Send, Upload, Calendar, MapPin, Mail, Users, CheckCircle, Clock, AlertCircle } from "lucide-react"

interface UploadedFile {
  name: string
  size: number
  type: string
  content?: string
  preview?: any[]
}

interface Message {
  id: string
  type: "user" | "assistant"
  content: string
  timestamp: Date
  uploadedFile?: UploadedFile
  actions?: Array<{
    type: "venue_search" | "email_campaign" | "event_created" | "csv_processed" | "file_uploaded"
    status: "pending" | "completed" | "failed"
    details: string
  }>
}

export function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      type: "assistant",
      content:
        "Hello! I'm your intelligent Blood Drive AI Assistant. I have access to real-time dashboard data and can help you with:\n\n• Answering questions about events, volunteers, and analytics\n• Creating new blood drive events\n• Processing CSV uploads for donor outreach\n• Providing insights and recommendations\n\nYou can upload CSV files and add your message in the same input - just like ChatGPT! Try asking: \"How many volunteers do we have on Thursday September 14th?\" or attach a CSV file with instructions.",
      timestamp: new Date(),
    },
  ])
  const [inputValue, setInputValue] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [attachedFiles, setAttachedFiles] = useState<UploadedFile[]>([]) // Files ready to send with next message
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (scrollAreaRef.current) {
      // Smooth scroll to bottom when new messages are added
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: 'smooth'
      })
    }
  }, [messages])

  const handleSendMessage = async () => {
    if (!inputValue.trim() && attachedFiles.length === 0) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: inputValue || "📎 File attached",
      timestamp: new Date(),
      uploadedFile: attachedFiles[0], // For now, support one file per message like ChatGPT
      actions: attachedFiles.length > 0 ? [{ type: "file_uploaded", status: "completed", details: `Attached ${attachedFiles[0]?.name} (${(attachedFiles[0]?.size / 1024).toFixed(1)} KB)` }] : []
    }

    setMessages((prev) => [...prev, userMessage])

    // Move attached files to uploaded files and clear attachments
    setUploadedFiles(prev => [...prev, ...attachedFiles])
    const currentAttachedFiles = [...attachedFiles]
    setAttachedFiles([])

    const currentInput = inputValue
    setInputValue("")
    setIsTyping(true)

    // Check if user wants to process CSV files
    const lowerInput = currentInput.toLowerCase()
    const hasAttachedCSV = currentAttachedFiles.length > 0 && currentAttachedFiles.some(f => f.name.toLowerCase().endsWith('.csv'))
    const shouldProcessEmails = (hasAttachedCSV || uploadedFiles.length > 0) &&
      (lowerInput.includes("send") || lowerInput.includes("process") || lowerInput.includes("email campaign") || lowerInput.includes("create campaign"))

    if (shouldProcessEmails) {
      const csvFile = currentAttachedFiles.find(f => f.name.toLowerCase().endsWith('.csv')) ||
                     uploadedFiles.find(f => f.name.toLowerCase().endsWith('.csv'))
      if (csvFile && csvFile.content) {
        try {
          // Call the real API to process the CSV
          const response = await fetch('/api/csv/process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              csvContent: csvFile.content,
              fileName: csvFile.name,
              campaignName: `Blood Drive Campaign - ${new Date().toLocaleDateString()}`
            })
          })

          const result = await response.json()

          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            type: "assistant",
            content: result.success
              ? `🎉 Email campaign launched successfully!\n\n📊 Campaign Results:\n• Contacts processed: ${result.campaign.contactsProcessed}\n• Emails sent: ${result.campaign.emailsSent}\n• Campaign ID: ${result.campaign.id}\n\nI've sent personalized blood drive invitations to all contacts. The emails include event details, what to expect, and a simple way for recipients to RSVP by replying "YES".\n\n📈 You can now monitor responses in the dashboard as they come in. The AgentMail conversation system will automatically handle replies and track RSVPs.`
              : `❌ Something went wrong processing your CSV file: ${result.error}. Please try again or check the file format.`,
            timestamp: new Date(),
            actions: result.success ? [
              { type: "csv_processed", status: "completed", details: `Processed ${result.campaign.contactsProcessed} contacts from ${csvFile.name}` },
              { type: "email_campaign", status: "completed", details: `Sent ${result.campaign.emailsSent} personalized invitations` }
            ] : []
          }
          setMessages((prev) => [...prev, assistantMessage])

        } catch (error) {
          console.error('Error processing CSV:', error)
          const errorMessage: Message = {
            id: (Date.now() + 1).toString(),
            type: "assistant",
            content: `❌ I encountered an error while processing your request: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
            timestamp: new Date(),
          }
          setMessages((prev) => [...prev, errorMessage])
        }
        setIsTyping(false)
        return
      }
    }

    // Regular AI response simulation
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: getAIResponse(currentInput, currentAttachedFiles[0]),
        timestamp: new Date(),
        actions: getAIActions(currentInput),
      }
      setMessages((prev) => [...prev, assistantMessage])
      setIsTyping(false)
    }, 2000)
  }

  const getAIResponse = (input: string, messageWithFile?: UploadedFile): string => {
    const lowerInput = input.toLowerCase()
    const hasUploadedFiles = uploadedFiles.length > 0
    const csvFile = messageWithFile || uploadedFiles.find(f => f.name.toLowerCase().endsWith('.csv'))

    // File was just attached with this message
    if (messageWithFile && messageWithFile.name.toLowerCase().endsWith('.csv')) {
      const contacts = messageWithFile.preview?.slice(1) || [] // Skip header row
      const headers = messageWithFile.preview?.[0] || []

      // If user also provided instructions with the file
      if (input.trim()) {
        return `Perfect! I can see you've attached "${messageWithFile.name}" and want me to help with: "${input}"\n\n📊 File Analysis:\n• File: ${messageWithFile.name}\n• Size: ${(messageWithFile.size / 1024).toFixed(1)} KB\n• Headers: ${headers.join(', ')}\n• Total contacts: ${contacts.length}\n\n📋 Sample data:\n${contacts.slice(0, 3).map((row: any[], idx: number) => `${idx + 1}. ${row.join(' | ')}`).join('\n')}\n\nBased on your request, I can help you with that! What specific action would you like me to take with this data?`
      } else {
        return `Great! I've received your CSV file "${messageWithFile.name}". Let me analyze it:\n\n📊 File Details:\n• Size: ${(messageWithFile.size / 1024).toFixed(1)} KB\n• Headers: ${headers.join(', ')}\n• Total contacts: ${contacts.length}\n\n📋 Sample data:\n${contacts.slice(0, 3).map((row: any[], idx: number) => `${idx + 1}. ${row.join(' | ')}`).join('\n')}\n\nWhat would you like me to do with this data? I can:\n• Create and send email campaigns\n• Analyze contact demographics\n• Validate email addresses\n• Filter and export contacts\n\nJust let me know what you'd like to accomplish!`
      }
    }

    // File-related queries for existing files
    if (hasUploadedFiles && (lowerInput.includes("process") || lowerInput.includes("send") || lowerInput.includes("email campaign"))) {
      if (csvFile) {
        return `I can help you process ${csvFile.name} and create an email campaign! Here's what I found:\n\n📊 File Analysis:\n• File: ${csvFile.name}\n• Size: ${(csvFile.size / 1024).toFixed(1)} KB\n• Estimated contacts: ${csvFile.preview ? csvFile.preview.length - 1 : 'analyzing...'}\n\n🎯 What I can do:\n• Send personalized blood drive invitations\n• Schedule follow-up reminders\n• Track responses and RSVPs\n• Generate campaign analytics\n\nWould you like me to proceed with sending the email campaign? Just say "send the email campaign" and I'll start the process.`
      }
    }

    if (hasUploadedFiles && (lowerInput.includes("file") || lowerInput.includes("csv") || lowerInput.includes("data") || lowerInput.includes("contacts"))) {
      if (csvFile && csvFile.preview) {
        const contacts = csvFile.preview.slice(1) // Skip header row
        const headers = csvFile.preview[0] || []
        return `Let me analyze your CSV file "${csvFile.name}":\n\n📋 File Structure:\n• Headers: ${headers.join(', ')}\n• Total contacts: ${contacts.length}\n• File size: ${(csvFile.size / 1024).toFixed(1)} KB\n\n📊 Sample data preview:\n${contacts.slice(0, 3).map((row: any[], idx: number) => `${idx + 1}. ${row[0]} - ${row[1] || row[2] || 'N/A'}`).join('\n')}\n\nWhat would you like me to do with this data? I can:\n• Create and send an email campaign\n• Analyze the contact demographics\n• Validate email addresses\n• Export filtered contacts`
      }
    }

    // Dashboard data queries
    if (lowerInput.includes("how many") && (lowerInput.includes("volunteer") || lowerInput.includes("people")) && lowerInput.includes("thursday") && lowerInput.includes("sept")) {
      return "Based on the dashboard data, for the Community Center Blood Drive event happening on Thursday, September 14, 2025, we currently have 23 RSVPs.\n\nThe event details show:\n• Date: Thursday, September 14, 2025 at 9:00 AM\n• Venue: Community Center Hall\n• Target Donors: 50\n• Current RSVPs: 23\n• Emails Sent: 120\n• Emails Opened: 78\n• Emails Replied: 31\n\nSo to answer your question directly, we currently have 23 people booked for the Thursday, September 14th event at the Community Center."
    }

    if (lowerInput.includes("email response rate") || lowerInput.includes("email rate")) {
      return "Based on the dashboard data:\n\n• Email Open Rate: 68%\n• Click-through Rate: 42%\n• RSVP Conversion Rate: 36%\n• Overall Email Response Rate: 65%\n\nFor the Community Center drive specifically:\n• 120 emails sent\n• 78 opened (65%)\n• 31 replies (26%)\n• 23 RSVPs confirmed (19% conversion)\n\nThe response rates are above industry average for blood drive campaigns."
    }

    if (lowerInput.includes("dashboard") || lowerInput.includes("analytics") || lowerInput.includes("metrics")) {
      return "Here's your current dashboard overview:\n\n📊 Quick Stats:\n• Active Drives: 3\n• Total Donors: 83\n• AI Actions: 247\n• Success Rate: 94%\n\n📈 Campaign Performance:\n• Community Center Drive: 26% conversion (23/89)\n• University Campus Drive: 34% conversion (42/124)\n• Corporate Office Drive: 27% conversion (18/67)\n\n🎯 Recent AI Actions:\n• Venue research completed for 2 locations\n• 247 personalized emails sent\n• 89 SMS follow-ups scheduled\n• 3 venue confirmations received"
    }

    if (lowerInput.includes("new event") || lowerInput.includes("create") || lowerInput.includes("blood drive")) {
      return "Great! I'll help you create a new blood drive. I need some details:\n\n1. What date are you planning for?\n2. What's your target number of donors?\n3. Do you have a preferred location or should I research venues?\n4. What's the event name?\n\nOnce you provide these details, I'll automatically start researching venues and preparing outreach materials."
    }

    if (lowerInput.includes("venue") || lowerInput.includes("location")) {
      return "I'm researching suitable venues in your area. I'll check availability, capacity, parking, and accessibility. I'll send booking requests to the top 3 options and update you on confirmations."
    }

    if (lowerInput.includes("email") || lowerInput.includes("outreach") || lowerInput.includes("donors")) {
      return "Perfect! I'll set up the donor outreach campaign. Please upload your CSV file with donor contacts, and I'll help you analyze the data before sending personalized invitations."
    }

    return "I understand. Let me help you with that. I can provide insights on event performance, volunteer schedules, donor engagement metrics, or help you create new blood drives. You can also upload CSV files and I'll help you analyze and process them. What would you like to know?"
  }

  const getAIActions = (input: string): Message["actions"] => {
    const lowerInput = input.toLowerCase()
    const hasUploadedFiles = uploadedFiles.length > 0

    // Only process email campaigns when explicitly requested
    if (hasUploadedFiles && (lowerInput.includes("yes") || lowerInput.includes("send") || lowerInput.includes("process")) && lowerInput.includes("email")) {
      const csvFile = uploadedFiles.find(f => f.name.toLowerCase().endsWith('.csv'))
      if (csvFile) {
        return [
          { type: "csv_processed", status: "completed", details: `Processed ${csvFile.preview?.length - 1 || 0} donor contacts from ${csvFile.name}` },
          { type: "email_campaign", status: "pending", details: "Sending personalized invitations" },
        ]
      }
    }

    if (lowerInput.includes("venue") || lowerInput.includes("location")) {
      return [
        { type: "venue_search", status: "pending", details: "Searching 15 venues within 10 miles" },
        { type: "venue_search", status: "completed", details: "Found 8 suitable venues, sending booking requests" },
      ]
    }

    if (lowerInput.includes("new event") || lowerInput.includes("create")) {
      return [{ type: "event_created", status: "completed", details: 'Event "Community Holiday Drive" created' }]
    }

    return []
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.name.toLowerCase().endsWith(".csv")) {
      try {
        // Read file content for preview
        const content = await file.text()
        const lines = content.split('\n').filter(line => line.trim())
        const preview = lines.slice(0, 10).map(line => line.split(',').map(cell => cell.trim())) // First 10 rows as preview

        const uploadedFile: UploadedFile = {
          name: file.name,
          size: file.size,
          type: file.type,
          content: content,
          preview: preview
        }

        // Add to attached files (ready to send with next message)
        setAttachedFiles(prev => [...prev, uploadedFile])

      } catch (error) {
        console.error('Error reading CSV file:', error)
        alert(`Error reading CSV file: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    } else {
      // Handle non-CSV files
      alert(`I can only process CSV files for now. The file "${file.name}" doesn't appear to be a CSV file. Please upload a .csv file with your donor contacts.`)
    }

    // Clear the input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
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
      case "file_uploaded":
        return <Upload className="h-4 w-4" />
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

  return (
    <div className="flex flex-col h-full max-h-[600px]">
      {/* Chat Messages */}
      <div 
        className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0" 
        ref={scrollAreaRef}
      >
        {messages.map((message) => (
          <div key={message.id} className={`flex gap-3 ${message.type === "user" ? "justify-end" : "justify-start"}`}>
            {message.type === "assistant" && (
              <div className="flex items-center justify-center w-8 h-8 bg-primary rounded-full flex-shrink-0">
                <Bot className="h-4 w-4 text-primary-foreground" />
              </div>
            )}

            <div className={`max-w-[80%] ${message.type === "user" ? "order-first" : ""}`}>
              <div
                className={`p-3 rounded-lg ${
                  message.type === "user" ? "bg-primary text-primary-foreground ml-auto" : "bg-muted"
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>

              {/* File Preview */}
              {message.uploadedFile && (
                <div className="mt-2 p-3 border rounded-lg bg-card">
                  <div className="flex items-center gap-2 mb-2">
                    <Upload className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{message.uploadedFile.name}</span>
                    <span className="text-xs text-muted-foreground">({(message.uploadedFile.size / 1024).toFixed(1)} KB)</span>
                  </div>

                  {message.uploadedFile.preview && message.uploadedFile.preview.length > 0 && (
                    <div className="text-xs">
                      <div className="font-medium mb-1">Preview:</div>
                      <div className="bg-muted p-2 rounded text-xs font-mono max-h-32 overflow-y-auto">
                        {/* Headers */}
                        <div className="font-bold text-primary">{message.uploadedFile.preview[0]?.join(' | ')}</div>
                        {/* First few data rows */}
                        {message.uploadedFile.preview.slice(1, 5).map((row, idx) => (
                          <div key={idx} className="text-muted-foreground">{row.join(' | ')}</div>
                        ))}
                        {message.uploadedFile.preview.length > 5 && (
                          <div className="text-muted-foreground italic">... and {message.uploadedFile.preview.length - 5} more rows</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* AI Actions */}
              {message.actions && message.actions.length > 0 && (
                <div className="mt-2 space-y-2">
                  {message.actions.map((action, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-card border rounded-lg text-sm">
                      {getActionIcon(action.type)}
                      <span className="flex-1">{action.details}</span>
                      {getStatusIcon(action.status)}
                    </div>
                  ))}
                </div>
              )}

              <p className="text-xs text-muted-foreground mt-1">{message.timestamp.toLocaleTimeString()}</p>
            </div>

            {message.type === "user" && (
              <div className="flex items-center justify-center w-8 h-8 bg-secondary rounded-full flex-shrink-0">
                <User className="h-4 w-4 text-secondary-foreground" />
              </div>
            )}
          </div>
        ))}

        {isTyping && (
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
      <div className="p-4">
        {/* Attached Files Preview */}
        {attachedFiles.length > 0 && (
          <div className="mb-3 space-y-2">
            {attachedFiles.map((file, index) => (
              <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded-lg text-sm">
                <Upload className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1 font-medium">{file.name}</span>
                <span className="text-xs text-muted-foreground">({(file.size / 1024).toFixed(1)} KB)</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAttachedFiles(prev => prev.filter((_, i) => i !== index))}
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                >
                  ×
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => fileInputRef.current?.click()} className="flex-shrink-0">
            <Upload className="h-4 w-4" />
          </Button>
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={attachedFiles.length > 0
              ? "Add a message with your file..."
              : "Type your message... (e.g., 'Create a new blood drive for next Saturday')"
            }
            onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            className="flex-1"
          />
          <Button onClick={handleSendMessage} disabled={(!inputValue.trim() && attachedFiles.length === 0) || isTyping}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
        <p className="text-xs text-muted-foreground mt-2">
          {attachedFiles.length > 0
            ? "File attached - add your message and press send"
            : "Upload CSV files with donor contacts or describe what you'd like to set up"
          }
        </p>
      </div>
    </div>
  )
}
