#!/usr/bin/env node

/**
 * Demo Status Checker - Show system status for hackathon demo
 */

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' })

const fs = require('fs')
const path = require('path')

const PROCESSED_FILE = path.join(__dirname, '.processed-emails.json')

async function showSystemStatus() {
  console.log('🚀 AUTONOMOUS EMAIL REPLY SYSTEM - DEMO STATUS')
  console.log('=' .repeat(60))
  
  // Check processed emails
  let processedCount = 0
  try {
    if (fs.existsSync(PROCESSED_FILE)) {
      const data = fs.readFileSync(PROCESSED_FILE, 'utf8')
      processedCount = JSON.parse(data).length
    }
  } catch (error) {
    console.log('📝 No processed emails file found')
  }

  // Check webhook status
  try {
    const response = await fetch('https://hackmitproject.vercel.app/api/webhooks/email/stats')
    const stats = await response.json()
    
    console.log('📊 SYSTEM STATUS:')
    console.log(`   ✅ Claude AI: ${stats.status.claudeConnected ? 'Connected' : 'Disconnected'}`)
    console.log(`   ✅ AgentMail: ${stats.status.agentMailConnected ? 'Connected' : 'Disconnected'}`)
    console.log(`   ✅ Auto-Reply: ${stats.status.autoReplyEnabled ? 'Enabled' : 'Disabled'}`)
    console.log(`   📧 Processed Emails: ${processedCount}`)
    console.log(`   🔄 Webhook Active: ${stats.status.webhookActive ? 'Yes' : 'No'}`)
    
    console.log('\n🎯 DEMO READY!')
    console.log('📧 Send an email from Gmail to: orcha@agentmail.to')
    console.log('⏱️  System checks every 5 seconds')
    console.log('🤖 Claude AI will generate intelligent responses')
    
    console.log('\n📋 SAMPLE EMAIL TO SEND:')
    console.log('To: orcha@agentmail.to')
    console.log('Subject: I want to donate blood - help me schedule')
    console.log('Content: Hi! I\'m interested in donating blood at your blood drive event. Can you please send me more information about the requirements and how I can schedule an appointment?')
    
  } catch (error) {
    console.log('❌ Error checking system status:', error.message)
  }
}

showSystemStatus().catch(console.error)
