"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { useChatStore } from "@/lib/chat-manager"
import { Plus, MessageSquare, Trash2, MoreHorizontal } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function ChatSidebar() {
  const {
    sessions,
    activeSessionId,
    createSession,
    deleteSession,
    setActiveSession,
  } = useChatStore()

  const handleNewChat = () => {
    const sessionId = createSession()
    setActiveSession(sessionId)
  }

  const handleSelectChat = (sessionId: string) => {
    setActiveSession(sessionId)
  }

  const handleDeleteChat = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    deleteSession(sessionId)
  }

  return (
    <div className="w-64 bg-card border-r border-border flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <Button
          onClick={handleNewChat}
          className="w-full justify-start gap-2"
          variant="outline"
        >
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
      </div>

      {/* Chat List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`group relative flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors hover:bg-accent ${
                session.id === activeSessionId ? "bg-accent" : ""
              }`}
              onClick={() => handleSelectChat(session.id)}
            >
              <MessageSquare className="h-4 w-4 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{session.title}</p>
                <p className="text-xs text-muted-foreground">
                  {session.messages.length} messages
                </p>
              </div>

              {/* Processing indicator */}
              {session.isProcessing && (
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                </div>
              )}

              {/* Options menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={(e) => handleDeleteChat(session.id, e)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Chat
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}

          {sessions.length === 0 && (
            <div className="text-center text-muted-foreground text-sm p-4">
              No chats yet. Click "New Chat" to start.
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <p className="text-xs text-muted-foreground">
          {sessions.length} chat{sessions.length !== 1 ? "s" : ""}
        </p>
      </div>
    </div>
  )
}