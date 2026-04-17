import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; entryId: string }> }
) {
  const { entryId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const { data: entry } = await supabase
    .from('investigation_entries')
    .select('*')
    .eq('id', entryId)
    .single()

  if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isAuthor = entry.created_by === user.id
  const isAdmin = profile?.role === 'admin'

  if (!isAuthor && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { content } = await request.json()
  if (!content?.trim()) return NextResponse.json({ error: 'Content is required' }, { status: 400 })

  const previousContent = entry.content

  const { data: updated, error } = await supabase
    .from('investigation_entries')
    .update({ content: content.trim() })
    .eq('id', entryId)
    .select(`
      *,
      created_by_profile:profiles!investigation_entries_created_by_fkey(id, full_name, email)
    `)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Record edit history via admin client
  const admin = createAdminClient()
  await admin.from('investigation_entry_history').insert({
    entry_id: entryId,
    edited_by: user.id,
    previous_content: previousContent,
    new_content: content.trim(),
  })

  return NextResponse.json(updated)
}
