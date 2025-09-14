'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { RefreshCw, Mail, Bot, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'

interface WebhookStats {
  totalReceived: number
  repliesSent: number
  repliesSkipped: number
  errors: number
  lastProcessed: string
}

interface SystemStatus {
  webhookActive: boolean
  claudeConnected: boolean
  agentMailConnected: boolean
  autoReplyEnabled: boolean
}

export function AutonomousEmailDashboard() {
  const [stats, setStats] = useState<WebhookStats>({
    totalReceived: 0,
    repliesSent: 0,
    repliesSkipped: 0,
    errors: 0,
    lastProcessed: new Date().toISOString()
  })

  const [status, setStatus] = useState<SystemStatus>({
    webhookActive: false,
    claudeConnected: false,
    agentMailConnected: false,
    autoReplyEnabled: true
  })

  const [isLoading, setIsLoading] = useState(false)

  const fetchStats = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/webhooks/email/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
        setStatus(data.status)
      }
    } catch (error) {
      console.error('Failed to fetch webhook stats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleAutoReply = async (enabled: boolean) => {
    try {
      const response = await fetch('/api/webhooks/email/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoReplyEnabled: enabled })
      })
      
      if (response.ok) {
        setStatus(prev => ({ ...prev, autoReplyEnabled: enabled }))
      }
    } catch (error) {
      console.error('Failed to update auto-reply setting:', error)
    }
  }

  const testWebhook = async () => {
    try {
      const response = await fetch('/api/webhooks/email/test', {
        method: 'POST'
      })
      
      if (response.ok) {
        alert('✅ Webhook test successful!')
      } else {
        alert('❌ Webhook test failed')
      }
    } catch (error) {
      alert('❌ Webhook test error: ' + error)
    }
  }

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const getStatusIcon = (isActive: boolean) => {
    return isActive ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    )
  }

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <Badge variant="default" className="bg-green-100 text-green-800">
        Active
      </Badge>
    ) : (
      <Badge variant="destructive">
        Inactive
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Autonomous Email System</h2>
          <p className="text-muted-foreground">
            Monitor and control your AI-powered email reply system
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchStats}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={testWebhook}
          >
            Test Webhook
          </Button>
        </div>
      </div>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            System Status
          </CardTitle>
          <CardDescription>
            Current status of all system components
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                {getStatusIcon(status.webhookActive)}
                <span className="font-medium">Webhook</span>
              </div>
              {getStatusBadge(status.webhookActive)}
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                {getStatusIcon(status.claudeConnected)}
                <span className="font-medium">Claude AI</span>
              </div>
              {getStatusBadge(status.claudeConnected)}
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                {getStatusIcon(status.agentMailConnected)}
                <span className="font-medium">AgentMail</span>
              </div>
              {getStatusBadge(status.agentMailConnected)}
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-blue-500" />
                <span className="font-medium">Auto Reply</span>
              </div>
              <Switch
                checked={status.autoReplyEnabled}
                onCheckedChange={toggleAutoReply}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Emails</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalReceived}</div>
            <p className="text-xs text-muted-foreground">
              Messages received via webhook
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Replies Sent</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.repliesSent}</div>
            <p className="text-xs text-muted-foreground">
              Autonomous replies sent
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Skipped</CardTitle>
            <XCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.repliesSkipped}</div>
            <p className="text-xs text-muted-foreground">
              Messages not requiring replies
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Errors</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.errors}</div>
            <p className="text-xs text-muted-foreground">
              Processing errors
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
          <CardDescription>
            Current webhook and system settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Webhook URL</label>
              <p className="text-sm text-muted-foreground font-mono">
                https://hackmitproject.vercel.app/api/webhooks/email
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">Event Types</label>
              <p className="text-sm text-muted-foreground">
                message.received
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">Inbox Email</label>
              <p className="text-sm text-muted-foreground">
                hackmit@agentmail.to
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">Last Processed</label>
              <p className="text-sm text-muted-foreground">
                {new Date(stats.lastProcessed).toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts */}
      {!status.webhookActive && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Webhook is not active. Check your AgentMail configuration and ensure the webhook URL is correctly set.
          </AlertDescription>
        </Alert>
      )}

      {!status.claudeConnected && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Claude AI connection failed. Please verify your ANTHROPIC_API_KEY environment variable.
          </AlertDescription>
        </Alert>
      )}

      {!status.agentMailConnected && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            AgentMail connection failed. Please verify your AGENT_MAIL_API_KEY environment variable.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
