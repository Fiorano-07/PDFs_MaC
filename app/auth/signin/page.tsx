import { Metadata } from 'next'
import { SignInForm } from '@/components/auth/SignInForm'

export const metadata: Metadata = {
  title: 'Sign In - PDF Manager',
  description: 'Sign in to your PDF Manager account',
}

export default function SignInPage() {
  return <SignInForm />
} 