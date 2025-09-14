import { NextRequest, NextResponse } from 'next/server'
import { emailResponseHandler, EmailResponseContext } from '@/lib/email-response-handler'

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Starting email response processing...')

    // Process all incoming emails and generate responses
    const processedEmails = await emailResponseHandler.processIncomingEmails()

    const successCount = processedEmails.filter(email => email.success && email.sentResponse).length
    const failedCount = processedEmails.length - successCount

    console.log(`✅ Email processing completed: ${successCount} successful, ${failedCount} failed`)

    return NextResponse.json({
      success: true,
      message: `Processed ${processedEmails.length} emails`,
      results: {
        total: processedEmails.length,
        successful: successCount,
        failed: failedCount,
        details: processedEmails.map(email => ({
          from: email.from,
          subject: email.subject,
          success: email.success,
          sentResponse: email.sentResponse,
          error: email.error
        }))
      }
    })

  } catch (error) {
    console.error('❌ Error in email response API:', error)

    return NextResponse.json({
      success: false,
      error: 'Failed to process email responses',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    console.log('📝 Updating email response context...')

    const body = await request.json()
    const contextUpdate: Partial<EmailResponseContext> = body

    // Validate the context update
    if (contextUpdate.currentEvents) {
      if (!Array.isArray(contextUpdate.currentEvents)) {
        return NextResponse.json({
          success: false,
          error: 'currentEvents must be an array'
        }, { status: 400 })
      }
    }

    if (contextUpdate.faqData) {
      if (!Array.isArray(contextUpdate.faqData)) {
        return NextResponse.json({
          success: false,
          error: 'faqData must be an array'
        }, { status: 400 })
      }
    }

    // Update the context
    emailResponseHandler.updateContext(contextUpdate)

    console.log('✅ Email response context updated successfully')

    return NextResponse.json({
      success: true,
      message: 'Email response context updated successfully',
      currentContext: emailResponseHandler.getCurrentContext()
    })

  } catch (error) {
    console.error('❌ Error updating email response context:', error)

    return NextResponse.json({
      success: false,
      error: 'Failed to update email response context',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    console.log('📋 Getting email response handler status...')

    // Get current status and context
    const isReady = emailResponseHandler.isReady()
    const currentContext = emailResponseHandler.getCurrentContext()

    // Run workflow test
    const testResults = await emailResponseHandler.testEmailWorkflow()

    return NextResponse.json({
      success: true,
      status: {
        isReady,
        overallStatus: testResults.overallStatus,
        agentMailConnection: testResults.connectionTest,
        claudeAPIReady: testResults.claudeTest,
        messagesAvailable: testResults.messagesRetrieved
      },
      context: currentContext,
      testResults
    })

  } catch (error) {
    console.error('❌ Error getting email response status:', error)

    return NextResponse.json({
      success: false,
      error: 'Failed to get email response status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}