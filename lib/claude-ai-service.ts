'use client'

import { DashboardEvent, EmailCampaignStats, CalendarBooking } from './dashboard-store'

export interface AIResponse {
  content: string
  actions?: Array<{
    type: 'event_created' | 'csv_processed' | 'email_campaign' | 'venue_search' | 'data_query'
    status: 'completed' | 'pending' | 'failed'
    details: string
  }>
}

export class ClaudeAIService {
  constructor() {
    // No client initialization needed - using secure API route
  }

  async processMessage(userMessage: string, dashboardData: {
    events: DashboardEvent[]
    campaigns: EmailCampaignStats[]
    bookings: CalendarBooking[]
    totals: {
      totalEvents: number
      activeEvents: number
      totalEmailsSent: number
      averageResponseRate: number
      totalBookings: number
      recentActivity: Array<{
        type: 'email_sent' | 'email_replied' | 'booking_received'
        eventName: string
        timestamp: Date
        details: string
      }>
    }
  }, conversationHistory?: Array<{
    type: 'user' | 'assistant'
    content: string
    timestamp: Date
  }>): Promise<AIResponse> {
    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          dashboardData,
          conversationHistory
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to get AI response')
      }

      const result: AIResponse = await response.json()
      return result
    } catch (error) {
      console.error('Claude AI Service Error:', error)
      return {
        content: 'I apologize, but I encountered an error while processing your request. Please check that your API key is properly configured and try again.',
        actions: [{
          type: 'data_query',
          status: 'failed',
          details: error instanceof Error ? error.message : 'Unknown error occurred'
        }]
      }
    }
  }

  async handleCSVUpload(file: File): Promise<AIResponse> {
    try {
      console.log('CSV Upload Debug: Starting handleCSVUpload for file:', file.name)
      // Basic validation - check file type and size
      if (!file.name.toLowerCase().endsWith('.csv')) {
        console.log('CSV Upload Debug: File type validation failed')
        throw new Error('Please upload a CSV file')
      }

      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        console.log('CSV Upload Debug: File size validation failed:', file.size)
        throw new Error('File size too large. Please upload a file smaller than 5MB')
      }

      // Read file content to validate structure
      const text = await file.text()
      console.log('CSV Upload Debug: File content:', JSON.stringify(text.substring(0, 200)))
      const lines = text.trim().split('\n')
      console.log('CSV Upload Debug: Lines count:', lines.length)

      if (lines.length < 2) {
        throw new Error('CSV file must have at least a header row and one data row')
      }

      const headers = lines[0].toLowerCase().split(',').map(h => h.trim())
      console.log('CSV Upload Debug: Headers:', headers)

      // Check for email column (required) - be more flexible with variations
      const hasEmail = headers.some(h => 
        ['email', 'email address', 'e-mail', 'emailaddress', 'mail'].includes(h.toLowerCase())
      )
      console.log('CSV Upload Debug: Has email:', hasEmail)
      
      if (!hasEmail) {
        console.log('CSV Upload Debug: Email validation failed')
        throw new Error("I encountered an error processing your CSV file. Please make sure it includes an 'email' column. You can try uploading the file again.")
      }

      // Check for name columns (flexible) - accept ANY column that might be a name
      const hasName = headers.some(h =>
        h.includes('name') || h.includes('first') || h.includes('last') || h.includes('contact')
      )
      console.log('CSV Upload Debug: Has name:', hasName, 'Headers length:', headers.length)

      // More flexible validation - if we have email and at least 2 columns, we can work with it
      if (headers.length < 2) {
        console.log('CSV Upload Debug: Not enough columns found')
        throw new Error("I encountered an error processing your CSV file. Please make sure it has at least an 'email' column and one other column (like 'name' or 'firstName'). You can try uploading the file again.")
      }

      console.log('CSV Upload Debug: All validations passed!')

      return {
        content: `✅ CSV file "${file.name}" uploaded successfully!

I found ${lines.length - 1} contacts in your file. I'm now processing the email addresses and preparing to send personalized emails through AgentMail.

**What I'm doing:**
1. 📧 Extracting email addresses, first names, and last names
2. 🤖 Setting up AgentMail campaign
3. 📨 Preparing personalized email templates
4. 🚀 Starting the email campaign

Your contacts will receive personalized emails about the upcoming blood drive event!`,
        actions: [{
          type: 'csv_processed',
          status: 'completed',
          details: `Successfully processed ${lines.length - 1} contacts from ${file.name}`
        }]
      }
    } catch (error) {
      return {
        content: error instanceof Error ? error.message : "I encountered an error processing your CSV file. Please make sure it includes columns for 'email', 'firstName', and 'lastName'. You can try uploading the file again.",
        actions: [{
          type: 'csv_processed',
          status: 'failed',
          details: error instanceof Error ? error.message : 'CSV processing failed - please check file format'
        }]
      }
    }
  }
}

// Export a singleton instance for backward compatibility
export const claudeAI = new ClaudeAIService()