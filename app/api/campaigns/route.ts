import { NextRequest, NextResponse } from 'next/server'

// In-memory storage for campaigns (in production, this would be a database)
let campaigns: any[] = []
let nextId = 1

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      campaigns
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch campaigns' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const campaignData = await request.json()

    const newCampaign = {
      id: `campaign-${nextId++}`,
      ...campaignData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      totalSent: campaignData.totalSent || 0,
      opened: campaignData.opened || 0,
      replied: campaignData.replied || 0,
      bounced: campaignData.bounced || 0,
      unsubscribed: campaignData.unsubscribed || 0,
      responseRate: campaignData.responseRate || 0,
      sentimentBreakdown: campaignData.sentimentBreakdown || {
        positive: 0,
        negative: 0,
        neutral: 0,
        questions: 0
      },
      status: campaignData.status || 'draft'
    }

    campaigns.push(newCampaign)

    return NextResponse.json({
      success: true,
      campaign: newCampaign
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create campaign' },
      { status: 500 }
    )
  }
}