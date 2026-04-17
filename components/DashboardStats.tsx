'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { type DashboardStats, type FilterType } from '@/lib/types'

interface DashboardStatsProps {
  stats: DashboardStats
}

export default function DashboardStatsComponent({ stats }: DashboardStatsProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentFilter = (searchParams.get('filter') ?? 'all') as FilterType

  function setFilter(filter: FilterType) {
    const params = new URLSearchParams(searchParams.toString())
    if (filter === 'all') {
      params.delete('filter')
    } else {
      params.set('filter', filter)
    }
    router.push(`/dashboard?${params.toString()}`)
  }

  const closedTotal = stats.closed_penalty + stats.closed_no_penalty
  const penaltyPct = closedTotal > 0 ? Math.round((stats.closed_penalty / closedTotal) * 100) : 0
  const noPenaltyPct = closedTotal > 0 ? Math.round((stats.closed_no_penalty / closedTotal) * 100) : 0

  const cards = [
    {
      label: 'Total',
      value: stats.total,
      filter: 'all' as FilterType,
      color: 'blue',
      sub: null,
    },
    {
      label: 'Open',
      value: stats.open,
      filter: 'open' as FilterType,
      color: 'yellow',
      sub: null,
    },
    {
      label: 'Closed',
      value: stats.closed,
      filter: 'closed' as FilterType,
      color: 'gray',
      sub: null,
    },
    {
      label: 'Penalty',
      value: stats.closed_penalty,
      filter: 'penalty' as FilterType,
      color: 'red',
      sub: closedTotal > 0 ? `${penaltyPct}% of closed` : null,
    },
    {
      label: 'No Penalty',
      value: stats.closed_no_penalty,
      filter: 'no_penalty' as FilterType,
      color: 'green',
      sub: closedTotal > 0 ? `${noPenaltyPct}% of closed` : null,
    },
  ]

  const colorMap: Record<string, { bg: string; text: string; ring: string; active: string }> = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-700', ring: 'ring-blue-200', active: 'ring-blue-500' },
    yellow: { bg: 'bg-yellow-50', text: 'text-yellow-700', ring: 'ring-yellow-200', active: 'ring-yellow-500' },
    gray: { bg: 'bg-gray-50', text: 'text-gray-700', ring: 'ring-gray-200', active: 'ring-gray-500' },
    red: { bg: 'bg-red-50', text: 'text-red-700', ring: 'ring-red-200', active: 'ring-red-500' },
    green: { bg: 'bg-green-50', text: 'text-green-700', ring: 'ring-green-200', active: 'ring-green-500' },
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map(({ label, value, filter, color, sub }) => {
        const c = colorMap[color]
        const isActive = currentFilter === filter
        return (
          <button
            key={filter}
            onClick={() => setFilter(filter)}
            className={`${c.bg} rounded-xl p-4 text-left ring-2 transition-all hover:shadow-md ${
              isActive ? c.active : c.ring
            }`}
          >
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
            <p className={`text-3xl font-bold mt-1 ${c.text}`}>{value}</p>
            {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
          </button>
        )
      })}
    </div>
  )
}
