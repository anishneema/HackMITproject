'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useDropzone } from 'react-dropzone'
import {
  Upload,
  Send,
  Users,
  Mail,
  TrendingUp,
  Play,
  Pause,
  Eye,
  MessageCircle,
  FileSpreadsheet,
  CheckCircle,
  AlertTriangle,
  Edit
} from 'lucide-react'
import { csvProcessor, ContactData, EmailCampaignData } from '@/lib/csv-processor'

export function EmailCampaignDashboard() {
  const [contacts, setContacts] = useState<ContactData[]>([])
  const [campaigns, setCampaigns] = useState<EmailCampaignData[]>([])
  const [selectedCampaign, setSelectedCampaign] = useState<EmailCampaignData | null>(null)
  const [campaignForm, setCampaignForm] = useState({
    name: '',
    subject: 'Join us for our upcoming blood drive event',
    body: `Dear {{name}},

I hope this message finds you well! I'm reaching out to invite you to participate in an upcoming Red Cross blood drive event in your area.

Your support has always been invaluable to our mission, and we would be honored to have you join us for this important initiative.

Our next event details:
- Date: [Event will be announced soon]
- Location: [To be confirmed]
- Duration: Typically 3-4 hours

Your contribution can make a real difference in saving lives. One blood donation can help save up to three lives!

Please reply to this email if you're interested in participating, and we'll send you the specific details once they're confirmed.

Thank you for considering this opportunity to help others.

Best regards,
Red Cross Events Team`
  })
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('upload')

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file && file.type === 'text/csv') {
      setLoading(true)
      try {
        const processedContacts = await csvProcessor.processCSVFile(file)
        setContacts(processedContacts)
        setActiveTab('campaign')
        console.log('Processed contacts:', processedContacts)
      } catch (error) {
        console.error('Error processing CSV:', error)
        alert('Error processing CSV file. Please check the format.')
      }
      setLoading(false)
    } else {
      alert('Please upload a CSV file')
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv']
    },
    multiple: false
  })

  const handleCreateCampaign = async () => {
    if (!campaignForm.name.trim() || contacts.length === 0) {
      alert('Please provide a campaign name and upload contacts')
      return
    }

    setLoading(true)
    try {
      const campaign = await csvProcessor.createEmailCampaign(
        campaignForm.name,
        contacts,
        {
          subject: campaignForm.subject,
          body: campaignForm.body
        }
      )

      setCampaigns(prev => [...prev, campaign])
      setActiveTab('campaigns')

      // Reset form
      setCampaignForm({
        name: '',
        subject: 'Join us for our upcoming blood drive event',
        body: campaignForm.body
      })

      console.log('Created campaign:', campaign)
    } catch (error) {
      console.error('Error creating campaign:', error)
      alert('Error creating campaign')
    }
    setLoading(false)
  }

  const handleStartCampaign = async (campaignId: string) => {
    setLoading(true)
    try {
      const success = await csvProcessor.startEmailCampaign(campaignId)
      if (success) {
        setCampaigns(prev => prev.map(c =>
          c.id === campaignId ? { ...c, status: 'completed' as const } : c
        ))
        alert('Campaign completed successfully!')
      } else {
        alert('Failed to start campaign')
      }
    } catch (error) {
      console.error('Error starting campaign:', error)
      alert('Error starting campaign')
    }
    setLoading(false)
  }

  const handleEditContact = (email: string, field: string, value: string) => {
    csvProcessor.updateContactData(email, { [field]: value })
    setContacts(prev => prev.map(contact =>
      contact.email === email ? { ...contact, [field]: value } : contact
    ))
  }

  const getCampaignStats = (campaign: EmailCampaignData) => {
    return csvProcessor.getCampaignStats(campaign.id) || {
      totalContacts: campaign.contacts.length,
      sentCount: campaign.sentCount,
      repliedCount: campaign.repliedCount,
      openedCount: campaign.openedCount,
      responseRate: 0,
      openRate: 0,
      sentimentBreakdown: { positive: 0, negative: 0, neutral: 0, question: 0 },
      requiresAction: 0
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Campaign Manager
          </CardTitle>
          <CardDescription>
            Upload CSV contacts, create campaigns, and track responses with AgentMail
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="upload">
            <Upload className="h-4 w-4 mr-2" />
            Upload CSV
          </TabsTrigger>
          <TabsTrigger value="campaign" disabled={contacts.length === 0}>
            <Send className="h-4 w-4 mr-2" />
            Create Campaign
          </TabsTrigger>
          <TabsTrigger value="campaigns">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Campaigns
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <TrendingUp className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upload Contact CSV</CardTitle>
              <CardDescription>
                Upload a CSV file with Name, Phone Number, Email columns (like your sample file)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragActive ? 'border-primary bg-primary/10' : 'border-muted-foreground/25'
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                {isDragActive ? (
                  <p>Drop the CSV file here...</p>
                ) : (
                  <div>
                    <p className="text-lg font-medium mb-2">
                      Drag & drop your CSV file here, or click to select
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Supports: Name, Phone Number, Email, Location, Interests, Status
                    </p>
                  </div>
                )}
              </div>

              {contacts.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-semibold mb-3">
                    Loaded {contacts.length} contacts:
                  </h3>
                  <ScrollArea className="h-64 border rounded p-4">
                    <div className="space-y-2">
                      {contacts.map((contact, index) => (
                        <div key={index} className="flex items-center justify-between p-2 border rounded">
                          <div>
                            <p className="font-medium">{contact.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {contact.email} | {contact.phone}
                            </p>
                            {contact.location && (
                              <p className="text-xs text-muted-foreground">{contact.location}</p>
                            )}
                          </div>
                          <Badge variant={contact.status === 'active' ? 'default' : 'secondary'}>
                            {contact.status || 'new'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaign" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create Email Campaign</CardTitle>
              <CardDescription>
                Create a personalized email campaign for your {contacts.length} contacts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Campaign Name</label>
                <Input
                  value={campaignForm.name}
                  onChange={(e) => setCampaignForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., October Blood Drive Outreach"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Email Subject</label>
                <Input
                  value={campaignForm.subject}
                  onChange={(e) => setCampaignForm(prev => ({ ...prev, subject: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Email Template</label>
                <Textarea
                  value={campaignForm.body}
                  onChange={(e) => setCampaignForm(prev => ({ ...prev, body: e.target.value }))}
                  rows={12}
                  placeholder="Use {{name}}, {{phone}}, {{email}}, {{location}} for personalization"
                />
                <p className="text-sm text-muted-foreground mt-2">
                  Available placeholders: {{name}}, {{firstName}}, {{lastName}}, {{email}}, {{phone}}, {{location}}, {{interests}}
                </p>
              </div>

              <Button
                onClick={handleCreateCampaign}
                disabled={loading || !campaignForm.name.trim()}
                className="w-full"
                size="lg"
              >
                {loading ? 'Creating...' : 'Create Campaign'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {campaigns.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-lg font-medium">No campaigns created yet</p>
                    <p className="text-muted-foreground">Upload contacts and create your first campaign</p>
                  </CardContent>
                </Card>
              ) : (
                campaigns.map((campaign) => {
                  const stats = getCampaignStats(campaign)
                  return (
                    <Card key={campaign.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-lg">{campaign.name}</CardTitle>
                            <CardDescription>
                              Created {campaign.createdAt.toLocaleDateString()}
                            </CardDescription>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                campaign.status === 'completed' ? 'default' :
                                campaign.status === 'sending' ? 'secondary' :
                                campaign.status === 'paused' ? 'destructive' : 'outline'
                              }
                            >
                              {campaign.status}
                            </Badge>
                            {campaign.status === 'draft' && (
                              <Button
                                size="sm"
                                onClick={() => handleStartCampaign(campaign.id)}
                                disabled={loading}
                              >
                                <Play className="h-4 w-4 mr-1" />
                                Send Emails
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div className="text-center">
                            <p className="text-2xl font-bold">{stats.totalContacts}</p>
                            <p className="text-sm text-muted-foreground">Total Contacts</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold">{stats.sentCount}</p>
                            <p className="text-sm text-muted-foreground">Emails Sent</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold">{stats.repliedCount}</p>
                            <p className="text-sm text-muted-foreground">Replies</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold">{stats.responseRate.toFixed(1)}%</p>
                            <p className="text-sm text-muted-foreground">Response Rate</p>
                          </div>
                        </div>

                        {stats.sentCount > 0 && (
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Campaign Progress</span>
                              <span>{stats.sentCount}/{stats.totalContacts}</span>
                            </div>
                            <Progress value={(stats.sentCount / stats.totalContacts) * 100} />
                          </div>
                        )}

                        <div className="flex items-center justify-between mt-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedCampaign(campaign)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View Details
                          </Button>

                          {stats.requiresAction > 0 && (
                            <Badge variant="destructive">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              {stats.requiresAction} need attention
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })
              )}
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quick Stats</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Total Campaigns</span>
                      <span className="font-bold">{campaigns.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Contacts</span>
                      <span className="font-bold">
                        {campaigns.reduce((sum, c) => sum + c.contacts.length, 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Emails Sent</span>
                      <span className="font-bold">
                        {campaigns.reduce((sum, c) => sum + c.sentCount, 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Replies</span>
                      <span className="font-bold">
                        {campaigns.reduce((sum, c) => sum + c.repliedCount, 0)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <Edit className="h-4 w-4 mr-2" />
                    AI Data Manager
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    The AI agent automatically updates contact data based on email responses and manages contact organization.
                  </p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Auto-updates</span>
                      <Badge variant="default">Active</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Smart categorization</span>
                      <Badge variant="default">Enabled</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Response tracking</span>
                      <Badge variant="default">Live</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium">Total Sent</p>
                    <p className="text-2xl font-bold">
                      {campaigns.reduce((sum, c) => sum + c.sentCount, 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <MessageCircle className="h-4 w-4 text-green-600" />
                  <div>
                    <p className="text-sm font-medium">Replies</p>
                    <p className="text-2xl font-bold">
                      {campaigns.reduce((sum, c) => sum + c.repliedCount, 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Eye className="h-4 w-4 text-purple-600" />
                  <div>
                    <p className="text-sm font-medium">Opened</p>
                    <p className="text-2xl font-bold">
                      {campaigns.reduce((sum, c) => sum + c.openedCount, 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-orange-600" />
                  <div>
                    <p className="text-sm font-medium">Avg Response</p>
                    <p className="text-2xl font-bold">
                      {campaigns.length > 0
                        ? ((campaigns.reduce((sum, c) => sum + c.repliedCount, 0) /
                            campaigns.reduce((sum, c) => sum + c.sentCount, 0)) * 100).toFixed(1)
                        : 0}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {campaigns.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Campaign Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {campaigns.map(campaign => {
                    const stats = getCampaignStats(campaign)
                    return (
                      <div key={campaign.id} className="border rounded p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium">{campaign.name}</h4>
                          <Badge variant="outline">{campaign.status}</Badge>
                        </div>
                        <div className="grid grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Sent:</span> {stats.sentCount}
                          </div>
                          <div>
                            <span className="font-medium">Replies:</span> {stats.repliedCount}
                          </div>
                          <div>
                            <span className="font-medium">Rate:</span> {stats.responseRate.toFixed(1)}%
                          </div>
                          <div>
                            <span className="font-medium">Status:</span>
                            <Badge className="ml-1" variant={stats.requiresAction > 0 ? 'destructive' : 'default'}>
                              {stats.requiresAction > 0 ? `${stats.requiresAction} need action` : 'Good'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}