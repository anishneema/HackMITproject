#!/usr/bin/env node

/**
 * Email Monitor Starter Script
 *
 * This script starts the continuous email monitoring service
 * that checks for new emails every 5 seconds and responds using Claude AI
 */

const readline = require('readline')

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
}

const log = (color, message) => console.log(`${colors[color]}${message}${colors.reset}`)

async function startEmailMonitor() {
  try {
    log('cyan', '🚀 Starting Email Monitor Service...')
    log('blue', '📧 This will check for new emails every 5 seconds and respond using Claude AI')
    log('yellow', '⚠️  Make sure your Next.js server is running on port 3000')

    // Test if the server is running
    log('blue', '🧪 Testing server connection...')

    const testResponse = await fetch('http://localhost:3000/api/email/respond')
    if (!testResponse.ok) {
      throw new Error(`Server not ready: ${testResponse.status}`)
    }

    const testData = await testResponse.json()
    log('green', '✅ Server is ready!')
    log('blue', `📊 System Status: ${testData.status.overallStatus}`)
    log('blue', `📬 Messages available: ${testData.status.messagesAvailable}`)

    // Start the email monitor
    log('cyan', '🔄 Starting continuous email monitoring...')

    const startResponse = await fetch('http://localhost:3000/api/email/monitor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'start' })
    })

    const startData = await startResponse.json()

    if (startData.success) {
      log('green', '✅ Email monitor started successfully!')
      log('blue', `⏰ Checking every ${startData.monitor.checkInterval / 1000} seconds`)
      log('blue', `📅 Last check: ${new Date(startData.monitor.lastCheckTime).toLocaleString()}`)
    } else {
      throw new Error(startData.message || 'Failed to start monitor')
    }

    // Show status updates every 30 seconds
    const statusInterval = setInterval(async () => {
      try {
        const statusResponse = await fetch('http://localhost:3000/api/email/monitor')
        const statusData = await statusResponse.json()

        if (statusData.success && statusData.monitor.isRunning) {
          const nextCheck = statusData.monitor.nextCheckIn ?
            `${Math.ceil(statusData.monitor.nextCheckIn / 1000)}s` : 'now'
          log('cyan', `📊 Monitor Status: Running | Next check in: ${nextCheck} | Last check: ${new Date(statusData.monitor.lastCheckTime).toLocaleTimeString()}`)
        } else {
          log('red', '❌ Monitor appears to be stopped!')
        }
      } catch (error) {
        log('red', `❌ Status check failed: ${error.message}`)
      }
    }, 30000)

    // Setup graceful shutdown
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })

    log('yellow', '\n💡 Press Enter to stop the email monitor or Ctrl+C to exit')

    rl.on('line', async () => {
      log('yellow', '⏹️  Stopping email monitor...')

      try {
        const stopResponse = await fetch('http://localhost:3000/api/email/monitor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'stop' })
        })

        const stopData = await stopResponse.json()

        if (stopData.success) {
          log('green', '✅ Email monitor stopped successfully!')
        } else {
          log('red', `❌ Failed to stop monitor: ${stopData.message}`)
        }
      } catch (error) {
        log('red', `❌ Error stopping monitor: ${error.message}`)
      }

      clearInterval(statusInterval)
      rl.close()
      process.exit(0)
    })

    process.on('SIGINT', async () => {
      log('yellow', '\n⏹️  Received interrupt signal, stopping email monitor...')

      try {
        await fetch('http://localhost:3000/api/email/monitor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'stop' })
        })
      } catch (error) {
        // Ignore errors on shutdown
      }

      clearInterval(statusInterval)
      rl.close()
      process.exit(0)
    })

  } catch (error) {
    log('red', `❌ Failed to start email monitor: ${error.message}`)
    log('yellow', '💡 Make sure your Next.js development server is running: npm run dev')
    process.exit(1)
  }
}

// Run the script
startEmailMonitor()