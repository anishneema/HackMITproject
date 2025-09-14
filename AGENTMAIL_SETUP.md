# AgentMail Integration Setup

## Current Status
The AgentMail integration is currently running in **simulation mode** because the AgentMail API endpoints are not accessible. The system will automatically fallback to simulation when the real API is not available.

## Environment Variables
Make sure these are set in your `.env.local` file:

```bash
AGENT_MAIL_API_KEY=your_agentmail_api_key_here
AGENT_MAIL_INBOX=hackmit@agentmail.to
```

## How It Works

### 1. CSV Upload Flow
1. User uploads CSV file with contacts
2. System processes and validates contacts
3. Calls `/api/agentmail/send` endpoint
4. Attempts to send via AgentMail API
5. Falls back to simulation if API is unavailable

### 2. Email Template
The system sends personalized emails with this template:

```
Subject: Join Us for a Life-Saving Blood Drive!

Hello {{firstName}},

We hope this message finds you well. We're reaching out to invite you to participate in our upcoming blood drive.

Your support has always been invaluable to our mission, and we would be honored to have you join us for this important initiative.

Our next event details:
- Date: This Saturday
- Time: 9:00 AM - 3:00 PM
- Location: Community Center
- Duration: Typically 3-4 hours

Your contribution can make a real difference in saving lives. One blood donation can help save up to three lives!

Please reply to this email if you're interested in participating, and we'll send you the specific details once they're confirmed.

Thank you for considering this opportunity to help others.

Best regards,
Red Cross Events Team
```

### 3. API Endpoints

#### `/api/agentmail/send` (POST)
Sends emails to contacts from CSV upload.

**Request Body:**
```json
{
  "contacts": [
    {
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe"
    }
  ],
  "subject": "Email Subject",
  "body": "Email body with {{firstName}} placeholders",
  "eventName": "Event Name"
}
```

**Response:**
```json
{
  "success": true,
  "campaignId": "campaign_1234567890",
  "message": "Successfully sent emails to 1 contacts via hackmit@agentmail.to",
  "details": {
    "id": "campaign_1234567890",
    "status": "sent",
    "emailsSent": 1,
    "inbox": "hackmit@agentmail.to",
    "timestamp": "2025-09-14T02:49:24.769Z"
  },
  "isSimulation": true,
  "note": "This is a simulation - AgentMail API is not available"
}
```

#### `/api/agentmail/test` (GET)
Tests the AgentMail API connection.

**Response:**
```json
{
  "success": false,
  "error": "AgentMail test failed",
  "details": "fetch failed",
  "apiKey": "30db12f11c...",
  "inbox": "hackmit@agentmail.to"
}
```

## Setting Up Real AgentMail API

When the AgentMail API becomes available:

1. **Update API Endpoints**: The current code tries `https://api.agentmail.io/v1/send` - update this to the correct endpoint
2. **Authentication**: Ensure the API key format is correct (currently using `Bearer` token)
3. **Request Format**: Verify the request body format matches AgentMail's requirements
4. **Response Handling**: Update response parsing to match AgentMail's actual response format

## Current Features

✅ **CSV Processing**: Flexible parsing of various CSV formats
✅ **Email Personalization**: Template with `{{firstName}}` placeholders
✅ **Error Handling**: Graceful fallback to simulation
✅ **Real-time Feedback**: User sees immediate results in chat
✅ **Campaign Tracking**: Generates campaign IDs for tracking
✅ **Webhook Support**: Ready for reply tracking when API is available

## Testing

You can test the integration by:

1. **Upload a CSV file** in the chat interface
2. **Check the console** for detailed logs
3. **Test API directly**:
   ```bash
   curl -X POST "http://localhost:3000/api/agentmail/send" \
     -H "Content-Type: application/json" \
     -d '{"contacts":[{"email":"test@example.com","firstName":"John","lastName":"Doe"}],"subject":"Test","body":"Hello {{firstName}}","eventName":"Test"}'
   ```

## Next Steps

1. **Get AgentMail API Access**: Contact AgentMail support for API access
2. **Update Endpoints**: Modify API endpoints when documentation is available
3. **Enable Webhooks**: Set up reply tracking and sentiment analysis
4. **Add Analytics**: Track email opens, clicks, and responses
