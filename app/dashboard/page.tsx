import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { type Adjudication, type DashboardStats, type FilterType } from '@/lib/types'
import Navbar from '@/components/Navbar'
import DashboardStatsComponent from '@/components/DashboardStats'
import AdjudicationList from '@/components/AdjudicationList'
import { Button } from '@/components/ui/button'
import { PlusCircle, Download } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const params = await searchParams
  const filter = (params.filter ?? 'all') as FilterType

  // Fetch filtered adjudications
  let query = supabase
    .from('adjudications')
    .select('*, created_by_profile:profiles!adjudications_created_by_fkey(id, full_name, email)')
    .order('created_at', { ascending: false })

  if (filter === 'open') query = query.eq('status', 'open')
  else if (filter === 'closed') query = query.eq('status', 'closed')
  else if (filter === 'penalty') query = query.eq('status', 'closed').eq('penalty', true)
  else if (filter === 'no_penalty') query = query.eq('status', 'closed').eq('penalty', false)

  const { data: adjudications } = await query

  // Fetch stats (always unfiltered)
  const { data: all } = await supabase
    .from('adjudications')
    .select('status, penalty')

  const stats: DashboardStats = {
    total: all?.length ?? 0,
    open: all?.filter((a) => a.status === 'open').length ?? 0,
    closed: all?.filter((a) => a.status === 'closed').length ?? 0,
    closed_penalty: all?.filter((a) => a.status === 'closed' && a.penalty === true).length ?? 0,
    closed_no_penalty: all?.filter((a) => a.status === 'closed' && a.penalty === false).length ?? 0,
  }

  const canEdit = profile.role === 'admin' || profile.role === 'adjudication_team'

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar profile={profile} />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Adjudications</h1>
            <p className="text-sm text-gray-500 mt-0.5">NITOC debate adjudication tracker</p>
          </div>
          <div className="flex items-center gap-2">
            <a href="/api/export" download>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4" />
                Export Excel
              </Button>
            </a>
            {canEdit && (
              <Link href="/adjudications/new">
                <Button size="sm">
                  <PlusCircle className="w-4 h-4" />
                  New Adjudication
                </Button>
              </Link>
            )}
          </div>
        </div>

        <Suspense fallback={<div className="h-24 bg-gray-100 rounded-xl animate-pulse" />}>
          <DashboardStatsComponent stats={stats} />
        </Suspense>

        <div>
          <h2 className="text-sm font-medium text-gray-500 mb-3">
            {filter === 'all' ? `All adjudications (${stats.total})` :
             filter === 'open' ? `Open adjudications (${stats.open})` :
             filter === 'closed' ? `Closed adjudications (${stats.closed})` :
             filter === 'penalty' ? `Penalty adjudications (${stats.closed_penalty})` :
             `No-penalty adjudications (${stats.closed_no_penalty})`}
          </h2>
          <AdjudicationList
            adjudications={(adjudications ?? []) as Adjudication[]}
            canEdit={canEdit}
          />
        </div>
      </main>
    </div>
  )
}
