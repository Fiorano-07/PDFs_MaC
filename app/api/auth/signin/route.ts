import { NextResponse } from 'next/server'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()
    const cookieStore = cookies()
    const supabase = createServerComponentClient({ cookies })

    // Attempt to sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error('Sign in error:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      )
    }

    if (!data?.user || !data?.session) {
      console.error('Sign in succeeded but no user or session returned')
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      )
    }

    // Create the response
    const response = NextResponse.json({
      message: 'Successfully signed in',
      user: data.user,
      session: data.session,
    })

    // Let Supabase handle the cookie setting
    const supabaseResponse = NextResponse.json({
      message: 'Successfully signed in',
      user: data.user,
      session: data.session,
    })

    // Copy over the cookies that Supabase set
    const newCookies = response.cookies.getAll()
    for (const cookie of newCookies) {
      supabaseResponse.cookies.set(cookie)
    }

    return supabaseResponse
  } catch (error) {
    console.error('Sign in error:', error)
    return NextResponse.json(
      { error: 'An error occurred during sign in' },
      { status: 500 }
    )
  }
} 