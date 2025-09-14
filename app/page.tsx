import { EventDashboard } from "@/components/event-dashboard"
import { AgentMailInitializer } from "@/components/agentmail-initializer"

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <AgentMailInitializer />
      <EventDashboard />
    </main>
  )
}
