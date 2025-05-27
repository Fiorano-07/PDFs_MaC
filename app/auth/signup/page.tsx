import { Metadata } from 'next'
import { SignUpForm } from '@/components/auth/SignUpForm'

export const metadata: Metadata = {
  title: 'Sign Up - PDF Manager',
  description: 'Create a new PDF Manager account',
}

export default function SignUpPage() {
  return <SignUpForm />
}
