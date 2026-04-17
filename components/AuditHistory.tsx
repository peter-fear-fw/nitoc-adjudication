import { type AdjudicationHistory } from '@/lib/types'
import { formatDateTime, displayName } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'

const FIELD_LABELS: Record<string, string> = {
  event: 'Event',
  aff_gov_team: 'Aff/Gov Team',
  neg_opp_team: 'Neg/Opp Team',
  round: 'Round',
  summary_of_complaint: 'Summary of Complaint',
  adjudication_team: 'Adjudication Team',
  decision_action_taken: 'Decision & Action Taken',
  status: 'Status',
  penalty: 'Penalty',
}

function formatValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (key === 'penalty') return value ? 'Yes' : 'No'
  if (Array.isArray(value)) return `[${(value as string[]).join(', ')}]`
  return String(value)
}

export default function AuditHistory({ history }: { history: AdjudicationHistory[] }) {
  if (history.length === 0) {
    return (
      <div className="text-center py-6 text-sm text-gray-400">No edit history yet.</div>
    )
  }

  return (
    <div className="space-y-3">
      {history.map((h) => (
        <div key={h.id} className="bg-white rounded-xl border border-gray-200 p-4 text-sm">
          <div className="flex items-center gap-2 mb-2 text-gray-500">
            <span className="font-medium text-gray-700">{displayName(h.changed_by_profile)}</span>
            <span>·</span>
            <span>{formatDateTime(h.changed_at)}</span>
          </div>
          <div className="space-y-1.5">
            {Object.keys(h.new_values).map((key) => (
              <div key={key} className="flex items-start gap-2 text-xs">
                <span className="text-gray-400 w-36 flex-shrink-0">{FIELD_LABELS[key] ?? key}</span>
                <span className="text-red-500 line-through">{formatValue(key, h.previous_values[key])}</span>
                <span className="text-gray-400">→</span>
                <span className="text-green-600">{formatValue(key, h.new_values[key])}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
