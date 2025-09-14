# 🧪 Local Testing Guide for Autonomous Email System

## Prerequisites

1. **Development server running** on port 3000
2. **Environment variables** configured
3. **API keys** for Claude AI and AgentMail

## 🚀 Quick Start

### 1. Check if Dev Server is Running
```bash
# Should show a process running npm run dev
ps aux | grep "npm run dev"
```

If not running, start it:
```bash
npm run dev
```

### 2. Test System Health
```bash
# Test if webhook endpoint is accessible
curl http://localhost:3000/api/webhooks/email
```

Expected response:
```json
{
  "status": "healthy",
  "service": "AgentMail Webhook Handler",
  "timestamp": "2025-09-14T..."
}
```

### 3. Run Automated Tests
```bash
# Run the comprehensive test suite
node test-autonomous-email.js
```

## 🧪 Manual Testing

### Test Individual Components

#### Test Claude AI Connection
```bash
curl http://localhost:3000/api/test-claude
```

#### Test AgentMail Connection
```bash
curl http://localhost:3000/api/agentmail/test
```

#### Test Webhook Stats
```bash
curl http://localhost:3000/api/webhooks/email/stats
```

#### Test System Configuration
```bash
curl http://localhost:3000/api/webhooks/email/config
```

### Simulate Webhook Calls

#### Test with Positive Interest Email
```bash
curl -X POST http://localhost:3000/api/webhooks/email \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-1",
    "type": "message.received",
    "data": {
      "id": "msg-test-1",
      "from": "test@example.com",
      "to": ["hackmit@agentmail.to"],
      "subject": "Interested in blood drive",
      "text": "Hi! I am interested in participating in your blood drive event.",
      "thread_id": "thread-test-1",
      "created_at": "'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'"
    }
  }'
```

#### Test with Question Email
```bash
curl -X POST http://localhost:3000/api/webhooks/email \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-2",
    "type": "message.received",
    "data": {
      "id": "msg-test-2",
      "from": "question@example.com",
      "to": ["hackmit@agentmail.to"],
      "subject": "Blood donation requirements",
      "text": "What are the requirements to donate blood?",
      "thread_id": "thread-test-2",
      "created_at": "'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'"
    }
  }'
```

## 📊 Expected Results

### Successful Webhook Response
```json
{
  "success": true,
  "message": "Reply sent automatically",
  "replyType": "information",
  "confidence": 0.85
}
```

### No Reply Needed
```json
{
  "success": true,
  "message": "No reply needed"
}
```

### Auto-reply Disabled
```json
{
  "success": true,
  "message": "Auto-reply disabled"
}
```

## 🔍 Debugging

### Check Logs
Monitor your terminal where `npm run dev` is running for detailed logs:

```
📧 AgentMail webhook received: { type: 'message.received', messageId: 'msg-test-1', from: 'test@example.com', subject: 'Interested in blood drive' }
🔍 Claude response: {"shouldReply":true,"replyType":"information","replyContent":"Thank you for your interest! Our next blood drive is scheduled for September 20, 2025 at the Downtown Community Center from 9:00 AM to 3:00 PM. We have 38 spots available out of 50. Please let us know if you'd like to schedule an appointment.","confidence":0.9}
✅ Claude decision: { shouldReply: true, replyType: 'information', confidence: 0.9 }
🤖 Sending information reply to test@example.com (confidence: 0.9)
📤 Sending reply via AgentMail: { to: 'test@example.com', subject: 'Re: Interested in blood drive', threadId: 'thread-test-1' }
✅ AgentMail reply sent successfully: reply-123
✅ Autonomous reply sent successfully
```

### Common Issues

1. **"AgentMail API key not found"**
   - Check `.env.local` has `AGENT_MAIL_API_KEY`
   - Restart dev server after adding env vars

2. **"Claude connection failed"**
   - Check `.env.local` has `ANTHROPIC_API_KEY`
   - Verify API key has credits

3. **"Webhook not accessible"**
   - Ensure dev server is running on port 3000
   - Check for any port conflicts

4. **"Invalid response format from Claude"**
   - Claude sometimes adds extra text to JSON
   - System has fallback handling for this

## 🎯 Testing Different Scenarios

The test script includes these scenarios:

1. **Positive Interest** - Should generate information reply
2. **Question about Requirements** - Should generate detailed response
3. **Scheduling Request** - Should generate scheduling help
4. **Negative Response** - Should generate polite decline
5. **Spam/Unrelated** - Should skip reply

## 📈 Monitoring

After running tests, check the stats:
```bash
curl http://localhost:3000/api/webhooks/email/stats
```

You should see updated statistics:
```json
{
  "stats": {
    "totalReceived": 5,
    "repliesSent": 4,
    "repliesSkipped": 1,
    "errors": 0,
    "lastProcessed": "2025-09-14T..."
  }
}
```

## 🚀 Next Steps

Once local testing works:

1. **Deploy to Vercel** to test with real webhooks
2. **Configure AgentMail webhook** to point to your production URL
3. **Send real test emails** to `hackmit@agentmail.to`
4. **Monitor via dashboard** for real-time activity

Happy testing! 🎉
