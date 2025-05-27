"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { createClientComponentClient, User } from "@supabase/auth-helpers-nextjs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Share2, Download, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react"
import { Document, Page, pdfjs } from "react-pdf"
import "react-pdf/dist/Page/AnnotationLayer.css"
import "react-pdf/dist/Page/TextLayer.css"

// Set up PDF.js worker
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`
}

interface Comment {
  id: string
  user_id: string
  file_id: string
  page_number: number
  content: string
  created_at: string
  user_email: string // Fetched separately
}

interface FileDetails {
  id: string
  title: string
  file_path: string // This is the path in Supabase storage
  original_name: string
  public_url?: string // This will be the signed URL
}

export default function PDFViewer() {
  const params = useParams()
  const [file, setFile] = useState<FileDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true);
  const [numPages, setNumPages] = useState<number>(0)
  const [pageNumber, setPageNumber] = useState(1)
  const [scale, setScale] = useState(1.0)
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState("")
  const [pdfError, setPdfError] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<User | null>(null);
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
    setFile(null); // Reset file state
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
         setFile(fileData as FileDetails); // Still set file to show title
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
      const { data: commentsData, error: commentsError } = await supabase
        .from("comments")
        .select("id, user_id, file_id, page_number, content, created_at")
        .eq("file_id", fileId)
        .eq("page_number", currentPageNumber)
        .order("created_at", { ascending: true })

      if (commentsError) {
        console.error("Error fetching comments:", commentsError)
        setComments([]);
        return;
      }

      if (commentsData && commentsData.length > 0) {
        const userIds = [...new Set(commentsData.map(comment => comment.user_id))].filter(id => id != null);
        
        let userMap = new Map<string, string>();

        if (userIds.length > 0) {
          // Attempt to get user emails - this might be restricted by RLS on auth.users
          // A more robust solution would be a SECURITY DEFINER function or a profiles table.
          const { data: usersData, error: usersError } = await supabase
            .from("users") // This should be your public.users table if it stores emails
            .select("id, email") 
            .in("id", userIds);

          if (usersError) {
            console.warn("Warning: Error fetching user emails for comments:", usersError.message);
            console.warn("This might be due to RLS on the 'users' table or the table not existing/being accessible. Comments will show limited user info.");
            // Fallback: populate userMap with user_id if email fetch fails
            userIds.forEach(id => userMap.set(id, "User ID: " + id.substring(0, 8)));
          } else if (usersData) {
            usersData.forEach((user: any) => userMap.set(user.id, user.email || "Email not available"));
          }
        }

        const commentsWithUserData = commentsData.map(comment => ({
          ...comment,
          user_email: userMap.get(comment.user_id) || "Anonymous / User data N/A"
        }));
        setComments(commentsWithUserData);
      } else {
        setComments([]); 
      }
    } catch (error: any) {
      console.error("Error in fetchComments function:", error.message)
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
        })

      if (error) {
        console.error("Error adding comment:", error)
        // Potentially provide user feedback here
        return
      }

      setNewComment("")
      fetchComments(fileId, pageNumber) 
    } catch (error) {
      console.error("Error in handleAddComment:", error)
    }
  }

  const onDocumentLoadSuccess = ({ numPages: loadedNumPages }: { numPages: number }) => {
    setNumPages(loadedNumPages)
    setPdfError(null) 
  }

  const onDocumentLoadError = (error: Error) => {
    console.error("React-PDF - Error loading PDF document:", error.message)
    setPdfError(`Failed to load PDF. Viewer error: ${error.message}`)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading file data...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 py-4">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-white">
              {file?.title || file?.original_name || "File details not loaded"}
            </h1>
            <div className="flex items-center space-x-4">
              <Button variant="outline" className="text-gray-400 hover:text-white border-gray-700" disabled={!file}>
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Button 
                variant="outline" 
                className="text-gray-400 hover:text-white border-gray-700" 
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
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
                    disabled={pageNumber <= 1 || !file?.public_url}
                    className="text-gray-400 hover:text-white border-gray-700"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-gray-400">
                    Page {file?.public_url ? pageNumber : "-"} of {file?.public_url ? numPages : "-"}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPageNumber(Math.min(numPages, pageNumber + 1))}
                    disabled={pageNumber >= numPages || !file?.public_url}
                    className="text-gray-400 hover:text-white border-gray-700"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setScale(Math.max(0.5, scale - 0.1))}
                    className="text-gray-400 hover:text-white border-gray-700"
                    disabled={!file?.public_url}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="text-gray-400">{Math.round(scale * 100)}%</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setScale(Math.min(2, scale + 0.1))}
                    className="text-gray-400 hover:text-white border-gray-700"
                    disabled={!file?.public_url}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex justify-center bg-gray-800 rounded-lg overflow-auto min-h-[calc(100vh-250px)] lg:min-h-[600px]">
                {pdfError ? (
                  <div className="flex items-center justify-center text-red-500 p-4 text-center">
                    {pdfError}
                  </div>
                ) : file?.public_url ? (
                  <Document
                    file={file.public_url} // Use the signed URL here
                    onLoadSuccess={onDocumentLoadSuccess}
                    onLoadError={onDocumentLoadError}
                    loading={
                      <div className="flex items-center justify-center h-full min-h-[200px]">
                        <div className="text-blue-500 text-lg">Loading PDF from URL...</div>
                      </div>
                    }
                    error={
                      <div className="flex items-center justify-center h-full min-h-[200px] text-center">
                        <div className="text-red-500 text-lg">Failed to render PDF. The URL might be invalid or the file corrupted.</div>
                      </div>
                    }
                  >
                    <Page
                      pageNumber={pageNumber}
                      scale={scale}
                      className="shadow-lg"
                      renderAnnotationLayer={false}
                      renderTextLayer={false}
                      loading={
                        <div className="flex items-center justify-center h-full min-h-[200px]">
                         <div className="text-blue-500">Loading page {pageNumber}...</div>
                        </div>
                      }
                    />
                  </Document>
                ) : (
                  <div className="flex items-center justify-center text-gray-400 p-4 text-center">
                    {isLoading ? "Fetching PDF..." : "PDF not available or failed to load. Check console for errors."}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Comments Section */}
          <div className="w-full lg:w-96">
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 h-full flex flex-col">
              <h2 className="text-lg font-semibold text-white mb-4">
                Comments for Page {pageNumber}
              </h2>
              <div className="space-y-4 mb-4 flex-grow overflow-y-auto min-h-[200px]">
                {comments.length === 0 && <p className="text-gray-400">No comments for this page.</p>}
                {comments.map((comment) => (
                  <div key={comment.id} className="bg-gray-800 rounded-lg p-3">
                    <div className="flex items-start space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-blue-600 text-white text-xs">
                          {comment.user_email ? comment.user_email[0]?.toUpperCase() : "A"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-white">
                            {comment.user_email}
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(comment.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-gray-300 whitespace-pre-wrap">{comment.content}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center space-x-2 mt-auto pt-4 border-t border-gray-700">
                <Input
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                  onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
                  disabled={!file || !currentUser}
                />
                <Button
                  onClick={handleAddComment}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={!newComment.trim() || !file || !currentUser}
                >
                  Send
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
