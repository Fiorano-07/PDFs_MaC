import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { cookies } from 'next/headers'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'

export async function GET() {
  try {
    const { data: pdfs, error } = await supabaseAdmin
      .from('pdf_files')
      .select(`
        id,
        filename,
        file_path,
        file_size,
        mime_type,
        upload_date,
        owner_id,
        is_public,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(pdfs)
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createServerComponentClient({ cookies })
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = session.user.id
    const formData = await request.formData()
    const file = formData.get('file') as File
    const filename = formData.get('filename') as string
    const isPublic = formData.get('is_public') === 'true'

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Upload file to Supabase Storage
    const fileExt = file.name.split('.').pop()
    const filePath = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
    
    const { data: uploadData, error: uploadError } = await supabaseAdmin
      .storage
      .from('pdfs')
      .upload(filePath, file)

    if (uploadError) {
      return NextResponse.json(
        { error: uploadError.message },
        { status: 500 }
      )
    }

    // Create database entry
    const { data: pdf, error: dbError } = await supabaseAdmin
      .from('pdf_files')
      .insert([
        {
          filename: filename || file.name,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type,
          owner_id: userId,
          is_public: isPublic
        }
      ])
      .select()
      .single()

    if (dbError) {
      // Cleanup uploaded file if database insert fails
      await supabaseAdmin.storage.from('pdfs').remove([filePath])
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    return NextResponse.json(pdf)
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
} 