import { csvProcessor, ContactData } from './csv-processor'
import { agentMailService } from './agent-mail-service'

export interface AIAction {
  id: string
  type: 'update_contact' | 'schedule_followup' | 'categorize_contact' | 'send_personalized_response'
  contactEmail: string
  contactName: string
  action: string
  reason: string
  timestamp: Date
  status: 'pending' | 'completed' | 'failed'
}

class AIDataManager {
  private actions: AIAction[] = []
  private processingQueue: AIAction[] = []

  async analyzeAndUpdateContact(email: string, messageContent: string, context?: any): Promise<AIAction[]> {
    const contact = csvProcessor.getContactByEmail(email)
    if (!contact) return []

    const actions: AIAction[] = []

    try {
      // Use AI to analyze the message and determine actions
      const analysisPrompt = `
Analyze this email response and determine what actions should be taken for contact management:

Contact: ${contact.name} (${contact.email})
Current Status: ${contact.status || 'unknown'}
Location: ${contact.location || 'unknown'}
Interests: ${contact.interests || 'unknown'}

Email Message: "${messageContent}"

Based on this information, determine:
1. Should we update their contact status? (interested/not_interested/needs_followup/scheduled)
2. Should we update their interests or preferences?
3. Should we schedule a follow-up?
4. Are there any specific details to note?

Respond in this JSON format:
{
  "statusUpdate": "new_status_or_null",
  "interestsUpdate": "updated_interests_or_null",
  "locationUpdate": "updated_location_or_null",
  "needsFollowup": true_or_false,
  "followupReason": "reason_for_followup_or_null",
  "personalizedResponse": "suggested_personalized_response_or_null",
  "notes": "any_additional_notes"
}
`

      const aiResponse = await this.callAI(analysisPrompt)
      const analysis = this.parseAIResponse(aiResponse)

      // Create actions based on AI analysis
      if (analysis.statusUpdate && analysis.statusUpdate !== contact.status) {
        actions.push(this.createAction('update_contact', email, contact.name,
          `Update status to: ${analysis.statusUpdate}`,
          `AI detected status change based on message content`))
      }

      if (analysis.interestsUpdate && analysis.interestsUpdate !== contact.interests) {
        actions.push(this.createAction('update_contact', email, contact.name,
          `Update interests to: ${analysis.interestsUpdate}`,
          `AI identified new interests from message`))
      }

      if (analysis.needsFollowup) {
        actions.push(this.createAction('schedule_followup', email, contact.name,
          `Schedule follow-up: ${analysis.followupReason}`,
          `AI determined follow-up is needed`))
      }

      if (analysis.personalizedResponse) {
        actions.push(this.createAction('send_personalized_response', email, contact.name,
          `Send personalized response: ${analysis.personalizedResponse.substring(0, 100)}...`,
          `AI generated personalized response based on context`))
      }

      // Execute high-priority actions immediately
      for (const action of actions) {
        if (action.type === 'update_contact') {
          await this.executeAction(action)
        } else {
          this.processingQueue.push(action)
        }
      }

    } catch (error) {
      console.error('Error in AI analysis:', error)
    }

    return actions
  }

