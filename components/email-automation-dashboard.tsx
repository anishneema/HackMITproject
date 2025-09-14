'use client'

import { useState, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Upload, Play, Pause, BarChart, Mail, MessageSquare, Clock, CheckCircle, AlertTriangle } from 'lucide-react'

import {
  EmailAutomationEngine,
  EmailAutomationConfig,
  EmailCampaign,
  Contact,
  EmailTemplate,
  SentEmail,
  EmailReply,
  GeneratedResponse,
  FollowUpEvent
} from '@/lib/email-automation'

export function EmailAutomationDashboard() {
  const [engine, setEngine] = useState<EmailAutomationEngine | null>(null)
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([])
  const [activeTab, setActiveTab] = useState('setup')
  const [isConfigured, setIsConfigured] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [config, setConfig] = useState({
    emailProvider: {
      type: 'resend' as 'resend' | 'sendgrid',
      apiKey: '',
      fromEmail: '',
      fromName: 'Red Cross Events'
    },
    sentimentAnalyzer: {
      type: 'rule-based' as 'rule-based' | 'openai',
      apiKey: ''
    },
    responseGenerator: {
      type: 'template' as 'template' | 'ai',
      apiKey: ''
    }
  })

  const [campaignForm, setCampaignForm] = useState({
    name: '',
    emailSubject: 'Red Cross Event Invitation',
    emailBody: `Hello {{firstName}},

We hope this message finds you well. We're reaching out to invite you to participate in an upcoming Red Cross event in your area.

Your support has always been invaluable to our mission, and we would be honored to have you join us for this important initiative.

Event Details:
- Date: [To be announced]
- Location: [To be announced]
- Purpose: Community outreach and volunteer coordination

We'll be sending more specific details soon, but we wanted to reach out early to gauge your interest and availability.

Please feel free to reply to this email with any questions or to confirm your interest in participating.

Thank you for your continued support of the Red Cross mission.

Best regards,
{{fromName}}
Red Cross Events Team`,
    csvFile: null as File | null
  })

  const handleConfigureEngine = () => {
    if (!config.emailProvider.apiKey || !config.emailProvider.fromEmail) {
      alert('Please provide email provider API key and from email')
      return
    }

    const automationConfig: EmailAutomationConfig = {
      emailProvider: config.emailProvider,
      replyMonitor: {
        type: 'webhook',
        config: { webhookSecret: 'your-webhook-secret' }
      },
      sentimentAnalyzer: {
        type: config.sentimentAnalyzer.type,
        config: config.sentimentAnalyzer.apiKey ? { apiKey: config.sentimentAnalyzer.apiKey } : undefined
      },
      responseGenerator: {
        type: config.responseGenerator.type,
        config: config.responseGenerator.apiKey ? { apiKey: config.responseGenerator.apiKey } : undefined
      },
      settings: {
        batchSize: 50,
        sendDelayMs: 2000,
        autoApproveResponses: false,
        maxFollowUps: 3
      }
    }

    const newEngine = new EmailAutomationEngine(automationConfig)
    setEngine(newEngine)
    setIsConfigured(true)
    setActiveTab('campaigns')
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type === 'text/csv') {
      setCampaignForm(prev => ({ ...prev, csvFile: file }))
    } else {
      alert('Please select a valid CSV file')
    }
  }

  const handleCreateCampaign = async () => {
    if (!engine || !campaignForm.csvFile || !campaignForm.name) {
      alert('Please provide campaign name and CSV file')
      return
    }

    try {
      const template: EmailTemplate = {
        id: 'campaign-template-' + Date.now(),
        subject: campaignForm.emailSubject,
        body: campaignForm.emailBody,
        variables: ['firstName', 'lastName', 'organization', 'fromName']
      }

      const campaign = await engine.createCampaign(campaignForm.name, campaignForm.csvFile, template)
      setCampaigns(prev => [...prev, campaign])
      setCampaignForm({ name: '', emailSubject: 'Red Cross Event Invitation', emailBody: campaignForm.emailBody, csvFile: null })
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (error) {
      console.error('Error creating campaign:', error)
      alert('Error creating campaign. Please check your CSV file format.')
    }
  }

  const handleStartCampaign = async (campaignId: string) => {
    if (!engine) return

    const success = await engine.startCampaign(campaignId)
    if (success) {
      setCampaigns(prev => prev.map(c =>
        c.id === campaignId ? { ...c, status: 'running', startedAt: new Date() } : c
      ))
    }
  }

  const handlePauseCampaign = async (campaignId: string) => {
    if (!engine) return

    const success = await engine.pauseCampaign(campaignId)
    if (success) {
      setCampaigns(prev => prev.map(c =>
        c.id === campaignId ? { ...c, status: 'paused' } : c
      ))
    }
  }

  const getCampaignStats = (campaignId: string) => {
    if (!engine) return { sentCount: 0, replyRate: 0, openRate: 0 }
    return engine.getCampaignAnalytics(campaignId)
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Email Automation Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Autonomous email outreach with intelligent response handling
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="setup">Setup</TabsTrigger>
          <TabsTrigger value="campaigns" disabled={!isConfigured}>Campaigns</TabsTrigger>
          <TabsTrigger value="monitoring" disabled={!isConfigured}>Monitoring</TabsTrigger>
          <TabsTrigger value="analytics" disabled={!isConfigured}>Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="setup">
          <Card>
            <CardHeader>
              <CardTitle>Configure Email Automation</CardTitle>
              <CardDescription>
                Set up your email provider and AI services to get started
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Email Provider</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Provider</Label>
                    <Select
                      value={config.emailProvider.type}
                      onValueChange={(value: 'resend' | 'sendgrid') =>
                        setConfig(prev => ({
                          ...prev,
                          emailProvider: { ...prev.emailProvider, type: value }
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="resend">Resend</SelectItem>
                        <SelectItem value="sendgrid">SendGrid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>API Key</Label>
                    <Input
                      type="password"
                      value={config.emailProvider.apiKey}
                      onChange={(e) =>
                        setConfig(prev => ({
                          ...prev,
                          emailProvider: { ...prev.emailProvider, apiKey: e.target.value }
                        }))
                      }
                      placeholder="Your email provider API key"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>From Email</Label>
                    <Input
                      value={config.emailProvider.fromEmail}
                      onChange={(e) =>
                        setConfig(prev => ({
                          ...prev,
                          emailProvider: { ...prev.emailProvider, fromEmail: e.target.value }
                        }))
                      }
                      placeholder="noreply@yourorganization.org"
                    />
                  </div>
                  <div>
                    <Label>From Name</Label>
                    <Input
                      value={config.emailProvider.fromName}
                      onChange={(e) =>
                        setConfig(prev => ({
                          ...prev,
                          emailProvider: { ...prev.emailProvider, fromName: e.target.value }
                        }))
                      }
                      placeholder="Red Cross Events"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">AI Services (Optional)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Sentiment Analysis</Label>
                    <Select
                      value={config.sentimentAnalyzer.type}
                      onValueChange={(value: 'rule-based' | 'openai') =>
                        setConfig(prev => ({
                          ...prev,
                          sentimentAnalyzer: { ...prev.sentimentAnalyzer, type: value }
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rule-based">Rule-based (Free)</SelectItem>
                        <SelectItem value="openai">OpenAI (API Key Required)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Response Generation</Label>
                    <Select
                      value={config.responseGenerator.type}
                      onValueChange={(value: 'template' | 'ai') =>
                        setConfig(prev => ({
                          ...prev,
                          responseGenerator: { ...prev.responseGenerator, type: value }
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="template">Template-based (Free)</SelectItem>
                        <SelectItem value="ai">AI Generated (API Key Required)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {(config.sentimentAnalyzer.type === 'openai' || config.responseGenerator.type === 'ai') && (
                  <div>
                    <Label>OpenAI API Key</Label>
                    <Input
                      type="password"
                      value={config.sentimentAnalyzer.apiKey}
                      onChange={(e) =>
                        setConfig(prev => ({
                          ...prev,
                          sentimentAnalyzer: { ...prev.sentimentAnalyzer, apiKey: e.target.value },
                          responseGenerator: { ...prev.responseGenerator, apiKey: e.target.value }
                        }))
                      }
                      placeholder="sk-..."
                    />
                  </div>
                )}
              </div>

              <Button onClick={handleConfigureEngine} className="w-full" size="lg">
                Configure Email Automation Engine
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Create New Campaign</CardTitle>
                <CardDescription>
                  Upload a CSV file with contacts and create an email campaign
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Campaign Name</Label>
                  <Input
                    value={campaignForm.name}
                    onChange={(e) => setCampaignForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., March Volunteer Drive"
                  />
                </div>
                <div>
                  <Label>Email Subject</Label>
                  <Input
                    value={campaignForm.emailSubject}
                    onChange={(e) => setCampaignForm(prev => ({ ...prev, emailSubject: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Email Template</Label>
                  <Textarea
                    value={campaignForm.emailBody}
                    onChange={(e) => setCampaignForm(prev => ({ ...prev, emailBody: e.target.value }))}
                    rows={10}
                    placeholder="Use {{firstName}}, {{lastName}}, {{organization}} for personalization"
                  />
                </div>
                <div>
                  <Label>Contact CSV File</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      onChange={handleFileSelect}
                    />
                    <Upload className="h-4 w-4" />
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    CSV should include columns: email, firstName, lastName, organization
                  </p>
                </div>
                <Button onClick={handleCreateCampaign} disabled={!campaignForm.csvFile || !campaignForm.name}>
                  Create Campaign
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Active Campaigns</CardTitle>
              </CardHeader>
              <CardContent>
                {campaigns.length === 0 ? (
                  <p className="text-gray-600">No campaigns created yet.</p>
                ) : (
                  <div className="space-y-4">
                    {campaigns.map((campaign) => {
                      const stats = getCampaignStats(campaign.id)
                      return (
                        <div key={campaign.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-lg font-semibold">{campaign.name}</h3>
                            <div className="flex items-center space-x-2">
                              <Badge variant={campaign.status === 'running' ? 'default' : campaign.status === 'paused' ? 'secondary' : 'outline'}>
                                {campaign.status}
                              </Badge>
                              {campaign.status === 'draft' && (
                                <Button size="sm" onClick={() => handleStartCampaign(campaign.id)}>
                                  <Play className="h-4 w-4 mr-1" />
                                  Start
                                </Button>
                              )}
                              {campaign.status === 'running' && (
                                <Button size="sm" variant="secondary" onClick={() => handlePauseCampaign(campaign.id)}>
                                  <Pause className="h-4 w-4 mr-1" />
                                  Pause
                                </Button>
                              )}
                            </div>
                          </div>
                          <div className="grid grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="font-medium">Contacts:</span> {campaign.contacts.length}
                            </div>
                            <div>
                              <span className="font-medium">Sent:</span> {stats.sentCount}
                            </div>
                            <div>
                              <span className="font-medium">Reply Rate:</span> {(stats.replyRate * 100).toFixed(1)}%
                            </div>
                            <div>
                              <span className="font-medium">Created:</span> {campaign.createdAt.toLocaleDateString()}
                            </div>
                          </div>
                          {stats.sentCount > 0 && (
                            <div className="mt-3">
                              <div className="flex justify-between text-sm">
                                <span>Progress</span>
                                <span>{stats.sentCount}/{campaign.contacts.length}</span>
                              </div>
                              <Progress value={(stats.sentCount / campaign.contacts.length) * 100} className="mt-1" />
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="monitoring">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MessageSquare className="h-5 w-5 mr-2" />
                  Recent Replies
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-center text-gray-500 py-8">
                    No replies yet. Start monitoring after launching campaigns.
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="h-5 w-5 mr-2" />
                  Scheduled Follow-ups
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-center text-gray-500 py-8">
                    No follow-ups scheduled yet.
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Pending Approvals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-center text-gray-500 py-8">
                    No responses pending approval.
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  System Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Email Service</span>
                    <Badge variant="default">Active</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Reply Monitor</span>
                    <Badge variant="default">Active</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Auto Responses</span>
                    <Badge variant="default">Active</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Follow-up Scheduler</span>
                    <Badge variant="default">Active</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">0</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Reply Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">0%</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">0h</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Follow-ups Sent</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">0</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Campaign Performance</CardTitle>
                <CardDescription>
                  Detailed analytics for all campaigns
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center text-gray-500 py-8">
                  No campaign data available yet. Launch campaigns to see analytics.
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}