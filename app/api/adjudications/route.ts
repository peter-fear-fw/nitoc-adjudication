import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const filter = searchParams.get('filter')

  let query = supabase
    .from('adjudications')
    .select(`
      *,
      created_by_profile:profiles!adjudications_created_by_fkey(id, full_name, email),
      updated_by_profile:profiles!adjudications_updated_by_fkey(id, full_name, email)
    `)
    .order('created_at', { ascending: false })

  if (filter === 'open') {
    query = query.eq('status', 'open')
  } else if (filter === 'closed') {
    query = query.eq('status', 'closed')
  } else if (filter === 'penalty') {
    query = query.eq('status', 'closed').eq('penalty', true)
  } else if (filter === 'no_penalty') {
    query = query.eq('status', 'closed').eq('penalty', false)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'adjudication_team'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { data, error } = await supabase
    .from('adjudications')
    .insert({ ...body, created_by: user.id, updated_by: user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
