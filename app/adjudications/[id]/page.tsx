import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { type Adjudication, type AdjudicationHistory, type InvestigationEntry } from '@/lib/types'
import { formatDateTime, displayName } from '@/lib/utils'
import Navbar from '@/components/Navbar'
import AdjudicationForm from '@/components/AdjudicationForm'
import InvestigationLog from '@/components/InvestigationLog'
import AuditHistory from '@/components/AuditHistory'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Pencil } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdjudicationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ edit?: string }>
}) {
  const { id } = await params
  const sp = await searchParams
  const isEditing = sp.edit === '1'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const { data: adjudication } = await supabase
    .from('adjudications')
    .select(`
      *,
      created_by_profile:profiles!adjudications_created_by_fkey(id, full_name, email),
      updated_by_profile:profiles!adjudications_updated_by_fkey(id, full_name, email)
    `)
    .eq('id', id)
    .single()

  if (!adjudication) notFound()

  const [{ data: historyData }, { data: entriesData }, { data: allUsers }] = await Promise.all([
    supabase
      .from('adjudication_history')
      .select(`*, changed_by_profile:profiles!adjudication_history_changed_by_fkey(id, full_name, email)`)
      .eq('adjudication_id', id)
      .order('changed_at', { ascending: false }),
    supabase
      .from('investigation_entries')
      .select(`
        *,
        created_by_profile:profiles!investigation_entries_created_by_fkey(id, full_name, email),
        history:investigation_entry_history(
          id, edited_by, edited_at, previous_content, new_content,
          edited_by_profile:profiles!investigation_entry_history_edited_by_fkey(id, full_name, email)
        )
      `)
      .eq('adjudication_id', id)
      .order('created_at', { ascending: true }),
    supabase.from('profiles').select('id, email, full_name, role').order('full_name', { ascending: true }),
  ])

  const canEdit = profile.role === 'admin' || profile.role === 'adjudication_team'

  const adj = adjudication as Adjudication
  const teamProfiles = (allUsers ?? []).filter((u) => adj.adjudication_team?.includes(u.id))

  function statusBadge() {
    if (adj.status === 'open') return <Badge variant="warning">Open</Badge>
    if (adj.penalty === true) return <Badge variant="destructive">Closed — Penalty</Badge>
    if (adj.penalty === false) return <Badge variant="success">Closed — No Penalty</Badge>
    return <Badge variant="secondary">Closed</Badge>
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar profile={profile} />
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </Link>
          <div className="flex-1" />
          {statusBadge()}
          {canEdit && !isEditing && (
            <Link href={`/adjudications/${id}?edit=1`}>
              <Button variant="outline" size="sm">
                <Pencil className="w-4 h-4" />
                Edit
              </Button>
            </Link>
          )}
        </div>

        {isEditing && canEdit ? (
          <Card>
            <CardHeader>
              <CardTitle>Edit Adjudication</CardTitle>
            </CardHeader>
            <CardContent>
              <AdjudicationForm adjudication={adj} allUsers={allUsers ?? []} />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-sm font-bold bg-gray-100 text-gray-700">
                  {adj.event}
                </span>
                <span className="text-gray-400">·</span>
                <span className="text-sm font-medium text-gray-600">{adj.round}</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase mb-0.5">Aff/Gov Team</p>
                  <p className="text-sm font-medium">{adj.aff_gov_team}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase mb-0.5">Neg/Opp Team</p>
                  <p className="text-sm font-medium">{adj.neg_opp_team}</p>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-400 uppercase mb-0.5">Summary of Complaint</p>
                <p className="text-sm whitespace-pre-wrap">{adj.summary_of_complaint}</p>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-400 uppercase mb-0.5">Adjudication Team</p>
                {teamProfiles.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {teamProfiles.map((p) => (
                      <span key={p.id} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                        {displayName(p)}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">Not assigned</p>
                )}
              </div>

              {adj.decision_action_taken && (
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase mb-0.5">Decision &amp; Action Taken</p>
                  <p className="text-sm whitespace-pre-wrap">{adj.decision_action_taken}</p>
                </div>
              )}

              <div className="pt-3 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-400">
                <span>Created {formatDateTime(adj.created_at)} by {displayName(adj.created_by_profile)}</span>
                <span>Updated {formatDateTime(adj.updated_at)} by {displayName(adj.updated_by_profile)}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Investigation Log */}
        <Card>
          <CardContent className="pt-6">
            <InvestigationLog
              adjudicationId={id}
              initialEntries={(entriesData ?? []) as InvestigationEntry[]}
              currentUserId={user.id}
              canAdd={canEdit}
            />
          </CardContent>
        </Card>

        {/* Audit History */}
        {(historyData?.length ?? 0) > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Change History</CardTitle>
            </CardHeader>
            <CardContent>
              <AuditHistory history={(historyData ?? []) as AdjudicationHistory[]} />
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
