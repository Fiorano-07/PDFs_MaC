import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  try {
    // Create a response to modify
    const res = NextResponse.next()
    
    // Create the Supabase client
    const supabase = createMiddlewareClient({ req, res })

    // Refresh session if expired
    const { data: { session }, error } = await supabase.auth.getSession()

    if (error) {
      console.error('Middleware session error:', error)
      // Don't throw, continue with the request
    }

    const path = req.nextUrl.pathname
    const isAuthPage = path.startsWith('/auth/')
    const isProtectedRoute = path.startsWith('/dashboard') || path.startsWith('/pdf/')

    // Handle protected routes
    if (isProtectedRoute) {
      if (!session) {
        // Store the original URL to redirect back after auth
        const redirectUrl = new URL('/auth/signin', req.url)
        redirectUrl.searchParams.set('redirectTo', path)
        return NextResponse.redirect(redirectUrl)
      }
      return res
    }

    // Handle auth pages when user is already authenticated
    if (isAuthPage && session) {
      // Get the intended redirect URL or default to dashboard
      const redirectTo = req.nextUrl.searchParams.get('redirectTo') || '/dashboard'
      return NextResponse.redirect(new URL(redirectTo, req.url))
    }

    return res
  } catch (e) {
    console.error('Middleware error:', e)
    // In case of error, allow the request to continue
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/pdf/:path*',
    '/auth/:path*',
  ],
} 