import { NextRequest, NextResponse } from 'next/server'

// In-memory storage for volunteers (in production, this would be a database)
let volunteers: any[] = []
let nextId = 1

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      volunteers
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch volunteers' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const volunteerData = await request.json()

    const newVolunteer = {
      id: nextId++,
      ...volunteerData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    volunteers.push(newVolunteer)

    return NextResponse.json({
      success: true,
      volunteer: newVolunteer
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create volunteer' },
      { status: 500 }
    )
  }
}