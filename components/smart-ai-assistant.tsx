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
import { Bot, User, Send, Upload, Calendar, MapPin, Mail, Users, CheckCircle, Clock, AlertCircle, BarChart, Plus } from "lucide-react"
import { ChatSidebar } from "./chat-sidebar"
import { CSVTableVisualization } from "./csv-table-visualization"
import { EventCreationModal } from "./event-creation-modal"
// import "@/lib/sample-data" // Initialize sample data - temporarily disabled for debugging

export function SmartAIAssistant() {
  const [inputValue, setInputValue] = useState("")
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
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
  const { events, campaigns, bookings, getDashboardTotals, addEvent, onEmailSent, createEventAPI } = dashboardStore

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
    if ((!inputValue.trim() && attachedFiles.length === 0) || !activeSessionId) return

    // Create user message content
    let messageContent = inputValue.trim()
    if (attachedFiles.length > 0) {
      const fileNames = attachedFiles.map(file => file.name).join(", ")
      if (messageContent) {
        messageContent += `\n\n[Attached files: ${fileNames}]`
      } else {
        messageContent = `[Attached files: ${fileNames}]`
      }
    }

    // Add user message
    addMessage(activeSessionId, {
      type: "user",
      content: messageContent,
    })

    const currentInput = inputValue
    const currentFiles = [...attachedFiles]
    setInputValue("")
    setAttachedFiles([])
    setProcessing(activeSessionId, true)

    try {
      // Process with Claude AI using dashboard data and conversation history
      const conversationHistory = activeSession?.messages.map(msg => ({
        type: msg.type,
        content: msg.content,
        timestamp: msg.timestamp
      })) || []

      let aiResponse: AIResponse

      // Check if we have CSV files to process
      const csvFiles = currentFiles.filter(file => file.name.endsWith('.csv'))
      
      if (csvFiles.length > 0) {
        // Check if user is asking about the CSV content (not requesting email sending)
        const lowerInput = currentInput.toLowerCase()
        const isAskingAboutContent = lowerInput.includes('what') || 
                                   lowerInput.includes('tell me') || 
                                   lowerInput.includes('show me') || 
                                   lowerInput.includes('analyze') || 
                                   lowerInput.includes('explain') ||
                                   lowerInput.includes('include') ||
                                   lowerInput.includes('content') ||
                                   lowerInput.includes('data') ||
                                   lowerInput.includes('look at') ||
                                   lowerInput.includes('check') ||
                                   lowerInput.includes('review')
        
        const isRequestingEmailSending = lowerInput.includes('send') || 
                                       lowerInput.includes('email') || 
                                       lowerInput.includes('campaign') || 
                                       lowerInput.includes('outreach') ||
                                       lowerInput.includes('invite') ||
                                       lowerInput.includes('notify')
        
        if (isAskingAboutContent && !isRequestingEmailSending) {
          // User wants to know about the CSV content, not send emails
          aiResponse = await analyzeCSVContent(csvFiles, currentInput, conversationHistory)
        } else if (isRequestingEmailSending || currentInput.trim() === '') {
          // User wants to send emails with the CSV (or no specific instruction = default to sending)
          aiResponse = await handleCSVFilesWithContext(csvFiles, currentInput, conversationHistory)
        } else {
          // Default to analysis if unclear
          aiResponse = await analyzeCSVContent(csvFiles, currentInput, conversationHistory)
        }
      } else {
        // Check if user is referring to CSV data from conversation history
        const lowerInput = currentInput.toLowerCase()
        const hasCSVInHistory = conversationHistory.some((msg: any) => 
          msg.type === 'assistant' && msg.csvData
        )
        
        if (hasCSVInHistory && (lowerInput.includes('send') || lowerInput.includes('email') || lowerInput.includes('campaign'))) {
          // User is referring to CSV data from previous message
          const lastCSVMessage = conversationHistory
            .filter((msg: any) => msg.type === 'assistant' && msg.csvData)
            .pop()
          
          if ((lastCSVMessage as any)?.csvData) {
            // Reconstruct CSV data from the conversation history
            const contacts = (lastCSVMessage as any).csvData.contacts
            const fileName = (lastCSVMessage as any).csvData.fileName
            
            // Create a proper CSV string from the contacts
            const headers = Object.keys(contacts[0] || {})
            const csvContent = [
              headers.join(','),
              ...contacts.map((contact: any) => 
                headers.map(header => contact[header] || '').join(',')
              )
            ].join('\n')
            
            const csvBlob = new Blob([csvContent], { type: 'text/csv' })
            const csvFile = new File([csvBlob], fileName, { type: 'text/csv' })
            
            aiResponse = await handleCSVFilesWithContext([csvFile], currentInput, conversationHistory)
          } else {
            aiResponse = await queryDashboardData(currentInput, conversationHistory)
          }
        } else {
          // Regular text processing
          aiResponse = await queryDashboardData(currentInput, conversationHistory)
        }
      }

      // Handle any automation triggers
      await handleAutomationTriggers(currentInput, aiResponse)

      // Add assistant message
      addMessage(activeSessionId, {
        type: "assistant",
        content: aiResponse.content,
        actions: aiResponse.actions,
        csvData: aiResponse.csvData,
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

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    const csvFiles = files.filter(file => file.name.endsWith('.csv'))
    
    if (csvFiles.length > 0) {
      setAttachedFiles(prev => [...prev, ...csvFiles])
    }
    
    // Clear the input so the same file can be selected again if needed
    event.target.value = ''
  }

  const removeAttachedFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleEventCreated = async (eventData: {
    name: string;
    date: string;
    time: string;
    location: string;
    targetDonors: number;
    csvFile?: File;
  }) => {
    try {
      // Add the event to the dashboard store (local)
      const eventId = addEvent({
        name: eventData.name,
        date: eventData.date,
        time: eventData.time,
        targetDonors: eventData.targetDonors,
        currentRSVPs: 0,
        venue: eventData.location,
        status: "active"
      });

      // Also create the event via API to ensure persistence
      try {
        console.log('Creating event via API:', eventData);
        const apiEventId = await createEventAPI({
          name: eventData.name,
          date: eventData.date,
          time: eventData.time,
          targetDonors: eventData.targetDonors,
          currentRSVPs: 0,
          venue: eventData.location,
          status: "active"
        });
        console.log('Event created via API with ID:', apiEventId);
      } catch (apiError) {
        console.error('Failed to create event via API:', apiError);
        console.warn('Local event was created but may not persist across tab switches');
      }

      // Process CSV file and send emails if provided
      let emailResult = null;
      if (eventData.csvFile) {
        try {
          console.log('Processing CSV file for event:', eventData.csvFile.name);
          const contacts = await CSVReader.parseCSVFile(eventData.csvFile);
          
          if (contacts.length > 0) {
            // Create email template for the event
            const emailTemplate = {
              subject: `Join Us for ${eventData.name}!`,
              body: `Hello {{firstName}},

We hope this message finds you well. We're reaching out to invite you to participate in our upcoming blood drive event.

**Event Details:**
• **Event:** ${eventData.name}
• **Date:** ${eventData.date}
• **Time:** ${eventData.time}
• **Location:** ${eventData.location}

Your support has always been invaluable to our mission, and we would be honored to have you join us for this important initiative.

Your contribution can make a real difference in saving lives. One blood donation can help save up to three lives!

Please reply to this email if you're interested in participating, and we'll send you the specific details once they're confirmed.

Thank you for considering this opportunity to help others.

Best regards,
Red Cross Events Team`
            };

            // Send emails via AgentMail API
            console.log('Attempting to send emails to:', contacts.length, 'contacts');
            console.log('Email template:', emailTemplate);
            
            const emailResponse = await fetch('/api/email/send', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                contacts: contacts,
                subject: emailTemplate.subject,
                body: emailTemplate.body,
                eventName: eventData.name
              })
            });

            console.log('Email response status:', emailResponse.status);
            console.log('Email response ok:', emailResponse.ok);

            if (emailResponse.ok) {
              emailResult = await emailResponse.json();
              console.log('Emails sent successfully for event:', emailResult);
              
              // Update the event with email count
              onEmailSent(eventId, contacts.length);
            } else {
              const errorData = await emailResponse.json();
              console.error('Failed to send emails for event:', errorData);
              emailResult = { success: false, error: errorData.details || errorData.error || 'Failed to send emails' };
            }
          }
        } catch (error) {
          console.error('Error processing CSV for event:', error);
          if (error instanceof TypeError && error.message.includes('fetch')) {
            emailResult = { success: false, error: 'Network error: Unable to connect to email service. Please check your internet connection.' };
          } else {
            emailResult = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
          }
        }
      }

      // Add a success message to the chat
      if (activeSessionId) {
        let successMessage = `✅ **Event Created Successfully!**

**Event Details:**
• **Name:** ${eventData.name}
• **Date:** ${eventData.date}
• **Time:** ${eventData.time}
• **Location:** ${eventData.location}
• **Target Donors:** ${eventData.targetDonors}`;

        if (eventData.csvFile && emailResult) {
          if (emailResult.success) {
            successMessage += `

📧 **Emails Sent Successfully!**
• **Volunteers Notified:** ${emailResult.details?.sent || 0}
• **Campaign ID:** ${emailResult.campaignId}
• **Status:** Completed`;
          } else {
            successMessage += `

⚠️ **Email Sending Issue**
• **Error:** ${emailResult.error}
• **Note:** Event was created but emails could not be sent`;
          }
        } else if (eventData.csvFile) {
          successMessage += `

📧 **CSV File Processed**
• **Volunteers Found:** ${eventData.csvFile.name}
• **Note:** Emails will be sent automatically`;
        }

        successMessage += `

Your new blood drive event has been added to the calendar and is now active. You can view it on the dashboard or ask me about it anytime!`;

        addMessage(activeSessionId, {
          type: "assistant",
          content: successMessage,
          actions: [{
            type: "event_created",
            status: "completed",
            details: `Created event: ${eventData.name}${emailResult?.success ? ` and sent ${emailResult.details?.sent || 0} emails` : ''}`
          }]
        });
      }
    } catch (error) {
      console.error('Failed to create event:', error);
      
      // Add an error message to the chat
      if (activeSessionId) {
    addMessage(activeSessionId, {
          type: "assistant",
          content: `❌ **Failed to Create Event**

There was an error creating your event. Please try again.`,
          actions: [{
            type: "event_created",
            status: "failed",
            details: `Failed to create event: ${eventData.name}`
          }]
        });
      }
    }
  }

  const analyzeCSVContent = async (csvFiles: File[], userQuestion: string, conversationHistory: any[]): Promise<AIResponse> => {
    console.log('Analyzing CSV content for user question:', userQuestion)
    
    // Process the first CSV file
    const file = csvFiles[0]
    
    try {
      // Parse the CSV to understand its content
      const contacts = await CSVReader.parseCSVFile(file)
      console.log('Parsed contacts for analysis:', contacts)
      
      if (contacts.length === 0) {
        return {
          content: `I found the CSV file "${file.name}" but couldn't extract any valid contact information from it. The file might be empty or not in the expected format.`,
          actions: [{
            type: "data_query",
            status: "failed",
            details: "No valid contacts found in CSV"
          }]
        }
      }
      
      // Analyze the CSV content
      const totalContacts = contacts.length
      const emailCount = contacts.filter(c => c.email).length
      const nameCount = contacts.filter(c => c.firstName || c.lastName).length
      
      // Get sample data for analysis
      const sampleContacts = contacts.slice(0, 3)
      const sampleData = sampleContacts.map(contact => ({
        email: contact.email,
        name: contact.firstName && contact.lastName ? `${contact.firstName} ${contact.lastName}` : contact.firstName || contact.lastName || 'No name provided',
        organization: contact.organization || 'No organization provided'
      }))
      
      // Create a detailed analysis response
      let analysisContent = `📊 **CSV File Analysis: "${file.name}"**\n\n`
      
      analysisContent += `**File Overview:**\n`
      analysisContent += `• Total rows: ${totalContacts}\n`
      analysisContent += `• Valid email addresses: ${emailCount}\n`
      analysisContent += `• Contacts with names: ${nameCount}\n\n`
      
      analysisContent += `**What you can do with this data:**\n`
      analysisContent += `• 📧 Send personalized email campaigns\n`
      analysisContent += `• 📊 Track engagement and responses\n`
      analysisContent += `• 🎯 Target specific groups for events\n`
      analysisContent += `• 📱 Follow up with phone calls if needed\n\n`
      
      analysisContent += `**Ready to send emails?** Just ask me to "send emails to these contacts" or "create a campaign" and I'll help you set up personalized outreach!`
      
      return {
        content: analysisContent,
        actions: [{
          type: "data_query",
          status: "completed",
          details: `Analyzed ${totalContacts} contacts from CSV file`
        }],
        // Add CSV data for table visualization
        csvData: {
          contacts,
          fileName: file.name
        }
      }
      
    } catch (error) {
      console.error('Error analyzing CSV file:', error)
      return {
        content: `I encountered an error analyzing your CSV file: ${error instanceof Error ? error.message : 'Unknown error'}. Please check that your file has proper email addresses and at least one name column.`,
        actions: [{
          type: "data_query",
          status: "failed",
          details: "Error analyzing CSV file"
        }]
      }
    }
  }

  const handleCSVFilesWithContext = async (csvFiles: File[], context: string, conversationHistory: any[]): Promise<AIResponse> => {
    console.log('Processing CSV files with context:', csvFiles.map(f => f.name), 'Context:', context)
    
    // Process the first CSV file (we'll handle multiple files later if needed)
    const file = csvFiles[0]
    
    try {
      // Process CSV data first
      console.log('Processing CSV data')
      const contacts = await CSVReader.parseCSVFile(file)
      console.log('Processed contacts:', contacts)

      if (contacts.length === 0) {
        throw new Error('No valid contacts found in the CSV file. Please check that your file has proper email addresses and at least one name column.')
      }

      // Create a proper AI response with actual CSV data
      const aiResponse: AIResponse = {
        content: `✅ CSV file "${file.name}" uploaded successfully!

I found ${contacts.length} contacts in your file. I'm now processing the email addresses and preparing to send personalized emails through AgentMail.

**What I'm doing:**
1. 📧 Extracting email addresses, first names, and last names
2. 🤖 Setting up AgentMail campaign
3. 📨 Preparing personalized email templates
4. 🚀 Starting the email campaign

Your contacts will receive personalized emails about the upcoming blood drive event!`,
        actions: [{
          type: 'csv_processed',
          status: 'completed',
          details: `Successfully processed ${contacts.length} contacts from ${file.name}`
        }],
        // Add CSV data for table visualization
        csvData: {
          contacts,
          fileName: file.name
        }
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
        
        // Use context to customize the email template if provided
        let emailTemplate = {
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

        // Use the standard email template without including user context
        // The context is only used for AI processing, not for the actual email content

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
          console.log('Emails sent successfully via AgentMail:', result)
          
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
          console.error('Failed to send emails via AgentMail:', errorData)
          
          // Update the AI response to include email sending failure
          aiResponse.content += `\n\n⚠️ **Email Sending Issue**\nI processed your CSV file successfully, but encountered an issue sending emails. ${errorData.details || 'Please check your email configuration.'}`
        }
      } catch (error) {
        console.error('Error sending emails via AgentMail:', error)
        
        // Update the AI response to include email sending error
        aiResponse.content += `\n\n⚠️ **Email Sending Error**\nI processed your CSV file successfully, but encountered an error sending emails. Please try again or check your email configuration.`
      }

      return aiResponse
    } catch (error) {
      console.error('Error processing CSV file:', error)
      return {
        content: `I encountered an error processing your CSV file: ${error instanceof Error ? error.message : 'Unknown error'}. Please check that your file has proper email addresses and at least one name column.`,
        actions: [{
          type: "data_query",
          status: "failed",
          details: "Error processing CSV file"
        }]
      }
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
                    <div className="text-sm prose prose-sm max-w-none">
                      {message.content.split('\n').map((line, index) => {
                        // Handle bold text with **
                        if (line.includes('**')) {
                          const parts = line.split(/(\*\*.*?\*\*)/g)
                          return (
                            <p key={index} className="mb-2">
                              {parts.map((part, partIndex) => {
                                if (part.startsWith('**') && part.endsWith('**')) {
                                  return <strong key={partIndex}>{part.slice(2, -2)}</strong>
                                }
                                return part
                              })}
                            </p>
                          )
                        }
                        return <p key={index} className="mb-2">{line}</p>
                      })}
                      
                      {/* Add Create Event button to the default welcome message */}
                      {message.content.includes("Hello! I'm your intelligent Blood Drive AI Assistant") && (
                        <div className="mt-4 pt-4 border-t border-muted-foreground/20">
                          <EventCreationModal onEventCreated={handleEventCreated}>
                            <Button className="w-full" variant="outline">
                              <Plus className="mr-2 h-4 w-4" />
                              Create New Blood Drive Event
                            </Button>
                          </EventCreationModal>
                        </div>
                      )}
                    </div>
                    
                    {/* CSV Table Visualization */}
                    {message.csvData && (
                      <div className="mt-4">
                        <CSVTableVisualization 
                          contacts={message.csvData.contacts}
                          fileName={message.csvData.fileName}
                        />
                      </div>
                    )}
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
          {/* Attached Files Display */}
          {attachedFiles.length > 0 && (
            <div className="mb-3 p-2 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Upload className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Attached Files:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {attachedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 px-2 py-1 bg-background border rounded-md text-sm"
                  >
                    <span className="text-muted-foreground">{file.name}</span>
                    <button
                      onClick={() => removeAttachedFile(index)}
                      className="text-muted-foreground hover:text-foreground"
                      disabled={isProcessing}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
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
              placeholder={attachedFiles.length > 0 ? "Add context for your attached files..." : "Ask about your dashboard data or attach a CSV file..."}
              onKeyPress={(e) => e.key === "Enter" && !isProcessing && handleSendMessage()}
              className="flex-1"
              disabled={isProcessing}
            />
            <Button
              onClick={handleSendMessage}
              disabled={(!inputValue.trim() && attachedFiles.length === 0) || isProcessing}
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
            {attachedFiles.length > 0 
              ? "Add context for your CSV file or send it as-is for automated donor outreach"
              : "Upload CSV files for automated donor outreach or ask questions about your dashboard data"
            }
          </p>
        </div>
      </div>
    </div>
  )
}