  async categorizeBulkContacts(contacts: ContactData[]): Promise<void> {
    for (const contact of contacts) {
      try {
        const categorizationPrompt = `
Analyze this contact and suggest the best category and status:

Name: ${contact.name}
Email: ${contact.email}
Location: ${contact.location || 'unknown'}
Current Interests: ${contact.interests || 'unknown'}
Current Status: ${contact.status || 'unknown'}

Based on this information, suggest:
1. The most appropriate category/interest group
2. Priority level for outreach (high/medium/low)
3. Best communication approach

Respond in JSON format:
{
  "suggestedCategory": "category",
  "priority": "high/medium/low",
  "approach": "communication_approach",
  "reasoning": "explanation"
}
`

        const response = await this.callAI(categorizationPrompt)
        const categorization = this.parseAIResponse(response)

        // Apply AI suggestions
        const updates: Partial<ContactData> = {}

        if (categorization.suggestedCategory && categorization.suggestedCategory !== contact.interests) {
          updates.interests = categorization.suggestedCategory
        }

        if (categorization.priority) {
          updates.priority = categorization.priority
        }

        if (Object.keys(updates).length > 0) {
          await csvProcessor.updateContactData(contact.email, updates)

          const action = this.createAction('categorize_contact', contact.email, contact.name,
            `AI categorized as: ${categorization.suggestedCategory} (${categorization.priority} priority)`,
            categorization.reasoning || 'AI analysis completed')

          this.actions.push(action)
          action.status = 'completed'
        }

      } catch (error) {
        console.error(`Error categorizing contact ${contact.email}:`, error)
      }

      // Small delay to avoid overwhelming the AI service
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }

  async processQueuedActions(): Promise<void> {
    while (this.processingQueue.length > 0) {
      const action = this.processingQueue.shift()
      if (action) {
        await this.executeAction(action)
      }
    }
  }

  private async executeAction(action: AIAction): Promise<void> {
    try {
      action.status = 'pending'

      switch (action.type) {
        case 'update_contact':
          await this.executeContactUpdate(action)
          break
        case 'schedule_followup':
          await this.executeScheduleFollowup(action)
          break
        case 'send_personalized_response':
          await this.executeSendResponse(action)
          break
        case 'categorize_contact':
          // Already handled in categorization
          break
      }

      action.status = 'completed'
      console.log(`AI Action completed: ${action.action}`)

    } catch (error) {
      action.status = 'failed'
      console.error(`AI Action failed: ${action.action}`, error)
    }

    this.actions.push(action)
  }

  private async executeContactUpdate(action: AIAction): Promise<void> {
    const contact = csvProcessor.getContactByEmail(action.contactEmail)
    if (!contact) return

    // Extract update from action
    if (action.action.includes('status to:')) {
      const newStatus = action.action.split('status to:')[1].trim()
      await csvProcessor.updateContactData(action.contactEmail, { status: newStatus })
    }

    if (action.action.includes('interests to:')) {
      const newInterests = action.action.split('interests to:')[1].trim()
      await csvProcessor.updateContactData(action.contactEmail, { interests: newInterests })
    }
  }

  private async executeScheduleFollowup(action: AIAction): Promise<void> {
    // For now, just mark the contact as needing follow-up
    await csvProcessor.updateContactData(action.contactEmail, {
      status: 'needs_followup',
      lastContact: new Date().toISOString().split('T')[0]
    })
  }

  private async executeSendResponse(action: AIAction): Promise<void> {
    const contact = csvProcessor.getContactByEmail(action.contactEmail)
    if (!contact) return

    // Generate personalized response using context
    const contextualResponse = await agentMailService.generateContextualResponse(
      `Follow up with ${contact.name} based on their recent interaction`,
      contact.email
    )

    // For demo, we'll log the response instead of actually sending
    console.log(`AI would send personalized response to ${contact.email}: ${contextualResponse.substring(0, 100)}...`)
  }

  private async callAI(prompt: string): Promise<string> {
    // For demo purposes, return mock AI responses
    // In production, this would call the actual AI service

    if (prompt.includes('analyze this email response')) {
      return JSON.stringify({
        statusUpdate: 'interested',
        interestsUpdate: 'blood donation volunteer',
        locationUpdate: null,
        needsFollowup: false,
        followupReason: null,
        personalizedResponse: 'Thank you for your interest! I\'ll send you event details soon.',
        notes: 'Contact shows positive engagement'
      })
    }

    if (prompt.includes('suggest the best category')) {
      return JSON.stringify({
        suggestedCategory: 'healthcare volunteer',
        priority: 'high',
        approach: 'direct_email',
        reasoning: 'Contact has healthcare background and shows interest in volunteering'
      })
    }

    return JSON.stringify({ status: 'processed' })
  }

  private parseAIResponse(response: string): any {
    try {
      return JSON.parse(response)
    } catch (error) {
      console.error('Failed to parse AI response:', error)
      return {}
    }
  }

  private createAction(
    type: AIAction['type'],
    email: string,
    name: string,
    action: string,
    reason: string
  ): AIAction {
    return {
      id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      contactEmail: email,
      contactName: name,
      action,
      reason,
      timestamp: new Date(),
      status: 'pending'
    }
  }

  getRecentActions(limit: number = 20): AIAction[] {
    return this.actions
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit)
  }

  getActionStats() {
    const total = this.actions.length
    const completed = this.actions.filter(a => a.status === 'completed').length
    const pending = this.processingQueue.length
    const failed = this.actions.filter(a => a.status === 'failed').length

    return {
      total,
      completed,
      pending,
      failed,
      successRate: total > 0 ? (completed / total) * 100 : 0
    }
  }
}

export const aiDataManager = new AIDataManager()
export default aiDataManager