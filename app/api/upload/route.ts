import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Verify user is authenticated
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const title = formData.get('title') as string || file.name

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!file.type || file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Invalid file type. Only PDF files are allowed.' },
        { status: 400 }
      )
    }

    // Validate file size (10MB limit)
    const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds 10MB limit.' },
        { status: 400 }
      )
    }

    // Generate a unique filename
    const timestamp = new Date().getTime()
    const fileName = `${session.user.id}/${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`

    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('pdfs')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      )
    }

    // Get the public URL for the uploaded file
    const { data: { publicUrl } } = supabase
      .storage
      .from('pdfs')
      .getPublicUrl(fileName)

    // Create a record in the files table
    const { data: fileRecord, error: dbError } = await supabase
      .from('files')
      .insert([
        {
          title,
          file_path: fileName,
          public_url: publicUrl,
          size: file.size,
          user_id: session.user.id,
          original_name: file.name
        }
      ])
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      // If db insert fails, try to delete the uploaded file
      await supabase.storage.from('pdfs').remove([fileName])
      return NextResponse.json(
        { error: 'Failed to save file information' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'File uploaded successfully',
      file: fileRecord
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'An error occurred while uploading the file' },
      { status: 500 }
    )
  }
} 