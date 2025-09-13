"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, Users, Target, CheckCircle, Bot, BarChart3 } from "lucide-react"
import { AIAssistant } from "./ai-assistant"
import { MonitoringDashboard } from "./monitoring-dashboard"
import { VolunteerCalendar } from "./volunteer-calendar"

export function EventDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard")
  const [events] = useState([
    {
      id: 1,
      name: "Community Center Drive",
      date: "Saturday, Dec 16",
      time: "9:00 AM",
      targetDonors: 30,
      currentRSVPs: 23,
      venue: "Community Center",
      status: "active",
    },
    {
      id: 2,
      name: "University Campus Drive",
      date: "Monday, Dec 18",
      time: "10:00 AM",
      targetDonors: 50,
      currentRSVPs: 42,
      venue: "University Campus",
      status: "active",
    },
    {
      id: 3,
      name: "Corporate Office Drive",
      date: "Wednesday, Dec 20",
      time: "1:00 PM",
      targetDonors: 25,
      currentRSVPs: 18,
      venue: "Corporate Office",
      status: "active",
    },
  ])

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="ai-assistant" className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              AI Assistant
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Calendar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-4">
            <MonitoringDashboard />
          </TabsContent>

          <TabsContent value="ai-assistant" className="space-y-4">
            <Card>
              <CardContent className="p-6">
                <AIAssistant />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="calendar" className="space-y-4">
            <VolunteerCalendar />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
