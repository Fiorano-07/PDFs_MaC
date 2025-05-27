"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { FileUploadDialog } from "@/components/file-upload-dialog"
import { ShareDialog } from "@/components/share-dialog"
import { Search, Upload, FileText, Share2, MessageSquare, MoreVertical, User, LogOut, Loader2 } from "lucide-react"
import Link from "next/link"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"

interface FileItem {
  id: string
  title: string
  created_at: string
  size: number
  public_url: string
  is_public: boolean
  view_count: number
  original_name: string
  file_path: string
  name?: string // Optional for backward compatibility with ShareDialog
}

export default function DashboardPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [files, setFiles] = useState<FileItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null)
  const [user, setUser] = useState<{ email: string; name: string | null } | null>(null)
  const supabase = createClientComponentClient()
  const router = useRouter()
  const { toast } = useToast()

  const fetchFiles = async () => {
    try {
      const { data: filesData, error: filesError } = await supabase
        .from('files')
        .select('*')
        .order('created_at', { ascending: false })

      if (filesError) throw filesError
      setFiles(filesData || [])
    } catch (error) {
      console.error('Error fetching files:', error)
      toast({
        title: "Error",
        description: "Failed to load files",
        variant: "destructive",
      })
    }
  }

  // Fetch user data and files when component mounts
  useEffect(() => {
    const fetchUserAndFiles = async () => {
      try {
        // Fetch user data
        const { data: { user: userData }, error: userError } = await supabase.auth.getUser()
        if (userError) throw userError

        if (userData) {
          // Try to get user profile from users table
          const { data: profile, error: profileError } = await supabase
            .from('users')
            .select('name, email')
            .eq('id', userData.id)
            .single()

          // If profile doesn't exist or there's an error, use data from auth.users
          if (profileError || !profile) {
            setUser({
              email: userData.email || '',
              name: userData.user_metadata?.full_name || null
            })
          } else {
            setUser({
              email: profile.email,
              name: profile.name
            })
          }
        }

        await fetchFiles()
      } catch (error) {
        console.error('Error fetching data:', error)
        toast({
          title: "Error",
          description: "Failed to load user data",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserAndFiles()
  }, [supabase, toast])

  const handleUploadComplete = useCallback(async () => {
    setIsLoading(true)
    await fetchFiles()
    setIsLoading(false)
  }, [])

  const getInitials = (name: string | null) => {
    if (!name) return "U"
    return name
      .split(" ")
      .map(word => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const handleShare = (file: FileItem) => {
    setSelectedFile(file)
    setShareDialogOpen(true)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth/signin')
  }

  const handleDelete = async (fileId: string) => {
    try {
      const fileToDelete = files.find(f => f.id === fileId)
      if (!fileToDelete) return

      // Delete from storage
      const { error: storageError } = await supabase
        .storage
        .from('pdfs')
        .remove([fileToDelete.file_path])

      if (storageError) throw storageError

      // Delete from database
      const { error: dbError } = await supabase
        .from('files')
        .delete()
        .eq('id', fileId)

      if (dbError) throw dbError

      // Update local state
      setFiles(files.filter(f => f.id !== fileId))

      toast({
        title: "Success",
        description: "File deleted successfully",
      })
    } catch (error) {
      console.error('Error deleting file:', error)
      toast({
        title: "Error",
        description: "Failed to delete file",
        variant: "destructive",
      })
    }
  }

  const filteredFiles = files.filter((file) => 
    file.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    file.original_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="bg-black border-b border-gray-800">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-white">PDF Dashboard</h1>
            </div>

            <div className="flex items-center space-x-4">
              <Button 
                onClick={() => setUploadDialogOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload PDF
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full border border-gray-800 hover:bg-gray-900">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="/placeholder-user.jpg" alt={user?.name || "User"} />
                      <AvatarFallback className="bg-gray-900 text-white">
                        {getInitials(user?.name || null)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-gray-900 border border-gray-800" align="end" forceMount>
                  <div className="flex flex-col space-y-1 p-2">
                    <p className="text-sm font-medium text-white">{user?.name}</p>
                    <p className="text-xs text-gray-400">{user?.email}</p>
                  </div>
                  <DropdownMenuItem onClick={() => router.push('/profile')} className="text-white hover:bg-gray-800">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSignOut} className="text-white hover:bg-gray-800">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sign out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search PDF files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-gray-900 border-gray-800 text-white placeholder-gray-400 focus:border-blue-600"
            />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white">Total Files</CardTitle>
              <FileText className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{files.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white">Shared Files</CardTitle>
              <Share2 className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{files.filter((f) => f.is_public).length}</div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white">Total Views</CardTitle>
              <MessageSquare className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{files.reduce((sum, f) => sum + (f.view_count || 0), 0)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Files Grid */}
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : filteredFiles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFiles.map((file) => (
              <Card key={file.id} className="bg-gray-900 border-gray-800 hover:border-gray-700 transition-colors">
                <CardHeader className="flex flex-row items-start justify-between space-y-0">
                  <div className="flex-1">
                    <CardTitle className="text-lg line-clamp-2 text-white">{file.title}</CardTitle>
                    <CardDescription className="mt-2 text-gray-400">
                      Uploaded on {new Date(file.created_at).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-gray-800">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-gray-900 border-gray-800" align="end">
                      <DropdownMenuItem onClick={() => handleShare(file)} className="text-white hover:bg-gray-800">
                        <Share2 className="mr-2 h-4 w-4" />
                        Share
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={file.public_url} target="_blank" className="text-white hover:bg-gray-800">
                          Download
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDelete(file.id)}
                        className="text-red-400 hover:bg-gray-800 hover:text-red-300"
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>

                <CardContent>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-gray-400">{formatFileSize(file.size)}</span>
                    <div className="flex items-center space-x-2">
                      {file.is_public && (
                        <Badge variant="secondary" className="bg-blue-600/20 text-blue-400 border-blue-800">
                          <Share2 className="h-3 w-3 mr-1" />
                          Shared
                        </Badge>
                      )}
                      <Badge variant="outline" className="border-gray-700 text-gray-400">
                        <MessageSquare className="h-3 w-3 mr-1" />
                        {file.view_count || 0}
                      </Badge>
                    </div>
                  </div>

                  <Button asChild className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                    <Link href={`/pdf/${file.id}`}>View PDF</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No PDFs found</h3>
            <p className="text-sm text-gray-400">
              {searchQuery
                ? "No PDFs match your search criteria"
                : "Upload your first PDF to get started"}
            </p>
          </div>
        )}
      </main>

      {/* Dialogs */}
      <FileUploadDialog 
        open={uploadDialogOpen} 
        onOpenChange={setUploadDialogOpen}
        onUploadComplete={handleUploadComplete}
      />
      {selectedFile && (
        <ShareDialog
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          file={{
            id: selectedFile.id,
            title: selectedFile.title,
            is_public: selectedFile.is_public,
            public_url: selectedFile.public_url
          }}
        />
      )}
    </div>
  )
}
