"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Bot, User, Send, Upload, Calendar, MapPin, Mail, Users, CheckCircle, Clock, AlertCircle } from "lucide-react"

interface Message {
  id: string
  type: "user" | "assistant"
  content: string
  timestamp: Date
  actions?: Array<{
    type: "venue_search" | "email_campaign" | "event_created" | "csv_processed"
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
        "Hello! I'm your Blood Drive AI Assistant. I can help you set up new blood drives by automatically handling venue research, donor outreach, and coordination. To get started, just tell me you'd like to create a new event and I'll guide you through the process.",
      timestamp: new Date(),
    },
  ])
  const [inputValue, setInputValue] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: inputValue,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue("")
    setIsTyping(true)

    // Simulate AI response with actions
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: getAIResponse(inputValue),
        timestamp: new Date(),
        actions: getAIActions(inputValue),
      }
      setMessages((prev) => [...prev, assistantMessage])
      setIsTyping(false)
    }, 2000)
  }

  const getAIResponse = (input: string): string => {
    const lowerInput = input.toLowerCase()

    if (lowerInput.includes("new event") || lowerInput.includes("create") || lowerInput.includes("blood drive")) {
      return "Great! I'll help you create a new blood drive. I need some details:\n\n1. What date are you planning for?\n2. What's your target number of donors?\n3. Do you have a preferred location or should I research venues?\n4. What's the event name?\n\nOnce you provide these details, I'll automatically start researching venues and preparing outreach materials."
    }

    if (lowerInput.includes("venue") || lowerInput.includes("location")) {
      return "I'm researching suitable venues in your area. I'll check availability, capacity, parking, and accessibility. I'll send booking requests to the top 3 options and update you on confirmations."
    }

    if (lowerInput.includes("email") || lowerInput.includes("outreach") || lowerInput.includes("donors")) {
      return "Perfect! I'll set up the donor outreach campaign. Please upload your CSV file with donor contacts, and I'll automatically send personalized invitations, schedule follow-up reminders, and track RSVPs."
    }

    return "I understand. Let me help you with that. I'll start working on the automated processes and keep you updated on the progress through the dashboard."
  }

  const getAIActions = (input: string): Message["actions"] => {
    const lowerInput = input.toLowerCase()

    if (lowerInput.includes("venue") || lowerInput.includes("location")) {
      return [
        { type: "venue_search", status: "pending", details: "Searching 15 venues within 10 miles" },
        { type: "venue_search", status: "completed", details: "Found 8 suitable venues, sending booking requests" },
      ]
    }

    if (lowerInput.includes("email") || lowerInput.includes("csv")) {
      return [
        { type: "csv_processed", status: "completed", details: "Processed 247 donor contacts" },
        { type: "email_campaign", status: "pending", details: "Sending personalized invitations" },
      ]
    }

    if (lowerInput.includes("new event") || lowerInput.includes("create")) {
      return [{ type: "event_created", status: "completed", details: 'Event "Community Holiday Drive" created' }]
    }

    return []
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.name.endsWith(".csv")) {
      const message: Message = {
        id: Date.now().toString(),
        type: "user",
        content: `Uploaded CSV file: ${file.name}`,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, message])

      // Simulate processing
      setTimeout(() => {
        const response: Message = {
          id: (Date.now() + 1).toString(),
          type: "assistant",
          content: `Perfect! I've processed your CSV file with ${Math.floor(Math.random() * 300 + 100)} donor contacts. I'm now sending personalized invitations and will track all responses. You can monitor the progress in the dashboard.`,
          timestamp: new Date(),
          actions: [
            {
              type: "csv_processed",
              status: "completed",
              details: `Processed ${Math.floor(Math.random() * 300 + 100)} contacts`,
            },
            { type: "email_campaign", status: "pending", details: "Sending personalized invitations" },
          ],
        }
        setMessages((prev) => [...prev, response])
      }, 1500)
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
    <div className="flex flex-col h-[600px]">
      {/* Chat Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
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
      </ScrollArea>

      <Separator />

      {/* Input Area */}
      <div className="p-4">
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => fileInputRef.current?.click()} className="flex-shrink-0">
            <Upload className="h-4 w-4" />
          </Button>
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type your message... (e.g., 'Create a new blood drive for next Saturday')"
            onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            className="flex-1"
          />
          <Button onClick={handleSendMessage} disabled={!inputValue.trim() || isTyping}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
        <p className="text-xs text-muted-foreground mt-2">
          Upload CSV files with donor contacts or describe what you'd like to set up
        </p>
      </div>
    </div>
  )
}
