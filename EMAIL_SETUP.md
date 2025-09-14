# Real Email Sending Setup

## Current Status
✅ **Real Email Sending Implemented!** The system now sends actual emails instead of just simulating them.

## Quick Setup (Gmail)

### 1. Enable 2-Factor Authentication
- Go to your Google Account settings
- Enable 2-Factor Authentication if not already enabled

### 2. Generate App Password
- Go to Google Account → Security → App passwords
- Generate a new app password for "Mail"
- Copy the 16-character password (e.g., `abcd efgh ijkl mnop`)

### 3. Update Environment Variables
Edit your `.env.local` file:

```bash
# SMTP Email Configuration (for real email sending)
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-character-app-password
SMTP_FROM_NAME=Red Cross Events Team
SMTP_FROM_EMAIL=hackmit@agentmail.to
```

**Important:** 
- Use your actual Gmail address for `SMTP_USER`
- Use the 16-character app password (not your regular password) for `SMTP_PASS`
- The `SMTP_FROM_EMAIL` can be `hackmit@agentmail.to` or your Gmail address

### 4. Restart the Server
```bash
npm run dev
```

## Testing

### Test Email Sending
```bash
curl -X POST "http://localhost:3000/api/email/send" \
  -H "Content-Type: application/json" \
  -d '{
    "contacts": [
      {
        "email": "your-test-email@gmail.com",
        "firstName": "Test",
        "lastName": "User"
      }
    ],
    "subject": "Test Email from Red Cross",
    "body": "Hello {{firstName}}, this is a test email from the Red Cross system!",
    "eventName": "Test Event"
  }'
```

### Check Configuration
```bash
curl -X GET "http://localhost:3000/api/email/send"
```

## How It Works

1. **CSV Upload** → User uploads CSV with contacts
2. **Email Processing** → System processes contacts and personalizes emails
3. **SMTP Sending** → Emails are sent via Gmail SMTP to actual recipients
4. **Real Delivery** → Recipients receive emails in their inbox
5. **Reply Tracking** → Recipients can reply to the emails

## Email Template

The system sends this personalized email:

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

## Features

✅ **Real Email Delivery** - Emails actually reach recipients' inboxes
✅ **Personalization** - Uses {{firstName}} placeholders
✅ **Error Handling** - Shows which emails failed and why
✅ **Rate Limiting** - Prevents being blocked by email providers
✅ **HTML & Text** - Sends both HTML and plain text versions
✅ **Campaign Tracking** - Generates unique campaign IDs

## Troubleshooting

### "SMTP connection failed"
- Check your Gmail credentials
- Make sure you're using an App Password, not your regular password
- Ensure 2-Factor Authentication is enabled

### "Authentication failed"
- Verify your email address is correct
- Double-check the App Password (16 characters, no spaces)
- Try generating a new App Password

### Emails not received
- Check spam/junk folders
- Verify recipient email addresses are correct
- Check the console logs for specific error messages

## Alternative Email Providers

You can also use other SMTP providers by updating the transporter configuration in `/lib/email-sender.ts`:

- **SendGrid**: `service: 'sendgrid'`
- **Mailgun**: Custom SMTP settings
- **Outlook**: `service: 'hotmail'`
- **Custom SMTP**: Specify host, port, and security settings

## Next Steps

1. **Set up your Gmail App Password**
2. **Update the environment variables**
3. **Restart the server**
4. **Test with a CSV upload**
5. **Check your inbox for the emails!**

The system will now send real emails to all contacts in your CSV files! 🎉
