import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('adjudications')
    .select(`
      *,
      created_by_profile:profiles!adjudications_created_by_fkey(id, full_name, email),
      updated_by_profile:profiles!adjudications_updated_by_fkey(id, full_name, email)
    `)
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
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

  const { data: current } = await supabase
    .from('adjudications')
    .select('*')
    .eq('id', id)
    .single()

  if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json()
  const updates = { ...body, updated_by: user.id }

  const { data: updated, error } = await supabase
    .from('adjudications')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Record history using admin client (bypasses RLS)
  const admin = createAdminClient()
  const previousValues: Record<string, unknown> = {}
  const newValues: Record<string, unknown> = {}
  const tracked = ['event', 'aff_gov_team', 'neg_opp_team', 'round', 'summary_of_complaint',
    'adjudication_team', 'decision_action_taken', 'status', 'penalty']

  for (const key of tracked) {
    if (key in body && JSON.stringify(current[key]) !== JSON.stringify(body[key])) {
      previousValues[key] = current[key]
      newValues[key] = body[key]
    }
  }

  if (Object.keys(newValues).length > 0) {
    await admin.from('adjudication_history').insert({
      adjudication_id: id,
      changed_by: user.id,
      previous_values: previousValues,
      new_values: newValues,
    })
  }

  return NextResponse.json(updated)
}
