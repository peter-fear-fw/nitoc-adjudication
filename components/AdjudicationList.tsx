'use client'

import Link from 'next/link'
import { type Adjudication } from '@/lib/types'
import { formatDate, displayName } from '@/lib/utils'
import { Badge } from './ui/badge'
import { ChevronRight } from 'lucide-react'

interface AdjudicationListProps {
  adjudications: Adjudication[]
  canEdit: boolean
}

function statusBadge(status: string, penalty: boolean | null) {
  if (status === 'open') return <Badge variant="warning">Open</Badge>
  if (penalty === true) return <Badge variant="destructive">Closed — Penalty</Badge>
  if (penalty === false) return <Badge variant="success">Closed — No Penalty</Badge>
  return <Badge variant="secondary">Closed</Badge>
}

export default function AdjudicationList({ adjudications, canEdit }: AdjudicationListProps) {
  if (adjudications.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-lg font-medium">No adjudications found</p>
        <p className="text-sm mt-1">
          {canEdit ? 'Click "New Adjudication" to get started.' : 'No records match the current filter.'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Desktop header */}
      <div className="hidden lg:grid lg:grid-cols-[80px_1fr_1fr_100px_140px_120px_40px] gap-4 px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
        <span>Event</span>
        <span>Aff/Gov Team</span>
        <span>Neg/Opp Team</span>
        <span>Round</span>
        <span>Status</span>
        <span>Date</span>
        <span></span>
      </div>

      {adjudications.map((adj) => (
        <Link
          key={adj.id}
          href={`/adjudications/${adj.id}`}
          className="block bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all"
        >
          {/* Mobile layout */}
          <div className="lg:hidden p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-gray-100 text-gray-700">
                    {adj.event}
                  </span>
                  <span className="text-xs text-gray-400">{adj.round}</span>
                </div>
                <p className="text-sm font-medium text-gray-900 truncate">{adj.aff_gov_team}</p>
                <p className="text-sm text-gray-500 truncate">vs {adj.neg_opp_team}</p>
                <div className="flex items-center gap-2 mt-2">
                  {statusBadge(adj.status, adj.penalty)}
                  <span className="text-xs text-gray-400">{formatDate(adj.created_at)}</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
            </div>
          </div>

          {/* Desktop layout */}
          <div className="hidden lg:grid lg:grid-cols-[80px_1fr_1fr_100px_140px_120px_40px] gap-4 items-center px-4 py-3">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-gray-100 text-gray-700 w-fit">
              {adj.event}
            </span>
            <span className="text-sm text-gray-900 truncate">{adj.aff_gov_team}</span>
            <span className="text-sm text-gray-600 truncate">{adj.neg_opp_team}</span>
            <span className="text-sm text-gray-600">{adj.round}</span>
            <span>{statusBadge(adj.status, adj.penalty)}</span>
            <span className="text-sm text-gray-400">{formatDate(adj.created_at)}</span>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </div>
        </Link>
      ))}
    </div>
  )
}
