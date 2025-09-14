'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Settings, Key, CheckCircle, AlertCircle } from 'lucide-react'
import { agentMailService } from '@/lib/agent-mail-service'

export function AgentMailSettings() {
  const [apiKey, setApiKey] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const savedKey = localStorage.getItem('agentmail-api-key')
    if (savedKey) {
      setApiKey(savedKey)
      agentMailService.initialize({ apiKey: savedKey })
      setIsConnected(agentMailService.isReady())
    }
  }, [])

  const handleConnect = async () => {
    if (!apiKey.trim()) {
      setError('Please enter your Agent Mail API key')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      agentMailService.initialize({
        apiKey: apiKey.trim(),
        baseUrl: 'https://api.agentmail.io' // Replace with actual Agent Mail API URL
      })

      localStorage.setItem('agentmail-api-key', apiKey.trim())
      setIsConnected(true)
      setError('')
    } catch (err) {
      setError('Failed to connect to Agent Mail. Please check your API key.')
      setIsConnected(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDisconnect = () => {
    setApiKey('')
    setIsConnected(false)
    setError('')
    localStorage.removeItem('agentmail-api-key')
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Agent Mail Integration
        </CardTitle>
        <CardDescription>
          Connect your Agent Mail API to enable automated email campaigns
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="api-key">API Key</Label>
          <div className="flex gap-2">
            <Input
              id="api-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your Agent Mail API key"
              disabled={isConnected}
            />
            <Key className="h-4 w-4 text-muted-foreground mt-3" />
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Status:</span>
            <Badge variant={isConnected ? "default" : "secondary"} className="flex items-center gap-1">
              {isConnected ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
              {isConnected ? 'Connected' : 'Disconnected'}
            </Badge>
          </div>
        </div>

        <div className="flex gap-2">
          {!isConnected ? (
            <Button
              onClick={handleConnect}
              disabled={isLoading || !apiKey.trim()}
              className="flex-1"
            >
              {isLoading ? 'Connecting...' : 'Connect'}
            </Button>
          ) : (
            <Button
              onClick={handleDisconnect}
              variant="outline"
              className="flex-1"
            >
              Disconnect
            </Button>
          )}
        </div>

        {isConnected && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              ✅ Agent Mail is connected! The AI Assistant can now automatically:
            </p>
            <ul className="text-sm text-green-700 mt-2 ml-4 list-disc space-y-1">
              <li>Send personalized email campaigns from CSV uploads</li>
              <li>Monitor replies and analyze sentiment</li>
              <li>Generate automatic responses</li>
              <li>Schedule intelligent follow-ups</li>
              <li>Update dashboard metrics in real-time</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}