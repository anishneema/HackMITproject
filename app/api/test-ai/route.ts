import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export async function GET() {
  try {
    // Check if API key exists
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({
        error: 'API key not found',
        details: 'ANTHROPIC_API_KEY is not set in environment variables'
      }, { status: 500 })
    }

    // Test the API key
    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    })

    const response = await client.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 50,
      messages: [
        { role: 'user', content: 'Say "API key is working!" and nothing else.' }
      ]
    })

    const content = response.content[0].type === 'text' ? response.content[0].text : 'No text content'

    return NextResponse.json({
      success: true,
      message: 'API key is working',
      response: content,
      keyPrefix: process.env.ANTHROPIC_API_KEY?.substring(0, 20) + '...'
    })

  } catch (error) {
    console.error('API key test error:', error)
    return NextResponse.json({
      error: 'API key test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      keyExists: !!process.env.ANTHROPIC_API_KEY,
      keyPrefix: process.env.ANTHROPIC_API_KEY ? process.env.ANTHROPIC_API_KEY.substring(0, 20) + '...' : 'Not found'
    }, { status: 500 })
  }
}