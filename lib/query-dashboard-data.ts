import { claudeAI, AIResponse } from "./claude-ai-service"
import { useDashboardStore } from "./dashboard-store"

export const queryDashboardData = async (
  userInput: string,
  conversationHistory?: Array<{
    type: 'user' | 'assistant'
    content: string
    timestamp: Date
  }>
): Promise<AIResponse> => {
  // Get current dashboard data from the store
  const dashboardStore = useDashboardStore.getState()
  const { events, campaigns, bookings, getDashboardTotals } = dashboardStore

  const dashboardData = {
    events,
    campaigns,
    bookings,
    totals: getDashboardTotals()
  }

  // Process the query with Claude AI including conversation history
  return await claudeAI.processMessage(userInput, dashboardData, conversationHistory)
}