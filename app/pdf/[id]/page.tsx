"use client"

import React, { useEffect, useState, ChangeEvent, KeyboardEvent, Component } from "react"
import { useParams } from "next/navigation"
import { createClientComponentClient, User as SupabaseUser } from "@supabase/auth-helpers-nextjs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Share2, Download, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Loader2 } from "lucide-react"
import dynamic from 'next/dynamic'
import { pdfjs } from 'react-pdf';
import "react-pdf/dist/Page/AnnotationLayer.css"
import "react-pdf/dist/Page/TextLayer.css"

// Dynamically import the PDF viewer component
const PDFViewerComponent = dynamic(
  () => import('@/components/pdf-viewer').then((mod) => mod.PDFViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center h-full min-h-[calc(100vh-250px)] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <p className="text-blue-500 text-lg">Loading PDF viewer...</p>
        <p className="text-gray-500 text-sm">This might take a moment. Please wait...</p>
      </div>
    ),
  }
);

// Set up PDF.js worker
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;
}

interface UserProfile {
  email: string | null;
  full_name: string | null;
  user_name: string | null;
}

interface CommentFromDB {
  id: string;
  user_id: string;
  file_id: string;
  page_number: number;
  content: string;
  created_at: string;
  users: UserProfile;
}

interface Comment {
  id: string;
  user_id: string;
  file_id: string;
  page_number: number;
  content: string;
  created_at: string;
  user_email: string;
  user_name: string;
}

interface FileDetails {
  id: string
  title: string
  file_path: string
  original_name: string
  public_url?: string
}

interface PDFErrorBoundaryState {
  hasError: boolean
}

interface PDFErrorBoundaryProps {
  children: React.ReactNode
}

// Add ErrorBoundary component
class PDFErrorBoundary extends Component<PDFErrorBoundaryProps, PDFErrorBoundaryState> {
  constructor(props: PDFErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): PDFErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full min-h-[200px] text-center">
          <div className="text-red-500 text-lg">
            Something went wrong loading the PDF. Please try refreshing the page.
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function PDFViewer() {
  const params = useParams()
  const [file, setFile] = useState<FileDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [numPages, setNumPages] = useState<number>(0)
  const [pageNumber, setPageNumber] = useState(1)
  const [scale, setScale] = useState(1.0)
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState("")
  const [pdfError, setPdfError] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<SupabaseUser | null>(null)
  const supabase = createClientComponentClient()

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      console.log("Current user status:", user);
      setCurrentUser(user);
    };
    checkUser();

