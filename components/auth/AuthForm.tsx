'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClientComponentClient, SupabaseClient } from '@supabase/auth-helpers-nextjs'

interface AuthFormProps {
  mode: 'signin' | 'signup'
}

export function AuthForm({ mode }: AuthFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
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
  }, [searchParams])

  const verifySession = async (maxAttempts = 3, delayMs = 500): Promise<boolean> => {
    if (!supabase) {
      toast({
        title: 'Session Verification Failed',
        description: 'Unable to verify session: client not initialized',
        variant: 'destructive'
      })
      return false;
    }
    for (let i = 0; i < maxAttempts; i++) {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        toast({
          title: 'Session Verified',
          description: 'Your session is active and verified',
          variant: 'default'
        })
        return true
      }
      if (i < maxAttempts - 1) {
        toast({
          title: 'Verifying Session',
          description: `Attempt ${i + 1} of ${maxAttempts}...`,
          duration: delayMs
        })
        await new Promise(resolve => setTimeout(resolve, delayMs))
      }
    }
    toast({
      title: 'Session Verification Failed',
      description: 'Unable to verify your session after multiple attempts',
      variant: 'destructive'
    })
    return false
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase) {
      toast({ title: 'Error', description: 'Supabase client not initialized.', variant: 'destructive' })
      return
    }
    setIsLoading(true)
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: { full_name: formData.name },
          },
        });
        if (error) throw error;
        if (data.user) { 
          toast({ 
            title: 'Account created!', 
            description: 'Please check your email to verify your account.',
            duration: 5000
          });
          setTimeout(() => {
            router.push('/auth/signin'); 
          }, 3000);
        } else {
          toast({ title: 'Notice', description: 'Sign-up process initiated. If no email arrives, please try again or contact support.', variant: 'default' });
        }
      } else { // Sign-in logic
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        })
        if (error) throw error;
        if (!data?.session) throw new Error('No session returned from Supabase after signInWithPassword')
        console.log('Sign-in successful, redirecting to:', redirectTo)
        toast({ title: 'Success!', description: 'Successfully signed in' })
        router.push(redirectTo) 
      }
    } catch (error) {
      console.error('Auth error (raw):', error)
      let title = 'Error'
      let description = 'An unexpected error occurred. Please try again.'

      if (typeof error === 'object' && error !== null && 'message' in error && typeof (error as any).message === 'string') {
        const errorMessage = (error as any).message;
        description = errorMessage; 
        if (mode === 'signup') {
          if (errorMessage.includes('User already registered')) {
            title = 'Sign-up Failed'
            description = 'This email address is already registered. Please try signing in or use a different email.'
          } else if (errorMessage.includes('Password should be at least 6 characters')) {
            title = 'Weak Password'
            description = 'Your password must be at least 6 characters long.'
          } else if (errorMessage.toLowerCase().includes('unable to validate email address')) {
            title = 'Invalid Email'
            description = 'Please enter a valid email address.'
          } else {
            title = 'Sign-up Failed' 
          }
        } else { 
          if (errorMessage.includes('Invalid login credentials')) {
            title = 'Sign-in Failed'
            description = 'Invalid email or password. Please check your credentials and try again.'
          } else if (errorMessage.includes('Email not confirmed')) {
            title = 'Email Not Verified'
            description = 'Please verify your email address before signing in. Check your inbox for a confirmation link.'
          } else {
            title = 'Sign-in Failed' 
          }
        }
      } else if (error instanceof Error) { 
        description = error.message;
      } else if (typeof error === 'string') {
        description = error;
      }

      toast({ 
        title: title, 
        description: description, 
        variant: 'destructive' 
      })
    } finally {
      setIsLoading(false)
    }
  }

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '', 
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  if (!supabase) {
    return <div>Loading form...</div>; 
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