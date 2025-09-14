# 🤖 Autonomous Email Reply System Setup Guide

## Overview
Your autonomous email reply system is now ready! It uses AgentMail webhooks to receive emails and Claude AI to generate intelligent responses automatically.

## 🔧 Required Environment Variables

Create a `.env.local` file in your project root with these variables:

```bash
# AgentMail Configuration
AGENT_MAIL_API_KEY=your_agentmail_api_key_here
AGENT_MAIL_INBOX=hackmit@agentmail.to
AGENT_MAIL_WEBHOOK_SECRET=whsec_Ntga03PxjzsEWYjg2zNewhmFVVcgczk5

# Claude AI Configuration
ANTHROPIC_API_KEY=sk-ant-api03-your_claude_api_key_here

# Optional: Vercel Configuration
VERCEL_URL=hackmitproject.vercel.app
```

## 📋 Webhook Configuration

Your webhook is already configured in AgentMail:
- **Webhook ID**: `d15ccdc7-b52c-4f57-afde-05a563101a1d`
- **URL**: `https://hackmitproject.vercel.app/api/webhooks/email`
- **Event Types**: `message.received`
- **Secret**: `whsec_Ntga03PxjzsEWYjg2zNewhmFVVcgczk5`

## 🚀 How It Works

### 1. Email Reception
1. Email arrives at `hackmit@agentmail.to`
2. AgentMail triggers webhook to your endpoint
3. System receives and validates the webhook

### 2. AI Analysis
1. Claude AI analyzes the email content
2. Determines if a reply is needed
3. Generates appropriate response based on Red Cross context

### 3. Automatic Reply
1. If confidence > 70%, sends reply automatically
2. Uses AgentMail SDK to send response
3. Tracks statistics and logs activity

## 📊 Monitoring Dashboard

Access the autonomous email dashboard at:
```
/components/autonomous-email-dashboard
```

Features:
- ✅ Real-time system status
- 📈 Reply statistics
- ⚙️ Configuration controls
- 🧪 System testing tools

## 🎯 Reply Types

Claude will generate these types of responses:
- **thank_you**: For positive responses
- **information**: Event details and requirements
- **scheduling**: Help with appointment booking
- **question_response**: Answer specific questions
- **polite_decline**: Handle negative responses
- **no_reply**: Skip spam/auto-responses

## ⚙️ Configuration Options

### System Settings
- **Auto-reply enabled**: Toggle on/off
- **Confidence threshold**: Minimum confidence to send (default: 70%)
- **Rate limiting**: Max 50 replies per hour
- **Reply delay**: 2 seconds between replies

### Claude Settings
- **Model**: claude-3-haiku-20240307
- **Temperature**: 0.3 (focused responses)
- **Max tokens**: 1000

## 🧪 Testing

### Test Webhook System
```bash
curl -X POST https://hackmitproject.vercel.app/api/webhooks/email/test
```

### Test Individual Components
```bash
# Test AgentMail connection
curl https://hackmitproject.vercel.app/api/agentmail/test

# Test Claude AI connection
curl https://hackmitproject.vercel.app/api/test-claude
```

### Test Webhook Stats
```bash
curl https://hackmitproject.vercel.app/api/webhooks/email/stats
```

## 📝 API Endpoints

### Webhook Handler
- **POST** `/api/webhooks/email` - Main webhook endpoint
- **GET** `/api/webhooks/email` - Health check

### Monitoring
- **GET** `/api/webhooks/email/stats` - System statistics
- **GET** `/api/webhooks/email/config` - Configuration
- **POST** `/api/webhooks/email/config` - Update settings
- **POST** `/api/webhooks/email/test` - Test system

## 🔍 Troubleshooting

### Common Issues

1. **Webhook not receiving emails**
   - Check AgentMail webhook configuration
   - Verify webhook URL is accessible
   - Check webhook secret matches

2. **Claude not responding**
   - Verify `ANTHROPIC_API_KEY` is set
   - Check API key has sufficient credits
   - Test Claude connection separately

3. **AgentMail sending fails**
   - Verify `AGENT_MAIL_API_KEY` is valid
   - Check inbox email is correct
   - Test AgentMail connection separately

### Debug Logs
Check your deployment logs for detailed error messages:
- Vercel: Dashboard → Functions → View Logs
- Local: Terminal output

## 🎉 You're Ready!

Your autonomous email reply system is now fully configured and ready to:

✅ **Receive emails** via AgentMail webhook  
✅ **Analyze content** with Claude AI  
✅ **Generate responses** based on Red Cross context  
✅ **Send replies** automatically  
✅ **Track statistics** and monitor performance  
✅ **Handle errors** gracefully  

Send a test email to `hackmit@agentmail.to` to see it in action! 🚀
