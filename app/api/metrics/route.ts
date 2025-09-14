import { NextResponse } from 'next/server'

// In-memory storage for metrics (in production, this would be a database)
let metricsHistory: any[] = []

// Calculate percentage change between current and previous period
const calculateChange = (current: number, previous: number) => {
  if (previous === 0) return current > 0 ? '+100%' : '0%'
  const change = ((current - previous) / previous) * 100
  const sign = change >= 0 ? '+' : ''
  return `${sign}${change.toFixed(1)}%`
}

export async function GET() {
  try {
    // If no historical data, return default values
    if (metricsHistory.length === 0) {
      return NextResponse.json({
        success: true,
        changes: {
          emailsSent: '+0%',
          responseRate: '+0%',
          activeEvents: '+0%',
          totalBookings: '+0%'
        }
      })
    }

    // Get current (latest) and previous metrics
    const current = metricsHistory[metricsHistory.length - 1]
    const previous = metricsHistory.length > 1 ? metricsHistory[metricsHistory.length - 2] : current

    return NextResponse.json({
      success: true,
      changes: {
        emailsSent: calculateChange(current.emailsSent, previous.emailsSent),
        responseRate: calculateChange(current.responseRate, previous.responseRate),
        activeEvents: calculateChange(current.activeEvents, previous.activeEvents),
        totalBookings: calculateChange(current.totalBookings, previous.totalBookings)
      }
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch metrics changes' },
      { status: 500 }
    )
  }
}

export async function POST() {
  try {
    // For this demo, we'll just add some sample variation
    // In a real system, this would be called periodically to track metrics
    const now = new Date()
    const currentMetrics = {
      timestamp: now.toISOString(),
      emailsSent: Math.floor(Math.random() * 100) + 200, // 200-300
      responseRate: Math.floor(Math.random() * 20) + 15, // 15-35%
      activeEvents: Math.floor(Math.random() * 5) + 3, // 3-8
      totalBookings: Math.floor(Math.random() * 30) + 20 // 20-50
    }

    metricsHistory.push(currentMetrics)

    // Keep only last 10 entries
    if (metricsHistory.length > 10) {
      metricsHistory = metricsHistory.slice(-10)
    }

    return NextResponse.json({
      success: true,
      metrics: currentMetrics
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to record metrics' },
      { status: 500 }
    )
  }
}