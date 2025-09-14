import { NextRequest, NextResponse } from 'next/server'
import { emailMonitor } from '@/lib/continuous-email-monitor'

export async function GET() {
  try {
    console.log('📋 Getting email monitor status...')

    const status = emailMonitor.getStatus()

    return NextResponse.json({
      success: true,
      monitor: status,
      message: status.isRunning
        ? `Email monitor is running, checking every ${status.checkInterval / 1000} seconds`
        : 'Email monitor is stopped'
    })

  } catch (error) {
    console.error('❌ Error getting monitor status:', error)

    return NextResponse.json({
      success: false,
      error: 'Failed to get monitor status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, interval } = body

    console.log(`🎛️ Email monitor action: ${action}`)

    let result = false
    let message = ''

    switch (action) {
      case 'start':
        result = emailMonitor.start()
        message = result
          ? 'Email monitor started successfully'
          : 'Failed to start email monitor (already running or handler not ready)'
        break

      case 'stop':
        result = emailMonitor.stop()
        message = result
          ? 'Email monitor stopped successfully'
          : 'Email monitor was not running'
        break

      case 'restart':
        emailMonitor.stop()
        await new Promise(resolve => setTimeout(resolve, 1000))
        result = emailMonitor.start()
        message = result
          ? 'Email monitor restarted successfully'
          : 'Failed to restart email monitor'
        break

      case 'update_interval':
        if (typeof interval !== 'number' || interval < 1) {
          return NextResponse.json({
            success: false,
            error: 'Invalid interval. Must be a number >= 1 (seconds)'
          }, { status: 400 })
        }
        result = emailMonitor.updateInterval(interval)
        message = result
          ? `Email monitor interval updated to ${interval} seconds`
          : 'Failed to update monitor interval'
        break

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Use: start, stop, restart, or update_interval'
        }, { status: 400 })
    }

    const status = emailMonitor.getStatus()

    return NextResponse.json({
      success: result,
      message,
      monitor: status
    })

  } catch (error) {
    console.error('❌ Error controlling email monitor:', error)

    return NextResponse.json({
      success: false,
      error: 'Failed to control email monitor',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}