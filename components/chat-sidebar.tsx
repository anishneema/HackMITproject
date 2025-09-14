"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { useChatStore } from "@/lib/chat-manager"
import { Plus, MessageSquare, Trash2, MoreHorizontal, Edit3 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export function ChatSidebar() {
  const {
    sessions,
    activeSessionId,
    createSession,
    deleteSession,
    setActiveSession,
    updateSessionTitle,
  } = useChatStore()

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null)

  const handleNewChat = () => {
    const sessionId = createSession()
    setActiveSession(sessionId)
  }

  const handleSelectChat = (sessionId: string) => {
    setActiveSession(sessionId)
  }

  const handleDeleteChat = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setSessionToDelete(sessionId)
    setDeleteDialogOpen(true)
  }

  const confirmDeleteChat = () => {
    if (sessionToDelete) {
      deleteSession(sessionToDelete)
      setDeleteDialogOpen(false)
      setSessionToDelete(null)
    }
  }

  const handleRenameChat = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const newTitle = prompt("Enter new chat title:")
    if (newTitle && newTitle.trim()) {
      updateSessionTitle(sessionId, newTitle.trim())
    }
  }

  const getSessionToDelete = () => {
    return sessions.find(s => s.id === sessionToDelete)
  }

  return (
    <div className="w-64 bg-card border-r border-border flex flex-col h-full overflow-visible">
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
      <ScrollArea className="flex-1 overflow-visible">
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

              {/* Options buttons */}
              <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 mr-1"
                  onClick={(e) => handleRenameChat(session.id, e)}
                  title="Rename chat"
                >
                  <Edit3 className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={(e) => handleDeleteChat(session.id, e)}
                  title="Delete chat"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Chat</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{getSessionToDelete()?.title}"? This action cannot be undone.
              All messages in this chat will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteChat}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Chat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}