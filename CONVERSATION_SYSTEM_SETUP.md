# Email Conversation System with Claude AI

## 🎉 System Successfully Implemented!

Your AgentMail system now has **intelligent conversation capabilities** using Anthropic's Claude AI. Users can have full email conversations with your system, and it will respond intelligently based on the context of your blood drive events.

## ✅ What's Working

### 1. **Email Reply Processing**
- ✅ AgentMail webhook receives email replies
- ✅ System extracts sender email, message content, and thread ID
- ✅ Context is maintained across multiple email exchanges

### 2. **Claude AI Integration**
- ✅ Anthropic API key configured and working
- ✅ Intelligent response generation based on dashboard data
- ✅ Contextual understanding of blood drive events
- ✅ Personalized responses using sender information

### 3. **Automated Response System**
- ✅ Automatic email replies based on user intent
- ✅ Human review flagging for complex situations
- ✅ Action suggestions (scheduling, info sending, escalation)
- ✅ Conversation state tracking

### 4. **Conversation Intelligence**
- ✅ Sentiment analysis (positive, negative, neutral, question)
- ✅ Intent recognition (scheduling, information requests, complaints)
- ✅ Multi-turn conversation support
- ✅ Context-aware responses about specific events

## 🔧 System Architecture

### Core Components

1. **Conversation Manager** (`lib/conversation-manager.ts`)
   - Manages conversation threads and message history
   - Handles sentiment analysis and intent detection
   - Provides fallback responses when AI is unavailable

2. **Conversation Generation API** (`app/api/conversation/generate/route.ts`)
   - Server-side Claude AI integration
   - Context-aware prompt engineering
   - Response analysis and action suggestion

3. **Enhanced Webhook** (`app/api/webhooks/agent-mail/route.ts`)
   - Processes incoming email replies
   - Generates intelligent responses using Claude
   - Attempts automated reply sending
   - Executes suggested actions

4. **Testing API** (`app/api/conversation/test/route.ts`)
   - Comprehensive testing interface
   - Conversation simulation
   - Thread management testing

## 📊 Example Conversation Flow

### User sends: *"Hi! When is the next blood drive event?"*

**Claude Response:**
```
Hi there! I'm glad you're interested in our upcoming blood drive event.
The next one is scheduled for September 20, 2025 from 9:00 AM to 3:00 PM
at the Community Center.

This will be a great opportunity to come out and donate blood to help save
lives in our community. The process is quick and easy, typically taking
around an hour from start to finish.

Are you available to attend this event? I'd be happy to help you get
registered if you're interested in donating.
```

**System Actions:**
- ✅ Should send: Yes
- ✅ Requires review: No
- 💡 Suggested action: Send additional information

## 🧪 Testing the System

### 1. Test Conversation Generation
```bash
curl -X POST "http://localhost:3001/api/conversation/generate" \\
  -H "Content-Type: application/json" \\
  -d '{
    "message": "When is the next blood drive?",
    "senderEmail": "user@example.com",
    "conversationHistory": [],
    "dashboardContext": {
      "events": [{
        "name": "Community Blood Drive",
        "date": "2025-09-20",
        "time": "9:00 AM - 3:00 PM",
        "venue": "Community Center"
      }]
    }
  }'
```

### 2. Test Webhook Processing
```bash
curl -X POST "http://localhost:3001/api/webhooks/agent-mail" \\
  -H "Content-Type: application/json" \\
  -d '{
    "type": "email_received",
    "requires_response": true,
    "sender_email": "test@example.com",
    "message_content": "I want to schedule an appointment for the blood drive",
    "thread_id": "thread_123",
    "campaign_id": "campaign_456"
  }'
```

### 3. Test Conversation Management
```bash
# Test individual conversation
curl -X POST "http://localhost:3001/api/conversation/test" \\
  -H "Content-Type: application/json" \\
  -d '{
    "message": "What should I bring to donate blood?",
    "sender_email": "donor@example.com"
  }'

# Get all conversations
curl "http://localhost:3001/api/conversation/test"
```

## 🎯 Conversation Scenarios Handled

### ✅ **Information Requests**
- "When is the next event?"
- "Where is the blood drive located?"
- "What time does it start?"
- "How long does donation take?"

### ✅ **Scheduling Requests**
- "I want to sign up"
- "Can you book me an appointment?"
- "I'd like to schedule a time"
- "Count me in for the drive"

### ✅ **Questions and Concerns**
- "What should I bring?"
- "Am I eligible to donate?"
- "Is it safe?"
- "What's the process like?"

### ✅ **Positive Responses**
- "Yes, I'm interested!"
- "This sounds great!"
- "I'd love to participate"

### ✅ **Negative Responses**
- "Not interested, thanks"
- "I can't make it"
- "Please remove me"

## 🔮 Advanced Features

### **Smart Action Suggestions**
- **Schedule Appointment**: When users express interest
- **Send Information**: When users ask questions
- **Escalate**: For complaints or complex issues
- **Close Conversation**: When users decline

### **Human Review Triggers**
- Complaints or problems mentioned
- Medical or accessibility needs
- Complex scheduling requests
- Unusual or concerning messages

### **Context Awareness**
- Current dashboard data (events, analytics, bookings)
- Conversation history and previous interactions
- User sentiment and engagement level
- Campaign-specific information

## 🚀 How to Use

### **For AgentMail Dashboard Users**
1. Send your CSV file as usual
2. Recipients will receive emails and can reply
3. The system automatically responds to replies
4. Check your AgentMail dashboard for conversation activity
5. Manually review flagged conversations if needed

### **For Testing**
1. Use the test scripts provided above
2. Monitor console output for detailed processing logs
3. Check conversation state via API endpoints
4. Simulate various user scenarios

## 📈 Real-World Usage

When recipients reply to your blood drive emails:

1. **AgentMail webhook** receives the reply
2. **Claude AI** analyzes the message and generates a response
3. **System** automatically sends the reply (if appropriate)
4. **Conversation** continues naturally with context maintained
5. **Actions** are suggested/executed (scheduling, info sending, etc.)
6. **Human staff** are notified for complex cases

## 🔧 Configuration

The system is ready to use with your existing:
- ✅ **AgentMail API Key**: Already configured
- ✅ **Anthropic API Key**: Fixed and working
- ✅ **Webhook Endpoint**: `/api/webhooks/agent-mail`
- ✅ **Dashboard Integration**: Real-time event data

## 📱 Next Steps

1. **Test with real emails** by uploading a CSV and having someone reply
2. **Monitor the AgentMail dashboard** for incoming conversations
3. **Customize responses** by modifying the system prompts
4. **Add more actions** like calendar integration or CRM updates
5. **Scale up** by processing multiple conversations simultaneously

The system is now **fully operational** and ready to handle email conversations with your blood drive recipients! 🩸✨