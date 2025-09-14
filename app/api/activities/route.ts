import { NextRequest, NextResponse } from 'next/server'

// In-memory storage for AI activities (in production, this would be a database)
let activities: any[] = []
let nextId = 1

export async function GET() {
  try {
    // Sort activities by timestamp (newest first)
    const sortedActivities = activities.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )

    return NextResponse.json({
      success: true,
      activities: sortedActivities
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch activities' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const activityData = await request.json()

    const newActivity = {
      id: nextId++,
      ...activityData,
      timestamp: activityData.timestamp || new Date().toISOString(),
      createdAt: new Date().toISOString()
    }

    activities.push(newActivity)

    return NextResponse.json({
      success: true,
      activity: newActivity
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create activity' },
      { status: 500 }
    )
  }
}