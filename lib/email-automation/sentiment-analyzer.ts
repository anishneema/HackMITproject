import { EmailReply } from './types'

export type SentimentScore = {
  sentiment: 'positive' | 'negative' | 'neutral' | 'question'
  confidence: number
  keywords: string[]
  isQuestion: boolean
  urgency: 'low' | 'medium' | 'high'
}

export interface SentimentAnalyzer {
  analyzeSentiment(text: string): Promise<SentimentScore>
  analyzeEmail(email: EmailReply): Promise<SentimentScore>
}

export class RuleBasedSentimentAnalyzer implements SentimentAnalyzer {
  private positiveKeywords = [
    'thank', 'thanks', 'grateful', 'appreciate', 'excellent', 'great', 'good',
    'perfect', 'wonderful', 'amazing', 'fantastic', 'love', 'like', 'yes',
    'absolutely', 'definitely', 'pleased', 'happy', 'satisfied', 'impressed',
    'helpful', 'useful', 'brilliant', 'outstanding', 'superb'
  ]

  private negativeKeywords = [
    'bad', 'terrible', 'awful', 'horrible', 'hate', 'dislike', 'angry', 'mad',
    'frustrated', 'annoyed', 'disappointed', 'upset', 'concerned', 'worried',
    'problem', 'issue', 'error', 'wrong', 'fail', 'failed', 'broken',
    'unacceptable', 'ridiculous', 'waste', 'worst', 'never', 'refuse',
    'complaint', 'complain', 'dissatisfied', 'unhappy'
  ]

  private questionWords = [
    'how', 'what', 'when', 'where', 'why', 'who', 'which', 'can', 'could',
    'would', 'should', 'will', 'do', 'does', 'did', 'is', 'are', 'was', 'were'
  ]

  private urgentKeywords = [
    'urgent', 'asap', 'immediately', 'emergency', 'critical', 'important',
    'deadline', 'quick', 'quickly', 'soon', 'now', 'today', 'tomorrow',
    'help', 'please help', 'need help', 'stuck', 'blocked', 'escalate'
  ]

  async analyzeSentiment(text: string): Promise<SentimentScore> {
    const normalizedText = text.toLowerCase()
    const words = normalizedText.split(/\s+/)

    let positiveScore = 0
    let negativeScore = 0
    let questionScore = 0
    let urgencyScore = 0

    const foundKeywords: string[] = []

    for (const word of words) {
      if (this.positiveKeywords.some(keyword => word.includes(keyword))) {
        positiveScore++
        foundKeywords.push(word)
      }
      if (this.negativeKeywords.some(keyword => word.includes(keyword))) {
        negativeScore++
        foundKeywords.push(word)
      }
      if (this.questionWords.some(keyword => word.includes(keyword))) {
        questionScore++
      }
      if (this.urgentKeywords.some(keyword => word.includes(keyword))) {
        urgencyScore++
        foundKeywords.push(word)
      }
    }

    const hasQuestionMark = text.includes('?')
    const isQuestion = questionScore > 0 || hasQuestionMark

    let sentiment: 'positive' | 'negative' | 'neutral' | 'question'
    let confidence: number

    if (isQuestion && questionScore > Math.max(positiveScore, negativeScore)) {
      sentiment = 'question'
      confidence = Math.min(0.9, 0.5 + (questionScore * 0.1))
    } else if (positiveScore > negativeScore) {
      sentiment = 'positive'
      confidence = Math.min(0.95, 0.5 + ((positiveScore - negativeScore) * 0.1))
    } else if (negativeScore > positiveScore) {
      sentiment = 'negative'
      confidence = Math.min(0.95, 0.5 + ((negativeScore - positiveScore) * 0.1))
    } else {
      sentiment = 'neutral'
      confidence = 0.6
    }

    let urgency: 'low' | 'medium' | 'high' = 'low'
    if (urgencyScore >= 3) urgency = 'high'
    else if (urgencyScore >= 1) urgency = 'medium'

    return {
      sentiment,
      confidence,
      keywords: foundKeywords,
      isQuestion,
      urgency
    }
  }

  async analyzeEmail(email: EmailReply): Promise<SentimentScore> {
    const fullText = `${email.subject} ${email.body}`
    return this.analyzeSentiment(fullText)
  }
}

