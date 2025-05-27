"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Copy, Share2 } from "lucide-react"
import { useState } from "react"
import { useToast } from "@/components/ui/use-toast"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

interface ShareDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  file: {
    id: string
    title: string
    is_public: boolean
    public_url: string
  }
}

export function ShareDialog({ open, onOpenChange, file }: ShareDialogProps) {
  const [isPublic, setIsPublic] = useState(file.is_public)
  const [isUpdating, setIsUpdating] = useState(false)
  const { toast } = useToast()
  const supabase = createClientComponentClient()

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(file.public_url)
      toast({
        title: "Link copied",
        description: "The file link has been copied to your clipboard",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy link to clipboard",
        variant: "destructive",
      })
    }
  }

  const handleTogglePublic = async () => {
    setIsUpdating(true)
    try {
      const { error } = await supabase
        .from('files')
        .update({ is_public: !isPublic })
        .eq('id', file.id)

      if (error) throw error

      setIsPublic(!isPublic)
      toast({
        title: "Success",
        description: `File is now ${!isPublic ? 'public' : 'private'}`,
      })
    } catch (error) {
      console.error('Error updating file:', error)
      toast({
        title: "Error",
        description: "Failed to update file visibility",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-gray-900 border-gray-800">
        <DialogHeader>
          <DialogTitle className="text-white">Share PDF</DialogTitle>
          <DialogDescription className="text-gray-400">
            Share your PDF file with others
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2 pb-4">
          <div className="space-y-2">
            <Label className="text-white">File Name</Label>
            <p className="text-sm text-gray-400">{file.title}</p>
          </div>
          <div className="flex items-center justify-between space-x-2">
            <div className="flex flex-col space-y-1">
              <Label htmlFor="public" className="text-white">Make file public</Label>
              <p className="text-sm text-gray-400">
                Anyone with the link can view this file
              </p>
            </div>
            <Switch
              id="public"
              checked={isPublic}
              onCheckedChange={handleTogglePublic}
              disabled={isUpdating}
              className="data-[state=checked]:bg-blue-600"
            />
          </div>
          {isPublic && (
            <div className="space-y-2">
              <Label className="text-white">Share link</Label>
              <div className="flex items-center space-x-2">
                <Input
                  value={file.public_url}
                  readOnly
                  className="flex-1 bg-gray-800 border-gray-700 text-white"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleCopyLink}
                  className="border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
