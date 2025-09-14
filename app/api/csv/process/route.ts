import { NextRequest, NextResponse } from 'next/server'
import { csvProcessor } from '@/lib/csv-processor'
import { agentMailEmailSender } from '@/lib/agentmail-email-sender'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { csvContent, fileName, campaignName } = body

    if (!csvContent || !fileName) {
      return NextResponse.json({
        success: false,
        error: 'CSV content and filename are required'
      }, { status: 400 })
    }

    // Create a File object from the content
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const file = new File([blob], fileName, { type: 'text/csv' })

    // Process the CSV file using the existing processor
    const contacts = await csvProcessor.processCSVFile(file)

    if (contacts.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No valid contacts found in CSV file'
      }, { status: 400 })
    }

    // Create email template for blood drive invitation
    const emailTemplate = {
      subject: "You're Invited: Community Blood Drive - Help Save Lives! 🩸",
      body: `Dear {{name}},

We hope this message finds you well! We're reaching out to invite you to our upcoming Community Blood Drive - an opportunity to make a real difference in your community.

🗓️ Event Details:
• Date: September 20, 2025
• Time: 9:00 AM - 3:00 PM
• Location: Downtown Community Center
• Duration: About 1 hour from check-in to completion

🎯 Why Your Help Matters:
Every blood donation can help save up to 3 lives. With just one hour of your time, you could be someone's hero. Our community blood supply is running low, and we need caring individuals like you to help us replenish it.

✅ What to Expect:
• Quick health screening
• Safe, sterile donation process
• Light refreshments afterward
• The satisfaction of knowing you've helped save lives

📋 To Participate:
Simply reply to this email with "YES" to confirm your attendance, or let us know if you have any questions. We'll send you a time slot confirmation and any additional details.

Can't make it this time? No worries! We'll keep you informed about future opportunities to help.

Thank you for considering this life-saving opportunity. Together, we can make a real difference in our community.

With gratitude,
Red Cross Events Team

P.S. Remember to eat well and stay hydrated before donating. If you have any medical questions about donation eligibility, feel free to ask!`
    }

    // Create campaign using CSV processor
    const campaign = await csvProcessor.createEmailCampaign(
      campaignName || `Blood Drive Campaign - ${new Date().toLocaleDateString()}`,
      contacts,
      emailTemplate
    )

    // Send emails using AgentMail
    const emailResult = await agentMailEmailSender.sendEmailCampaign({
      contacts: contacts.map(contact => ({
        email: contact.email,
        firstName: contact.name.split(' ')[0] || '',
        lastName: contact.name.split(' ').slice(1).join(' ') || '',
        name: contact.name
      })),
      template: emailTemplate,
      eventName: 'Community Blood Drive',
      fromEmail: process.env.SMTP_FROM_EMAIL || 'hackmit@agentmail.to',
      fromName: process.env.SMTP_FROM_NAME || 'Red Cross Events Team'
    })

    // Start the email campaign
    const campaignStarted = await csvProcessor.startEmailCampaign(campaign.id)

    return NextResponse.json({
      success: true,
      campaign: {
        id: campaign.id,
        name: campaign.name,
        contactsProcessed: contacts.length,
        emailsSent: emailResult.sent,
        emailsFailed: emailResult.failed
      },
      agentMailResult: emailResult,
      campaignStarted,
      message: `Successfully processed ${contacts.length} contacts and sent ${emailResult.sent} emails`
    })

  } catch (error) {
    console.error('Error processing CSV:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'CSV processing endpoint',
    usage: 'POST with csvContent, fileName, and optional campaignName to process and send emails'
  })
}