    const fileId = params.id as string;
    if (fileId) {
      fetchFileDetails(fileId)
    }
  }, [params.id, supabase.auth])

  useEffect(() => {
    const fileId = params.id as string;
    if (fileId && pageNumber) {
      fetchComments(fileId, pageNumber)
    }
  }, [params.id, pageNumber])

  const fetchFileDetails = async (fileId: string) => {
    setIsLoading(true);
    setPdfError(null);
    setFile(null);
    try {
      const { data: fileData, error: fileError } = await supabase
        .from("files")
        .select("id, title, file_path, original_name, public_url")
        .eq("id", fileId)
        .single()

      if (fileError) {
        console.error("Error fetching file details:", fileError)
        setPdfError("Failed to fetch file details. Please check the file ID or network.");
        setIsLoading(false);
        return
      }

      if (fileData && fileData.file_path) {
        const { data: signedUrlData, error: signedUrlError } = await supabase
          .storage
          .from('pdfs')
          .createSignedUrl(fileData.file_path, 3600)

        if (signedUrlError) {
          console.error("Error getting signed URL:", signedUrlError)
          setPdfError(`Failed to load PDF (Storage error: ${signedUrlError.message}). Ensure the file exists and RLS is configured for storage.`);
          setFile(fileData as FileDetails)
        } else {
          setFile({
            ...fileData,
            public_url: signedUrlData?.signedUrl
          } as FileDetails)
        }
      } else if (fileData && !fileData.file_path) {
        console.error("File data fetched but 'file_path' is missing:", fileData);
        setPdfError("File path is missing in the database record.");
        setFile(fileData as FileDetails);
      } else {
        setPdfError("File not found or essential data is missing.");
      }
    } catch (error: any) {
      console.error("Error in fetchFileDetails function:", error)
      setPdfError(`An unexpected error occurred: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }

  const fetchComments = async (fileId: string, currentPageNumber: number) => {
    try {
      // First, fetch comments
      const { data: commentsData, error: commentsError } = await supabase
        .from("comments")
        .select("*")
        .eq("file_id", fileId)
        .eq("page_number", currentPageNumber)
        .order("created_at", { ascending: true });

      if (commentsError) {
        console.error("Error fetching comments:", commentsError);
        setComments([]);
        return;
      }

      if (commentsData && commentsData.length > 0) {
        // Get unique user IDs
        const userIds = Array.from(new Set(commentsData.map(comment => comment.user_id)));
        
        // Fetch user profiles
        const { data: usersData, error: usersError } = await supabase
          .from("profiles") // Using profiles table instead of users
          .select("id, email, full_name, user_name")
          .in("id", userIds);

        if (usersError) {
          console.error("Error fetching user profiles:", usersError);
        }

        // Create a map of user data
        const userMap = new Map(
          (usersData || []).map(user => [user.id, user])
        );

        // Combine comment data with user data
        const commentsWithUserData: Comment[] = commentsData.map(comment => {
          const userData = userMap.get(comment.user_id);
          return {
            ...comment,
            user_email: userData?.email || "Anonymous",
            user_name: userData?.user_name || userData?.full_name || userData?.email?.split('@')[0] || "Anonymous"
          };
        });

        setComments(commentsWithUserData);
      } else {
        setComments([]);
      }
    } catch (error: any) {
      console.error("Error in fetchComments function:", error.message);
      setComments([]);
    }
  }

  const handleAddComment = async () => {
    if (!newComment.trim() || !file || !currentUser) {
      console.warn("Cannot add comment: missing data or user not authenticated.");
      return;
    }
    const fileId = file.id;

    try {
      const { error } = await supabase
        .from("comments")
        .insert({
          file_id: fileId,
          user_id: currentUser.id,
          page_number: pageNumber,
          content: newComment.trim()
        });

      if (error) {
        console.error("Error adding comment:", error);
        return;
      }

      setNewComment("");
      await fetchComments(fileId, pageNumber);
    } catch (error) {
      console.error("Error in handleAddComment:", error);
    }
  }

  const onDocumentLoadSuccess = (numPages: number) => {
    setNumPages(numPages)
    setPdfError(null)
  }

  const onDocumentLoadError = (error: Error) => {
    console.error("React-PDF - Error loading PDF document:", error.message);
    setPdfError("Loading PDF viewer... Please wait.");
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <p className="text-blue-500 text-lg">Loading file data...</p>
        <p className="text-gray-500 text-sm">This might take a moment. Please wait...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b py-4">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-900">
              {file?.title || file?.original_name || "File details not loaded"}
            </h1>
            <div className="flex items-center space-x-4">
              <Button variant="outline" className="text-gray-600 hover:text-gray-900 border-gray-200" disabled={!file}>
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Button 
                variant="outline" 
                className="text-gray-600 hover:text-gray-900 border-gray-200" 
                disabled={!file?.public_url} 
                onClick={() => file?.public_url && window.open(file.public_url, '_blank')}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* PDF Viewer */}
          <div className="flex-1">
            <div className="bg-white border rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
                    disabled={pageNumber <= 1 || !file?.public_url}
                    className="text-gray-600 hover:text-gray-900 border-gray-200"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-gray-600">
                    Page {file?.public_url ? pageNumber : "-"} of {file?.public_url ? numPages : "-"}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPageNumber(Math.min(numPages, pageNumber + 1))}
                    disabled={pageNumber >= numPages || !file?.public_url}
                    className="text-gray-600 hover:text-gray-900 border-gray-200"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setScale(Math.max(0.5, scale - 0.1))}
                    className="text-gray-600 hover:text-gray-900 border-gray-200"
                    disabled={!file?.public_url}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="text-gray-600">{Math.round(scale * 100)}%</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setScale(Math.min(2, scale + 0.1))}
                    className="text-gray-600 hover:text-gray-900 border-gray-200"
                    disabled={!file?.public_url}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex justify-center bg-gray-50 rounded-lg overflow-auto min-h-[calc(100vh-250px)] lg:min-h-[600px]">
                {pdfError ? (
                  <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-4">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                    <p className="text-blue-500 text-lg">Loading PDF viewer...</p>
                    <p className="text-gray-500 text-sm">This might take a moment. Please wait...</p>
                  </div>
                ) : file?.public_url ? (
                  <PDFViewerComponent
                    url={file.public_url}
                    pageNumber={pageNumber}
                    scale={scale}
                    onLoadSuccess={onDocumentLoadSuccess}
                    onLoadError={onDocumentLoadError}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-4">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                    <p className="text-blue-500 text-lg">
                      {isLoading ? "Loading PDF..." : "Preparing PDF viewer..."}
                    </p>
                    <p className="text-gray-500 text-sm">This might take a moment. Please wait...</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Comments Section - Improved Layout */}
<div className="w-full lg:w-96">
  <div className="bg-white border rounded-lg shadow-sm flex flex-col h-fit max-h-[500px]">
    {/* Header */}
    <div className="p-4 border-b border-gray-100">
      <h2 className="text-lg font-semibold text-gray-900">
        Comments for Page {pageNumber}
      </h2>
    </div>
    
    {/* Comments List */}
    <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[120px] max-h-[300px]">
      {comments.length === 0 ? (
        <div className="flex items-center justify-center h-24">
          <p className="text-gray-500 text-sm">No comments for this page.</p>
        </div>
      ) : (
        comments.map((comment) => (
          <div key={comment.id} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
            <div className="flex items-start space-x-3">
              <Avatar className="h-7 w-7 flex-shrink-0">
                <AvatarFallback className="bg-blue-100 text-blue-600 text-xs font-medium">
                  {comment.user_name?.[0]?.toUpperCase() || 'A'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-900 truncate">
                    {comment.user_name}
                  </span>
                  <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                    {new Date(comment.created_at).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true
                    })}
                  </span>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap break-words">
                  {comment.content}
                </p>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
    
    {/* Input Section */}
    <div className="p-4 border-t border-gray-100 bg-gray-50/50">
      <div className="flex items-end space-x-2">
        <div className="flex-1">
          <Input
            value={newComment}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="bg-white border-gray-200 text-gray-900 placeholder-gray-400 resize-none"
            onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => e.key === "Enter" && !e.shiftKey && handleAddComment()}
            disabled={!file || !currentUser}
          />
        </div>
        <Button
          onClick={handleAddComment}
          size="sm"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 flex-shrink-0"
          disabled={!newComment.trim() || !file || !currentUser}
        >
          Send
        </Button>
      </div>
      {(!file || !currentUser) && (
        <p className="text-xs text-gray-400 mt-2">
          {!currentUser ? 'Sign in to comment' : 'Upload a file to comment'}
        </p>
      )}
    </div>
  </div>
</div>
        </div>
      </div>
    </div>
  )
}