export class OpenAISentimentAnalyzer implements SentimentAnalyzer {
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async analyzeSentiment(text: string): Promise<SentimentScore> {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: `You are a sentiment analyzer for customer emails. Analyze the sentiment and respond with a JSON object containing:
              - sentiment: "positive", "negative", "neutral", or "question"
              - confidence: number between 0 and 1
              - keywords: array of important words that influenced the sentiment
              - isQuestion: boolean indicating if this is primarily a question
              - urgency: "low", "medium", or "high" based on urgency indicators

              Focus on the overall tone and intent of the message.`
            },
            {
              role: 'user',
              content: `Analyze this email text: "${text}"`
            }
          ],
          max_tokens: 200,
          temperature: 0.1
        })
      })

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`)
      }

      const data = await response.json()
      const result = JSON.parse(data.choices[0].message.content)

      return {
        sentiment: result.sentiment,
        confidence: result.confidence,
        keywords: result.keywords || [],
        isQuestion: result.isQuestion,
        urgency: result.urgency
      }
    } catch (error) {
      console.error('Error with OpenAI sentiment analysis:', error)
      const fallbackAnalyzer = new RuleBasedSentimentAnalyzer()
      return fallbackAnalyzer.analyzeSentiment(text)
    }
  }

  async analyzeEmail(email: EmailReply): Promise<SentimentScore> {
    const fullText = `Subject: ${email.subject}\n\nBody: ${email.body}`
    return this.analyzeSentiment(fullText)
  }
}

export class SentimentProcessor {
  private analyzer: SentimentAnalyzer
  private processedEmails: Map<string, SentimentScore> = new Map()

  constructor(analyzer: SentimentAnalyzer) {
    this.analyzer = analyzer
  }

  async processEmails(emails: EmailReply[]): Promise<Map<string, SentimentScore>> {
    const results = new Map<string, SentimentScore>()

    for (const email of emails) {
      if (!this.processedEmails.has(email.id)) {
        try {
          const sentiment = await this.analyzer.analyzeEmail(email)
          this.processedEmails.set(email.id, sentiment)
          email.sentiment = sentiment.sentiment
          results.set(email.id, sentiment)
        } catch (error) {
          console.error(`Error processing sentiment for email ${email.id}:`, error)
        }
      } else {
        results.set(email.id, this.processedEmails.get(email.id)!)
      }
    }

    return results
  }

  getSentimentScore(emailId: string): SentimentScore | undefined {
    return this.processedEmails.get(emailId)
  }

  getEmailsByUrgency(urgency: 'low' | 'medium' | 'high'): string[] {
    return Array.from(this.processedEmails.entries())
      .filter(([, score]) => score.urgency === urgency)
      .map(([emailId]) => emailId)
  }

  getEmailsBySentiment(sentiment: 'positive' | 'negative' | 'neutral' | 'question'): string[] {
    return Array.from(this.processedEmails.entries())
      .filter(([, score]) => score.sentiment === sentiment)
      .map(([emailId]) => emailId)
  }

  getStatistics(): {
    total: number
    positive: number
    negative: number
    neutral: number
    questions: number
    highUrgency: number
    averageConfidence: number
  } {
    const scores = Array.from(this.processedEmails.values())

    return {
      total: scores.length,
      positive: scores.filter(s => s.sentiment === 'positive').length,
      negative: scores.filter(s => s.sentiment === 'negative').length,
      neutral: scores.filter(s => s.sentiment === 'neutral').length,
      questions: scores.filter(s => s.sentiment === 'question').length,
      highUrgency: scores.filter(s => s.urgency === 'high').length,
      averageConfidence: scores.length > 0
        ? scores.reduce((sum, s) => sum + s.confidence, 0) / scores.length
        : 0
    }
  }
}

export const createSentimentAnalyzer = (
  type: 'rule-based' | 'openai',
  config?: { apiKey?: string }
): SentimentAnalyzer => {
  switch (type) {
    case 'rule-based':
      return new RuleBasedSentimentAnalyzer()
    case 'openai':
      if (!config?.apiKey) {
        throw new Error('OpenAI API key required for OpenAI sentiment analyzer')
      }
      return new OpenAISentimentAnalyzer(config.apiKey)
    default:
      throw new Error(`Unsupported sentiment analyzer type: ${type}`)
  }
}