'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Mail, TrendingUp, MessageSquare, Users, Lightbulb } from 'lucide-react'
import { agentMailService } from '@/lib/agent-mail-service'
import { useDashboardStore } from '@/lib/dashboard-store'

export function EmailInsightsPanel() {
  const [insights, setInsights] = useState<{
    sentimentScore: number
    engagementRate: number
    recommendedActions: string[]
    keyTopics: string[]
  }>({
    sentimentScore: 0,
    engagementRate: 0,
    recommendedActions: [],
    keyTopics: []
  })

  const events = useDashboardStore((state) => state.events)
  const activeEvents = events.filter(e => e.status === 'active')

  useEffect(() => {
    const fetchInsights = async () => {
      if (activeEvents.length > 0) {
        try {
          // Get insights for the most recent active event
          const recentEvent = activeEvents[0]
          const eventInsights = await agentMailService.getEmailInsights(recentEvent.id)
          setInsights(eventInsights)
        } catch (error) {
          console.error('Failed to fetch email insights:', error)
        }
      }
    }

    if (agentMailService.isReady()) {
      fetchInsights()
    }
  }, [activeEvents])

  const getSentimentColor = (score: number) => {
    if (score >= 0.7) return 'text-green-600'
    if (score >= 0.4) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getSentimentText = (score: number) => {
    if (score >= 0.7) return 'Positive'
    if (score >= 0.4) return 'Neutral'
    return 'Negative'
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Email Sentiment Analysis
          </CardTitle>
          <CardDescription>
            Overall sentiment from email responses (powered by AgentMail)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Overall Sentiment</span>
                <Badge className={getSentimentColor(insights.sentimentScore)}>
                  {getSentimentText(insights.sentimentScore)}
                </Badge>
              </div>
              <Progress value={insights.sentimentScore * 100} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                Score: {(insights.sentimentScore * 100).toFixed(1)}%
              </p>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Engagement Rate</span>
                <span className="text-sm text-muted-foreground">
                  {(insights.engagementRate * 100).toFixed(1)}%
                </span>
              </div>
              <Progress value={insights.engagementRate * 100} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            AI Recommendations
          </CardTitle>
          <CardDescription>
            Actionable insights from email analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {insights.recommendedActions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No recommendations available yet. Send some emails to get AI insights!
              </p>
            ) : (
              insights.recommendedActions.slice(0, 3).map((action, index) => (
                <div key={index} className="flex items-start space-x-2">
                  <TrendingUp className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm">{action}</p>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {insights.keyTopics.length > 0 && (
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Key Discussion Topics
            </CardTitle>
            <CardDescription>
              Most mentioned topics in email conversations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {insights.keyTopics.map((topic, index) => (
                <Badge key={index} variant="secondary">
                  {topic}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}