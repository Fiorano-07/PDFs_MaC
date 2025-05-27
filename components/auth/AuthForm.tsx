'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
// import { useToast } from '@/components/ui/use-toast' // Temporarily comment out
import { useRouter, useSearchParams } from 'next/navigation'
import { createClientComponentClient, SupabaseClient } from '@supabase/auth-helpers-nextjs'

interface AuthFormProps {
  mode: 'signin' | 'signup'
}

export function AuthForm({ mode }: AuthFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  // const { toast } = useToast() // Temporarily comment out
  const router = useRouter()
  const [redirectTo, setRedirectTo] = useState('/dashboard')
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null)
  const searchParams = useSearchParams()

  useEffect(() => {
    const client = createClientComponentClient()
    setSupabase(client)
    const redirectParam = searchParams?.get('redirectTo')
    if (redirectParam) {
      setRedirectTo(redirectParam)
    }
    // TEMPORARILY COMMENTED OUT FOR TESTING
    /*
    const checkSession = async () => {
      if (!client) return;
      const { data: { session } } = await client.auth.getSession()
      if (session) {
        console.log('Existing session found, redirecting...')
        router.push(redirectParam || '/dashboard')
      }
    }
    checkSession()
    */
  }, [router, searchParams])

  const verifySession = async (maxAttempts = 5, delayMs = 1000): Promise<boolean> => {
    if (!supabase) return false;
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
      }
      if (i < maxAttempts - 1) {
        console.log(`No session found on attempt ${i + 1}, waiting ${delayMs}ms...`)
        await new Promise(resolve => setTimeout(resolve, delayMs))
      }
    }
    return false
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase) {
      // toast({ title: 'Error', description: 'Supabase client not initialized.', variant: 'destructive' }) // Temporarily comment out
      console.error('Supabase client not initialized.')
      return
    }
    setIsLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      })
      if (error) throw error
      if (!data?.session) throw new Error('No session returned from Supabase')
      const sessionEstablished = await verifySession()
      if (!sessionEstablished) throw new Error('Failed to establish session. Please try signing in again.')
      // toast({ title: 'Success!', description: 'Successfully signed in' }) // Temporarily comment out
      console.log('Successfully signed in')
      router.push(redirectTo)
      router.refresh()
    } catch (error) {
      console.error('Auth error:', error)
      // toast({ title: 'Error', description: error instanceof Error ? error.message : 'An error occurred', variant: 'destructive' }) // Temporarily comment out
    } finally {
      setIsLoading(false)
    }
  }

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '', // Only used for signup
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  if (!supabase) {
    return <div>Loading...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {mode === 'signup' && (
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" placeholder="John Doe" required value={formData.name} onChange={handleChange} disabled={isLoading} minLength={2} maxLength={50} />
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" placeholder="name@example.com" required value={formData.email} onChange={handleChange} disabled={isLoading} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" required value={formData.password} onChange={handleChange} disabled={isLoading} minLength={6} />
      </div>
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? (<span>Loading...</span>) : mode === 'signin' ? ('Sign In') : ('Create Account')}
      </Button>
    </form>
  )
} 