const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3002';

async function testEmailResponseSystem() {
  console.log('🧪 Testing Email Response System');
  console.log('=====================================');

  try {
    // Test 1: Get system status
    console.log('\n1. Testing system status...');
    const statusResponse = await fetch(`${BASE_URL}/api/email/respond`);
    const statusData = await statusResponse.json();

    console.log('✅ Status Response:', JSON.stringify(statusData, null, 2));

    // Test 2: Update context
    console.log('\n2. Testing context update...');
    const contextUpdate = {
      organizationName: 'Red Cross Blood Services',
      currentEvents: [
        {
          name: 'Emergency Blood Drive',
          date: 'Tomorrow, 10:00 AM - 4:00 PM',
          location: 'Main Hospital',
          description: 'Urgent need for O+ and O- blood types'
        },
        {
          name: 'Community Health Fair',
          date: 'Next week, Saturday',
          location: 'City Park',
          description: 'Free health screenings and blood drive'
        }
      ],
      faqData: [
        {
          question: 'Is it safe to donate blood?',
          answer: 'Yes, blood donation is completely safe. We use sterile, single-use equipment for every donor.'
        }
      ]
    };

    const updateResponse = await fetch(`${BASE_URL}/api/email/respond`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(contextUpdate)
    });
    const updateData = await updateResponse.json();

    console.log('✅ Context Update Response:', JSON.stringify(updateData, null, 2));

    // Test 3: Process emails (simulate)
    console.log('\n3. Testing email processing...');
    const processResponse = await fetch(`${BASE_URL}/api/email/respond`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    const processData = await processResponse.json();

    console.log('✅ Email Processing Response:', JSON.stringify(processData, null, 2));

    // Test 4: Test existing AgentMail endpoints
    console.log('\n4. Testing existing AgentMail endpoints...');

    const agentMailTestResponse = await fetch(`${BASE_URL}/api/agentmail/test`);
    const agentMailTestData = await agentMailTestResponse.json();
    console.log('📧 AgentMail Test:', JSON.stringify(agentMailTestData, null, 2));

    const messagesResponse = await fetch(`${BASE_URL}/api/agentmail/messages`);
    const messagesData = await messagesResponse.json();
    console.log('📬 Messages Test:', JSON.stringify(messagesData, null, 2));

    console.log('\n🎉 All tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Test the API endpoints
testEmailResponseSystem();

console.log(`
📋 Email Response System Usage:

1. **Check Status**: GET /api/email/respond
   - Shows system status, connection tests, and current context

2. **Update Context**: PUT /api/email/respond
   - Update organization info, events, and FAQ data
   - Body: { organizationName, currentEvents, faqData, ... }

3. **Process Emails**: POST /api/email/respond
   - Fetches unread emails from AgentMail
   - Generates responses using Claude AI
   - Sends replies via AgentMail
   - Returns processing results

4. **Manual Workflow**:
   - Emails arrive at hackmit@agentmail.to
   - System fetches unread messages
   - Claude generates contextual responses
   - AgentMail sends replies automatically

5. **Integration Examples**:
   - Run as cron job: POST /api/email/respond every 15 minutes
   - Webhook trigger: Call from AgentMail webhook when new email arrives
   - Manual trigger: Button in dashboard to process pending emails
`);