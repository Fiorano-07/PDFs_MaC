"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Download, MessageSquare, Send } from "lucide-react"

// Mock data for shared PDF
const mockComments = [
  {
    id: "1",
    author: "John Doe",
    avatar: "/placeholder-user.jpg",
    content: "This section needs more clarification on the implementation details.",
    timestamp: "2024-01-15 10:30 AM",
    page: 1,
  },
  {
    id: "2",
    author: "Jane Smith",
    avatar: "/placeholder-user.jpg",
    content: "Great work on the analysis! The charts are very clear.",
    timestamp: "2024-01-15 2:15 PM",
    page: 1,
  },
]

interface SharedPDFPageProps {
  params: { token: string };
  // searchParams?: { [key: string]: string | string[] | undefined }; // Optional: if you ever use searchParams
}

export default function SharedPDFPage({ params }: SharedPDFPageProps) {
  const [comments, setComments] = useState(mockComments)
  const [newComment, setNewComment] = useState("")
  const [guestName, setGuestName] = useState("")
  const [currentPage, setCurrentPage] = useState(1)

  const handleAddComment = () => {
    if (newComment.trim() && guestName.trim()) {
      const comment = {
        id: Date.now().toString(),
        author: guestName,
        avatar: "/placeholder-user.jpg",
        content: newComment,
        timestamp: new Date().toLocaleString(),
        page: currentPage,
      }
      setComments([...comments, comment])
      setNewComment("")
    }
  }

  const filteredComments = comments.filter((comment) => comment.page === currentPage)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900">Shared Document: Project Proposal.pdf</h1>
              <Badge variant="secondary">Shared Access</Badge>
            </div>

            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-80px)]">
        {/* PDF Viewer */}
        <div className="flex-1 bg-white border-r border-gray-200">
          <div className="h-full flex flex-col">
            {/* PDF Controls */}
            <div className="border-b border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-gray-600">Page {currentPage} of 5</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(5, currentPage + 1))}
                    disabled={currentPage === 5}
                  >
                    Next
                  </Button>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm">
                    Zoom Out
                  </Button>
                  <span className="text-sm text-gray-600">100%</span>
                  <Button variant="outline" size="sm">
                    Zoom In
                  </Button>
                </div>
              </div>
            </div>

            {/* PDF Content Area */}
            <div className="flex-1 p-8 overflow-auto bg-gray-100">
              <div className="max-w-4xl mx-auto">
                <div className="bg-white shadow-lg rounded-lg p-8 min-h-[800px]">
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">PDF Content - Page {currentPage}</h2>
                    <div className="w-full h-96 bg-gray-100 rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-4xl mb-4">📄</div>
                        <p className="text-gray-500">PDF content would be rendered here</p>
                        <p className="text-sm text-gray-400 mt-2">
                          This is a shared document accessible via invite link
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Sample content */}
                  <div className="space-y-4 text-gray-700">
                    <h3 className="text-xl font-semibold">Shared Document Content</h3>
                    <p>This document has been shared with you for review and collaboration.</p>
                    <p>You can view the content and add comments without needing to create an account.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Comments Sidebar */}
        <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Comments</h3>
              <Badge variant="secondary">
                <MessageSquare className="h-3 w-3 mr-1" />
                {comments.length}
              </Badge>
            </div>
            <p className="text-sm text-gray-600">Viewing comments for page {currentPage}</p>
          </div>

          {/* Comments List */}
          <div className="flex-1 overflow-auto p-4 space-y-4">
            {filteredComments.map((comment) => (
              <Card key={comment.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={comment.avatar || "/placeholder.svg"} alt={comment.author} />
                      <AvatarFallback>
                        {comment.author
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{comment.author}</p>
                      <p className="text-xs text-gray-500">{comment.timestamp}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-gray-700">{comment.content}</p>
                </CardContent>
              </Card>
            ))}

            {filteredComments.length === 0 && (
              <div className="text-center py-8">
                <MessageSquare className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No comments on this page yet</p>
              </div>
            )}
          </div>

          {/* Add Comment */}
          <div className="p-4 border-t border-gray-200">
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="guestName">Your Name</Label>
                <Input
                  id="guestName"
                  placeholder="Enter your name"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                />
              </div>
              <Textarea
                placeholder={`Add a comment for page ${currentPage}...`}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="min-h-[80px]"
              />
              <Button onClick={handleAddComment} className="w-full" disabled={!newComment.trim() || !guestName.trim()}>
                <Send className="h-4 w-4 mr-2" />
                Add Comment
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
