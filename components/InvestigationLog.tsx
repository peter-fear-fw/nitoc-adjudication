'use client'

import { useState } from 'react'
import { type InvestigationEntry, type Profile } from '@/lib/types'
import { formatDateTime, displayName, getInitials } from '@/lib/utils'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'
import { ChevronDown, ChevronUp, Pencil, Check, X } from 'lucide-react'

interface InvestigationLogProps {
  adjudicationId: string
  initialEntries: InvestigationEntry[]
  currentUserId: string
  canAdd: boolean
}

function EntryCard({
  entry,
  currentUserId,
  canEdit,
  onUpdated,
}: {
  entry: InvestigationEntry
  currentUserId: string
  canEdit: boolean
  onUpdated: (updated: InvestigationEntry) => void
}) {
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState(entry.content)
  const [saving, setSaving] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  const isAuthor = entry.created_by === currentUserId
  const wasEdited = entry.updated_at !== entry.created_at
  const hasHistory = (entry.history?.length ?? 0) > 0

  async function saveEdit() {
    if (!editContent.trim() || editContent === entry.content) {
      setEditing(false)
      return
    }
    setSaving(true)
    const res = await fetch(`/api/adjudications/${entry.adjudication_id}/entries/${entry.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: editContent }),
    })
    if (res.ok) {
      const updated = await res.json()
      onUpdated({ ...updated, history: entry.history ? [...entry.history, { id: '', entry_id: entry.id, edited_by: currentUserId, edited_at: new Date().toISOString(), previous_content: entry.content, new_content: editContent }] : [] })
    }
    setSaving(false)
    setEditing(false)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-semibold flex items-center justify-center text-xs flex-shrink-0">
          {getInitials(entry.created_by_profile?.full_name, entry.created_by_profile?.email ?? '')}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-gray-900">
                {displayName(entry.created_by_profile)}
              </span>
              <span className="text-xs text-gray-400">{formatDateTime(entry.created_at)}</span>
              {wasEdited && (
                <span className="text-xs text-gray-400 italic">
                  · edited {formatDateTime(entry.updated_at)}
                </span>
              )}
            </div>
            {(isAuthor || canEdit) && !editing && (
              <button
                onClick={() => { setEditing(true); setEditContent(entry.content) }}
                className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 flex-shrink-0"
                title="Edit"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {editing ? (
            <div className="space-y-2">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={3}
                autoFocus
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={saveEdit} disabled={saving}>
                  <Check className="w-3.5 h-3.5" />
                  {saving ? 'Saving…' : 'Save'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                  <X className="w-3.5 h-3.5" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{entry.content}</p>
          )}

          {hasHistory && !editing && (
            <div className="mt-2">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700"
              >
                {showHistory ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {showHistory ? 'Hide' : 'View'} edit history
              </button>
              {showHistory && (
                <div className="mt-2 space-y-2 pl-3 border-l-2 border-gray-100">
                  {entry.history!.map((h, i) => (
                    <div key={h.id || i} className="text-xs text-gray-500">
                      <span className="font-medium">
                        {displayName(h.edited_by_profile)}
                      </span>
                      {' '}edited at {formatDateTime(h.edited_at)}
                      <div className="mt-0.5 text-gray-400 line-through">{h.previous_content}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function InvestigationLog({
  adjudicationId,
  initialEntries,
  currentUserId,
  canAdd,
}: InvestigationLogProps) {
  const [entries, setEntries] = useState<InvestigationEntry[]>(initialEntries)
  const [newContent, setNewContent] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function addEntry() {
    if (!newContent.trim()) return
    setAdding(true)
    setError(null)
    const res = await fetch(`/api/adjudications/${adjudicationId}/entries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: newContent }),
    })
    if (res.ok) {
      const entry = await res.json()
      setEntries((prev) => [...prev, { ...entry, history: [] }])
      setNewContent('')
    } else {
      const data = await res.json()
      setError(data.error ?? 'Failed to add entry')
    }
    setAdding(false)
  }

  function updateEntry(updated: InvestigationEntry) {
    setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))
  }

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-gray-900">Investigation Log</h3>

      {entries.length === 0 && (
        <p className="text-sm text-gray-400 py-4 text-center">No investigation entries yet.</p>
      )}

      <div className="space-y-3">
        {entries.map((entry) => (
          <EntryCard
            key={entry.id}
            entry={entry}
            currentUserId={currentUserId}
            canEdit={canAdd}
            onUpdated={updateEntry}
          />
        ))}
      </div>

      {canAdd && (
        <div className="space-y-2 pt-2">
          <Textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Add an investigation entry…"
            rows={3}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button onClick={addEntry} disabled={adding || !newContent.trim()} size="sm">
            {adding ? 'Adding…' : 'Add Entry'}
          </Button>
        </div>
      )}
    </div>
  )
}
