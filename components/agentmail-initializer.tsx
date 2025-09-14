'use client'

import { useEffect, useRef } from 'react'
import { agentMailService } from '@/lib/agent-mail-service'
import { addSampleEvents } from '@/lib/sample-data'

export function AgentMailInitializer() {
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) {
      return
    }
    initialized.current = true
    const initializeAgentMail = async () => {
      try {
        // Add sample data for demo
        addSampleEvents()

        // Initialize AgentMail service with API key from environment
        const apiKey = process.env.NEXT_PUBLIC_AGENT_MAIL_API_KEY || process.env.AGENT_MAIL_API_KEY
        if (apiKey) {
          agentMailService.initialize({ apiKey })
        } else {
          console.warn('AgentMail API key not found in environment variables')
        }

        if (agentMailService.isReady()) {
          console.log('AgentMail service initialized successfully')

          // Add event listener for real-time updates
          agentMailService.addEventListener((event) => {
            console.log('AgentMail event received:', event)
          })

          // Test the context system
          const context = agentMailService.getDashboardContext()
          console.log('Dashboard context for AI:', context)

          // Test a sample contextual response
          const sampleResponse = await agentMailService.generateContextualResponse(
            'When is the next blood drive event?',
            'test@example.com'
          )
          console.log('Sample contextual response:', sampleResponse)

        } else {
          console.warn('AgentMail service failed to initialize - check API key configuration')
        }
      } catch (error) {
        console.error('Failed to initialize AgentMail service:', error)
      }
    }

    initializeAgentMail()
  }, [])

  return null // This component doesn't render anything
}