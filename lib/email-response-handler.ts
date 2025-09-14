import { agentMailConversationService, AgentMailMessage } from './agentmail-conversation-service'
import Anthropic from '@anthropic-ai/sdk'

export interface EmailResponseContext {
  organizationName: string
  organizationMission: string
  contactInfo: string
  currentEvents: Array<{
    name: string
    date: string
    location: string
    description: string
  }>
  faqData: Array<{
    question: string
    answer: string
  }>
}

export interface ProcessedEmailResponse {
  success: boolean
  messageId: string
  from: string
  subject: string
  originalContent: string
  generatedResponse: string
  sentResponse: boolean
  error?: string
}

export class EmailResponseHandler {
  private anthropic: Anthropic
  private context: EmailResponseContext
  private isInitialized = false
  private isRunning = false

  constructor() {
    this.initializeClaudeClient()
    this.context = this.getDefaultContext()
  }

  private initializeClaudeClient() {
    const apiKey = process.env.ANTHROPIC_API_KEY

    if (!apiKey) {
      console.error('❌ Anthropic API key not found in environment variables')
      return
    }

    try {
      this.anthropic = new Anthropic({
        apiKey: apiKey
      })
      this.isInitialized = true
      console.log('✅ Claude API client initialized for email responses')
    } catch (error) {
      console.error('❌ Failed to initialize Claude client:', error)
    }
  }

  private getDefaultContext(): EmailResponseContext {
    return {
      organizationName: 'Red Cross Events',
      organizationMission: 'Organizing blood drives and humanitarian events to help save lives',
      contactInfo: 'For urgent matters, please call our hotline or visit our website',
      currentEvents: [
        {
          name: 'Community Blood Drive',
          date: 'This Saturday, 9:00 AM - 3:00 PM',
          location: 'Community Center',
          description: 'Join us for our monthly blood drive. All blood types needed!'
        }
      ],
      faqData: [
        {
          question: 'How long does a blood donation take?',
          answer: 'The entire process typically takes 1-2 hours, with the actual donation taking about 10 minutes.'
        },
        {
          question: 'Who can donate blood?',
          answer: 'Most healthy adults over 16 can donate blood. Some restrictions apply based on recent travel, medications, and health conditions.'
        },
        {
          question: 'How often can I donate?',
          answer: 'You can donate whole blood every 8 weeks (56 days).'
        }
      ]
    }
  }

  updateContext(newContext: Partial<EmailResponseContext>) {
    this.context = { ...this.context, ...newContext }
    console.log('📝 Updated email response context')
  }

