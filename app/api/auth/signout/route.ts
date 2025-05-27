import { NextResponse } from 'next/server'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function POST() {
  try {
    const supabase = createServerComponentClient({ cookies })
    const { error } = await supabase.auth.signOut()

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({ message: 'Successfully signed out' })
  } catch (error) {
    return NextResponse.json(
      { error: 'An error occurred during sign out' },
      { status: 500 }
    )
  }
} 