import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import * as XLSX from 'xlsx'
import { displayName, formatDateTime } from '@/lib/utils'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  const [adjResult, historyResult, profilesResult, entriesResult] = await Promise.all([
    admin.from('adjudications').select('*').order('created_at', { ascending: false }),
    admin.from('adjudication_history').select('*').order('changed_at', { ascending: true }),
    admin.from('profiles').select('id, full_name, email'),
    admin.from('investigation_entries').select('*, history:investigation_entry_history(*)').order('created_at', { ascending: true }),
  ])

  const profiles = Object.fromEntries((profilesResult.data ?? []).map((p) => [p.id, p]))

  const adjRows = (adjResult.data ?? []).map((adj) => ({
    ID: adj.id,
    Event: adj.event,
    'Aff/Gov Team': adj.aff_gov_team,
    'Neg/Opp Team': adj.neg_opp_team,
    Round: adj.round,
    'Summary of Complaint': adj.summary_of_complaint,
    'Adjudication Team': (adj.adjudication_team as string[])
      .map((id) => displayName(profiles[id]))
      .join(', '),
    'Decision & Action Taken': adj.decision_action_taken ?? '',
    Status: adj.status,
    Penalty: adj.penalty === null ? '' : adj.penalty ? 'Yes' : 'No',
    'Created At': formatDateTime(adj.created_at),
    'Created By': displayName(profiles[adj.created_by]),
    'Last Updated': formatDateTime(adj.updated_at),
    'Updated By': displayName(profiles[adj.updated_by]),
  }))

  const historyRows = (historyResult.data ?? []).map((h) => ({
    'Adjudication ID': h.adjudication_id,
    'Changed By': displayName(profiles[h.changed_by]),
    'Changed At': formatDateTime(h.changed_at),
    'Previous Values': JSON.stringify(h.previous_values),
    'New Values': JSON.stringify(h.new_values),
  }))

  const entryRows = (entriesResult.data ?? []).flatMap((e) => {
    const base = {
      'Adjudication ID': e.adjudication_id,
      'Entry ID': e.id,
      'Content': e.content,
      'Posted By': displayName(profiles[e.created_by]),
      'Posted At': formatDateTime(e.created_at),
      'Last Edited': e.updated_at !== e.created_at ? formatDateTime(e.updated_at) : '',
    }
    return [base]
  })

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(adjRows), 'Adjudications')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(entryRows), 'Investigation Log')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(historyRows), 'Change History')

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="nitoc-adjudications.xlsx"',
    },
  })
}