  async processIncomingEmails(): Promise<ProcessedEmailResponse[]> {
    if (!this.isInitialized) {
      console.error('❌ Email response handler not initialized')
      return []
    }

    if (this.isRunning) {
      console.log('⏳ Email processing already running...')
      return []
    }

    this.isRunning = true
    console.log('📥 Starting to process incoming emails...')

    try {
      // Get unread messages from AgentMail
      const unreadMessages = await agentMailConversationService.getUnreadMessages()
      console.log(`📬 Found ${unreadMessages.length} unread messages to process`)

      const processedResponses: ProcessedEmailResponse[] = []

      for (const message of unreadMessages) {
        try {
          // Skip emails from our own inbox to avoid loops
          const inboxEmail = process.env.AGENT_MAIL_INBOX || 'orcha@agentmail.to'
          if (message.from.includes(inboxEmail)) {
            console.log(`⏭️ Skipping email from our own inbox: ${message.from}`)
            continue
          }

          console.log(`📧 Processing email from ${message.from}: "${message.subject}"`)

          // Generate intelligent response using Claude
          const response = await this.generateEmailResponse(message)

          if (response.success && response.generatedResponse) {
            // Send response via AgentMail
            const sent = await agentMailConversationService.sendReply(
              message.id,
              response.generatedResponse,
              response.subject
            )

            processedResponses.push({
              ...response,
              sentResponse: sent
            })

            if (sent) {
              // Mark original message as read
              await agentMailConversationService.markAsRead(message.id)
              console.log(`✅ Successfully responded to email from ${message.from}`)
            } else {
              console.error(`❌ Failed to send response to ${message.from}`)
            }
          } else {
            console.error(`❌ Failed to generate response for email from ${message.from}:`, response.error)
            processedResponses.push(response)
          }

          // Add configurable delay to avoid rate limiting
          const delay = parseInt(process.env.EMAIL_PROCESSING_DELAY || '0')
          if (delay > 0) {
            await new Promise(resolve => setTimeout(resolve, delay))
          }

        } catch (error) {
          console.error(`❌ Error processing email from ${message.from}:`, error)
          processedResponses.push({
            success: false,
            messageId: message.id,
            from: message.from,
            subject: message.subject,
            originalContent: message.text || '',
            generatedResponse: '',
            sentResponse: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }

      console.log(`✅ Finished processing emails. Processed: ${processedResponses.length}`)
      return processedResponses

    } catch (error) {
      console.error('❌ Error in email processing workflow:', error)
      return []
    } finally {
      this.isRunning = false
    }
  }

  private async generateEmailResponse(message: AgentMailMessage): Promise<ProcessedEmailResponse> {
    try {
      console.log(`🤖 Generating Claude response for email: "${message.subject}"`)

      const prompt = this.buildResponsePrompt(message)

      const response = await this.anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })

      const generatedResponse = response.content[0]?.type === 'text'
        ? response.content[0].text
        : 'Unable to generate response'

      console.log('✅ Claude response generated successfully')

      // Determine response subject
      let responseSubject = message.subject
      if (!responseSubject.toLowerCase().startsWith('re:')) {
        responseSubject = `Re: ${responseSubject}`
      }

      return {
        success: true,
        messageId: message.id,
        from: message.from,
        subject: responseSubject,
        originalContent: message.text || '',
        generatedResponse: generatedResponse,
        sentResponse: false
      }

    } catch (error) {
      console.error('❌ Failed to generate Claude response:', error)

      return {
        success: false,
        messageId: message.id,
        from: message.from,
        subject: message.subject,
        originalContent: message.text || '',
        generatedResponse: '',
        sentResponse: false,
        error: error instanceof Error ? error.message : 'Failed to generate response'
      }
    }
  }

  private buildResponsePrompt(message: AgentMailMessage): string {
    return `You are an AI assistant representing ${this.context.organizationName}, a ${this.context.organizationMission}.

Please analyze the following email and generate an appropriate, helpful, and professional response:

INCOMING EMAIL:
From: ${message.from}
Subject: ${message.subject}
Content: ${message.text || 'No text content available'}

ORGANIZATION CONTEXT:
- Organization: ${this.context.organizationName}
- Mission: ${this.context.organizationMission}
- Contact Info: ${this.context.contactInfo}

CURRENT EVENTS:
${this.context.currentEvents.map(event =>
  `- ${event.name}: ${event.date} at ${event.location}\n  ${event.description}`
).join('\n')}

FREQUENTLY ASKED QUESTIONS:
${this.context.faqData.map(faq =>
  `Q: ${faq.question}\nA: ${faq.answer}`
).join('\n\n')}

RESPONSE GUIDELINES:
1. Be warm, professional, and helpful
2. Address the sender's specific questions or concerns
3. Provide relevant information about our events if appropriate
4. Include contact information for follow-up if needed
5. Keep the response concise but informative
6. Match the tone of the original email (formal vs casual)
7. If it's a question about blood donation, provide helpful FAQ information
8. If they're interested in volunteering or participating, provide event details
9. Always end with a clear call-to-action or next step

Generate only the email response content (no subject line, just the body). Begin directly with the response without any preamble.`
  }

  async testEmailWorkflow(): Promise<{
    connectionTest: boolean
    messagesRetrieved: number
    claudeTest: boolean
    overallStatus: 'success' | 'partial' | 'failed'
  }> {
    console.log('🧪 Testing complete email response workflow...')

    try {
      // Test AgentMail connection
      const connectionTest = await agentMailConversationService.testConnection()
      console.log(`📡 AgentMail connection: ${connectionTest ? '✅' : '❌'}`)

      // Test message retrieval
      const messages = await agentMailConversationService.getInboxMessages(5)
      console.log(`📥 Message retrieval: ${messages.length} messages found`)

      // Test Claude API
      let claudeTest = false
      if (this.isInitialized) {
        try {
          const testResponse = await this.anthropic.messages.create({
            model: 'claude-3-haiku-20240307',
            max_tokens: 100,
            messages: [{ role: 'user', content: 'Test message - please respond with "Test successful"' }]
          })
          claudeTest = testResponse.content[0]?.type === 'text'
          console.log(`🤖 Claude API: ${claudeTest ? '✅' : '❌'}`)
        } catch (error) {
          console.log('🤖 Claude API: ❌', error)
        }
      } else {
        console.log('🤖 Claude API: ❌ Not initialized')
      }

      // Determine overall status
      let overallStatus: 'success' | 'partial' | 'failed'
      if (connectionTest && claudeTest) {
        overallStatus = 'success'
      } else if (connectionTest || claudeTest) {
        overallStatus = 'partial'
      } else {
        overallStatus = 'failed'
      }

      console.log(`🏁 Overall test status: ${overallStatus}`)

      return {
        connectionTest,
        messagesRetrieved: messages.length,
        claudeTest,
        overallStatus
      }

    } catch (error) {
      console.error('❌ Email workflow test failed:', error)
      return {
        connectionTest: false,
        messagesRetrieved: 0,
        claudeTest: false,
        overallStatus: 'failed'
      }
    }
  }

  isReady(): boolean {
    return this.isInitialized
  }

  getCurrentContext(): EmailResponseContext {
    return { ...this.context }
  }
}

export const emailResponseHandler = new EmailResponseHandler()