# 🚀 Hackathon Demo: Autonomous Email Reply System

## 🎯 **What's Running:**
- ✅ **Email Polling System**: Checking for new emails every 5 seconds
- ✅ **Claude AI**: Generating intelligent responses
- ✅ **AgentMail Integration**: Sending automated replies
- ✅ **Duplicate Prevention**: Won't respond to the same email twice

## 🧪 **Demo Instructions:**

### **Step 1: Show the System is Running**
```bash
# Check polling system status
node email-polling-system.js stats
```

### **Step 2: Send a Test Email**
1. **Open Gmail** (anishneema0@gmail.com)
2. **Send email to**: `orcha@agentmail.to`
3. **Subject**: "I want to donate blood - help me schedule"
4. **Content**: "Hi! I'm interested in donating blood at your blood drive event. Can you please send me more information about the requirements and how I can schedule an appointment?"

### **Step 3: Watch the Magic Happen**
- **Within 5 seconds**: System detects the new email
- **Claude AI analyzes**: Determines if reply is needed
- **Automated response sent**: Back to your Gmail inbox
- **Check Gmail**: You'll receive an intelligent reply with event details

## 📊 **Demo Features to Highlight:**

### **🤖 Intelligent AI Responses**
- **Context-aware**: Knows about Red Cross blood drives
- **Event details**: September 20, 2025, 9:00 AM - 3:00 PM
- **Location**: Downtown Community Center
- **Available spots**: 38 out of 50
- **Requirements**: Blood donation guidelines

### **🔄 Smart Processing**
- **No duplicates**: Won't respond to same email twice
- **Real-time**: Checks every 5 seconds
- **Reliable**: Works even when webhooks fail
- **Scalable**: Can handle multiple inboxes

### **📈 System Monitoring**
```bash
# Check system stats
curl -s https://hackmitproject.vercel.app/api/webhooks/email/stats | jq .

# Check processed emails
node email-polling-system.js stats

# Clear history for fresh demo
node email-polling-system.js clear
```

## 🎬 **Demo Script:**

1. **"This is our autonomous email reply system"**
2. **"It uses Claude AI to analyze incoming emails"**
3. **"Let me send a test email..."** (send from Gmail)
4. **"Watch as it automatically detects and responds..."** (within 5 seconds)
5. **"Check my Gmail - here's the intelligent response!"**
6. **"The system never responds to the same email twice"**
7. **"It's running continuously in the background"**

## 🚀 **Technical Highlights:**

- **AgentMail SDK**: Professional email infrastructure
- **Claude AI**: Anthropic's latest language model
- **Polling System**: Reliable alternative to webhooks
- **Duplicate Prevention**: Tracks processed emails
- **Real-time Processing**: 5-second response time
- **Production Ready**: Deployed on Vercel

## 🎯 **Key Selling Points:**

1. **Reliability**: Works even when webhooks fail
2. **Intelligence**: Context-aware responses
3. **Speed**: 5-second response time
4. **Scalability**: Can handle multiple inboxes
5. **No Duplicates**: Smart tracking system
6. **Production Ready**: Fully deployed system

## 🛑 **To Stop the System:**
```bash
# Press Ctrl+C in the terminal running the polling system
# Or kill the background process
```

**Your autonomous email reply system is now running and ready for the demo!** 🎉
