import { agentMailService } from './agent-mail-service'

export interface ContactData {
  name: string
  phone: string
  email: string
  location?: string
  interests?: string
  status?: string
  lastContact?: string
  [key: string]: any
}

export interface EmailCampaignData {
  id: string
  name: string
  contacts: ContactData[]
  emailTemplate: {
    subject: string
    body: string
  }
  status: 'draft' | 'sending' | 'completed' | 'paused'
  createdAt: Date
  sentCount: number
  repliedCount: number
  openedCount: number
  responses: EmailResponse[]
}

export interface EmailResponse {
  id: string
  contactEmail: string
  contactName: string
  message: string
  sentiment: 'positive' | 'negative' | 'neutral' | 'question'
  timestamp: Date
  requiresAction: boolean
  actionTaken?: string
}

class CSVProcessor {
  private campaigns: Map<string, EmailCampaignData> = new Map()

  async processCSVFile(file: File): Promise<ContactData[]> {
    const text = await file.text()
    const lines = text.split('\n').filter(line => line.trim())

    if (lines.length === 0) {
      throw new Error('CSV file is empty')
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
    const contacts: ContactData[] = []

    // Check if we have required columns
    const hasEmail = headers.some(h => ['email', 'email address', 'e-mail'].includes(h))
    if (!hasEmail) {
      throw new Error("CSV file must include an 'email' column")
    }

    console.log('CSV Headers found:', headers)

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim())
      const contact: ContactData = {
        name: '',
        phone: '',
        email: ''
      }

      let firstName = ''
      let lastName = ''

      headers.forEach((header, index) => {
        const value = values[index] || ''

        // Map common header variations
        switch (header) {
          case 'name':
          case 'full name':
          case 'contact name':
            contact.name = value
            break
          case 'firstname':
          case 'first name':
          case 'first_name':
            firstName = value
            break
          case 'lastname':
          case 'last name':
          case 'last_name':
            lastName = value
            break
          case 'phone':
          case 'phone number':
          case 'mobile':
          case 'cell':
            contact.phone = value
            break
          case 'email':
          case 'email address':
          case 'e-mail':
            contact.email = value
            break
          case 'location':
          case 'city':
          case 'address':
            contact.location = value
            break
          case 'interests':
          case 'interest':
          case 'category':
            contact.interests = value
            break
          case 'status':
            contact.status = value
            break
          case 'last contact':
          case 'lastcontact':
          case 'last_contact':
            contact.lastContact = value
            break
          default:
            contact[header] = value
        }
      })

      // Construct full name if we have firstName and lastName but not full name
      if (!contact.name && (firstName || lastName)) {
        contact.name = `${firstName} ${lastName}`.trim()
      }

      // Only include contacts that have at least email and some form of name
      if (contact.email && (contact.name || firstName || lastName)) {
        // Store firstName and lastName as additional properties
        if (firstName) contact['firstName'] = firstName
        if (lastName) contact['lastName'] = lastName

        contacts.push(contact)
      } else {
        console.log(`Skipping row ${i}: missing email (${contact.email}) or name (${contact.name})`)
      }
    }

