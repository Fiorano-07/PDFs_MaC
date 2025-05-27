import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { cookies } from 'next/headers'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    
    const { data: pdf, error } = await supabaseAdmin
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
      .eq('id', id)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!pdf) {
      return NextResponse.json({ error: 'PDF not found' }, { status: 404 })
    }

    return NextResponse.json(pdf)
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    
    const supabase = createServerComponentClient({ cookies })
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = session.user.id
    const body = await request.json()
    const { filename, is_public } = body

    // Verify ownership
    const { data: existingPdf, error: fetchError } = await supabaseAdmin
      .from('pdf_files')
      .select('owner_id')
      .eq('id', id)
      .single()

    if (fetchError || !existingPdf) {
      return NextResponse.json({ error: 'PDF not found' }, { status: 404 })
    }

    if (existingPdf.owner_id !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { data, error } = await supabaseAdmin
      .from('pdf_files')
      .update({ 
        filename,
        is_public,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    
    const supabase = createServerComponentClient({ cookies })
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = session.user.id

    // Verify ownership and get file path
    const { data: pdf, error: fetchError } = await supabaseAdmin
      .from('pdf_files')
      .select('owner_id, file_path')
      .eq('id', id)
      .single()

    if (fetchError || !pdf) {
      return NextResponse.json({ error: 'PDF not found' }, { status: 404 })
    }

    if (pdf.owner_id !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Delete from storage
    const { error: storageError } = await supabaseAdmin
      .storage
      .from('pdfs')
      .remove([pdf.file_path])

    if (storageError) {
      return NextResponse.json({ error: storageError.message }, { status: 500 })
    }

    // Delete from database
    const { error: dbError } = await supabaseAdmin
      .from('pdf_files')
      .delete()
      .eq('id', id)

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    return NextResponse.json({ message: 'PDF deleted successfully' })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}