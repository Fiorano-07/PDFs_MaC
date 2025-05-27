import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Share2, MessageSquare, Shield } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">PDF Management & Collaboration System</h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Upload, share, and collaborate on PDF documents with ease. Secure file management with real-time commenting
            and sharing capabilities.
          </p>
          <div className="space-x-4">
            <Button asChild size="lg">
              <Link href="/auth/signup">Get Started</Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/auth/login">Sign In</Link>
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card>
            <CardHeader>
              <FileText className="h-8 w-8 text-blue-600 mb-2" />
              <CardTitle>Upload PDFs</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Securely upload and store your PDF documents with validation and access controls.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Share2 className="h-8 w-8 text-green-600 mb-2" />
              <CardTitle>Easy Sharing</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Generate unique links to share PDFs with anyone, even without an account.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <MessageSquare className="h-8 w-8 text-purple-600 mb-2" />
              <CardTitle>Collaborate</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>Add comments and collaborate with others directly on PDF documents.</CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Shield className="h-8 w-8 text-red-600 mb-2" />
              <CardTitle>Secure</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>Enterprise-grade security with encrypted storage and access controls.</CardDescription>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Ready to start collaborating?</h2>
          <Button asChild size="lg">
            <Link href="/auth/signup">Create Your Account</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
