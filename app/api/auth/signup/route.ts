import { NextResponse } from 'next/server'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: Request) {
  try {
    const { email, password, name } = await request.json()

    // Validate input
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password, and name are required' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      )
    }

    if (name.length < 2 || name.length > 50) {
      return NextResponse.json(
        { error: 'Name must be between 2 and 50 characters' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }
    
    // Use supabaseAdmin for signup to ensure we can create the user
    const { data: authData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Automatically confirm the email
      user_metadata: {
        name: name,
      },
    })

    if (signUpError || !authData.user) {
      console.error('Signup error:', signUpError)
      return NextResponse.json(
        { error: signUpError?.message || 'User creation failed' },
        { status: 400 }
      )
    }

    // Create user profile in the users table using admin client to bypass RLS
    const { error: profileError } = await supabaseAdmin
      .from('users')
      .insert([
        {
          id: authData.user.id,
          email: email,
          name: name,
          password_hash: '', // We don't store the actual password
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])

    if (profileError) {
      console.error('Profile creation error:', profileError)
      // If profile creation fails, we should clean up the auth user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { error: profileError.message },
        { status: 400 }
      )
    }

    // Create default user preferences
    const { error: preferencesError } = await supabaseAdmin
      .from('user_preferences')
      .insert([
        {
          user_id: authData.user.id,
          theme: 'light',
          notifications_enabled: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])

    if (preferencesError) {
      console.error('Failed to create user preferences:', preferencesError)
      // We don't return an error here as this is not critical
    }

    // Sign in the user automatically
    const supabase = createServerComponentClient({ cookies })
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      console.error('Auto sign-in failed:', signInError)
      // We don't return an error here as registration was successful
    }

    return NextResponse.json({
      message: 'Registration successful! You have been automatically signed in.',
      user: authData.user,
    })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'An error occurred during registration' },
      { status: 500 }
    )
  }
} 