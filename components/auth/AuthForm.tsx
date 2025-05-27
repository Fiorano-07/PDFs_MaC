'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

interface AuthFormProps {
  mode: 'signin' | 'signup'
}

export function AuthForm({ mode }: AuthFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') || '/dashboard'
  const supabase = createClientComponentClient()

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '', // Only used for signup
  })

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        console.log('Existing session found, redirecting...')
        router.push(redirectTo)
      }
    }
    checkSession()
  }, [router, supabase.auth, redirectTo])

  const verifySession = async (maxAttempts = 5, delayMs = 1000): Promise<boolean> => {
    for (let i = 0; i < maxAttempts; i++) {
      console.log(`Attempt ${i + 1} to verify session...`)
      
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (session) {
        console.log('Session found:', { 
          user: session.user.email,
          expires_at: new Date(session.expires_at! * 1000).toISOString()
        })
        return true
      }
      
      if (error) {
        console.error(`Attempt ${i + 1} session verification error:`, error)
        // Continue trying despite errors
      }
      
      if (i < maxAttempts - 1) { // Don't wait on the last attempt
        console.log(`No session found on attempt ${i + 1}, waiting ${delayMs}ms...`)
        await new Promise(resolve => setTimeout(resolve, delayMs))
      }
    }
    return false
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      console.log('Attempting to sign in...')
      
      // Try to sign in directly with Supabase client
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      })

      if (error) {
        console.error('Supabase auth error:', error)
        throw error
      }

      if (!data?.session) {
        console.error('No session returned from Supabase')
        throw new Error('No session returned from Supabase')
      }

      // Now verify the session is established
      console.log('Verifying session establishment...')
      const sessionEstablished = await verifySession()
      
      if (!sessionEstablished) {
        console.error('Session verification failed after multiple attempts')
        throw new Error('Failed to establish session. Please try signing in again.')
      }

      // Only show success toast and redirect if we have a verified session
      toast({
        title: 'Success!',
        description: 'Successfully signed in',
      })
      
      console.log('Session verified, redirecting to:', redirectTo)
      router.push(redirectTo)
      router.refresh()

    } catch (error) {
      console.error('Auth error:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {mode === 'signup' && (
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            name="name"
            placeholder="John Doe"
            required
            value={formData.name}
            onChange={handleChange}
            disabled={isLoading}
            minLength={2}
            maxLength={50}
          />
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="name@example.com"
          required
          value={formData.email}
          onChange={handleChange}
          disabled={isLoading}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          value={formData.password}
          onChange={handleChange}
          disabled={isLoading}
          minLength={6}
        />
      </div>
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? (
          <span>Loading...</span>
        ) : mode === 'signin' ? (
          'Sign In'
        ) : (
          'Create Account'
        )}
      </Button>
    </form>
  )
} 