    console.log(`Successfully processed ${contacts.length} contacts from CSV`)
    return contacts
  }

  async createEmailCampaign(
    name: string,
    contacts: ContactData[],
    emailTemplate: { subject: string; body: string }
  ): Promise<EmailCampaignData> {
    const campaign: EmailCampaignData = {
      id: `campaign_${Date.now()}`,
      name,
      contacts,
      emailTemplate,
      status: 'draft',
      createdAt: new Date(),
      sentCount: 0,
      repliedCount: 0,
      openedCount: 0,
      responses: []
    }

    this.campaigns.set(campaign.id, campaign)
    return campaign
  }

  async startEmailCampaign(campaignId: string): Promise<boolean> {
    const campaign = this.campaigns.get(campaignId)
    if (!campaign) return false

    campaign.status = 'sending'

    try {
      // Use AgentMail to send emails to each contact
      for (const contact of campaign.contacts) {
        const personalizedSubject = this.personalizeTemplate(campaign.emailTemplate.subject, contact)
        const personalizedBody = this.personalizeTemplate(campaign.emailTemplate.body, contact)

        await agentMailService.sendEmail({
          to: contact.email,
          subject: personalizedSubject,
          body: personalizedBody,
          campaignId,
          contactData: contact
        })

        campaign.sentCount++

        // Small delay to avoid overwhelming the email service
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      campaign.status = 'completed'
      return true

    } catch (error) {
      console.error('Failed to send email campaign:', error)
      campaign.status = 'paused'
      return false
    }
  }

  private personalizeTemplate(template: string, contact: ContactData): string {
    let personalized = template

    // Replace common placeholders
    personalized = personalized.replace(/\{\{name\}\}/g, contact.name)
    personalized = personalized.replace(/\{\{firstName\}\}/g, contact.name.split(' ')[0])
    personalized = personalized.replace(/\{\{lastName\}\}/g, contact.name.split(' ').slice(1).join(' '))
    personalized = personalized.replace(/\{\{email\}\}/g, contact.email)
    personalized = personalized.replace(/\{\{phone\}\}/g, contact.phone)
    personalized = personalized.replace(/\{\{location\}\}/g, contact.location || '')
    personalized = personalized.replace(/\{\{interests\}\}/g, contact.interests || '')

    return personalized
  }

  getCampaign(campaignId: string): EmailCampaignData | undefined {
    return this.campaigns.get(campaignId)
  }

  getAllCampaigns(): EmailCampaignData[] {
    return Array.from(this.campaigns.values())
  }

  async recordEmailResponse(
    campaignId: string,
    contactEmail: string,
    message: string,
    sentiment: 'positive' | 'negative' | 'neutral' | 'question' = 'neutral'
  ): Promise<void> {
    const campaign = this.campaigns.get(campaignId)
    if (!campaign) return

    const contact = campaign.contacts.find(c => c.email === contactEmail)
    if (!contact) return

    const response: EmailResponse = {
      id: `response_${Date.now()}`,
      contactEmail,
      contactName: contact.name,
      message,
      sentiment,
      timestamp: new Date(),
      requiresAction: sentiment === 'question' || sentiment === 'negative'
    }

    campaign.responses.push(response)
    campaign.repliedCount++

    // Update contact status based on response
    if (sentiment === 'positive') {
      contact.status = 'interested'
    } else if (sentiment === 'negative') {
      contact.status = 'not_interested'
    } else if (sentiment === 'question') {
      contact.status = 'needs_followup'
    }

    console.log(`Recorded response from ${contactEmail}: ${sentiment}`)
  }

  async updateContactData(email: string, updates: Partial<ContactData>): Promise<void> {
    // Update contact across all campaigns
    for (const campaign of this.campaigns.values()) {
      const contact = campaign.contacts.find(c => c.email === email)
      if (contact) {
        Object.assign(contact, updates)
        console.log(`Updated contact ${email}:`, updates)
      }
    }
  }

  getContactByEmail(email: string): ContactData | undefined {
    for (const campaign of this.campaigns.values()) {
      const contact = campaign.contacts.find(c => c.email === email)
      if (contact) return contact
    }
    return undefined
  }

  getCampaignStats(campaignId: string) {
    const campaign = this.campaigns.get(campaignId)
    if (!campaign) return null

    const totalContacts = campaign.contacts.length
    const responseRate = totalContacts > 0 ? (campaign.repliedCount / campaign.sentCount) * 100 : 0
    const openRate = totalContacts > 0 ? (campaign.openedCount / campaign.sentCount) * 100 : 0

    const sentimentBreakdown = campaign.responses.reduce((acc, response) => {
      acc[response.sentiment]++
      return acc
    }, { positive: 0, negative: 0, neutral: 0, question: 0 })

    return {
      totalContacts,
      sentCount: campaign.sentCount,
      repliedCount: campaign.repliedCount,
      openedCount: campaign.openedCount,
      responseRate,
      openRate,
      sentimentBreakdown,
      requiresAction: campaign.responses.filter(r => r.requiresAction).length
    }
  }
}

export const csvProcessor = new CSVProcessor()
export default csvProcessor