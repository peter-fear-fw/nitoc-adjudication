'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { type Adjudication, type Profile } from '@/lib/types'
import { ROUND_OPTIONS, EVENT_OPTIONS, displayName } from '@/lib/utils'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'

interface AdjudicationFormProps {
  adjudication?: Adjudication
  allUsers: Pick<Profile, 'id' | 'full_name' | 'email'>[]
}

export default function AdjudicationForm({ adjudication, allUsers }: AdjudicationFormProps) {
  const router = useRouter()
  const isEdit = !!adjudication

  const [form, setForm] = useState({
    event: adjudication?.event ?? '',
    aff_gov_team: adjudication?.aff_gov_team ?? '',
    neg_opp_team: adjudication?.neg_opp_team ?? '',
    round: adjudication?.round ?? '',
    summary_of_complaint: adjudication?.summary_of_complaint ?? '',
    adjudication_team: adjudication?.adjudication_team ?? [] as string[],
    decision_action_taken: adjudication?.decision_action_taken ?? '',
    status: adjudication?.status ?? 'open',
    penalty: adjudication?.penalty ?? null as boolean | null,
  })

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleTeamMember(id: string) {
    setForm((prev) => ({
      ...prev,
      adjudication_team: prev.adjudication_team.includes(id)
        ? prev.adjudication_team.filter((x) => x !== id)
        : [...prev.adjudication_team, id],
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const payload = {
      ...form,
      penalty: form.status === 'closed' ? form.penalty : null,
    }

    const url = isEdit ? `/api/adjudications/${adjudication.id}` : '/api/adjudications'
    const method = isEdit ? 'PATCH' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Failed to save')
      setSaving(false)
      return
    }

    const saved = await res.json()
    router.push(`/adjudications/${saved.id}`)
    router.refresh()
  }

  const eligibleUsers = allUsers.filter((u) =>
    (u as Profile & { role?: string }).role === 'adjudication_team' ||
    (u as Profile & { role?: string }).role === 'admin' ||
    form.adjudication_team.includes(u.id)
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="event">Event *</Label>
          <Select value={form.event} onValueChange={(v) => setForm((p) => ({ ...p, event: v }))}>
            <SelectTrigger id="event">
              <SelectValue placeholder="Select event" />
            </SelectTrigger>
            <SelectContent>
              {EVENT_OPTIONS.map((e) => (
                <SelectItem key={e} value={e}>{e}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="round">Round *</Label>
          <Select value={form.round} onValueChange={(v) => setForm((p) => ({ ...p, round: v }))}>
            <SelectTrigger id="round">
              <SelectValue placeholder="Select round" />
            </SelectTrigger>
            <SelectContent>
              {ROUND_OPTIONS.map((r) => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="aff_gov_team">Aff/Gov Team *</Label>
          <Input
            id="aff_gov_team"
            value={form.aff_gov_team}
            onChange={(e) => setForm((p) => ({ ...p, aff_gov_team: e.target.value }))}
            placeholder="Team name"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="neg_opp_team">Neg/Opp Team *</Label>
          <Input
            id="neg_opp_team"
            value={form.neg_opp_team}
            onChange={(e) => setForm((p) => ({ ...p, neg_opp_team: e.target.value }))}
            placeholder="Team name"
            required
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="summary">Summary of Complaint *</Label>
        <Textarea
          id="summary"
          value={form.summary_of_complaint}
          onChange={(e) => setForm((p) => ({ ...p, summary_of_complaint: e.target.value }))}
          placeholder="Describe the complaint…"
          rows={3}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label>Adjudication Team</Label>
        <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto space-y-1 bg-white">
          {allUsers.length === 0 && (
            <p className="text-sm text-gray-400">No team members available</p>
          )}
          {allUsers.map((u) => {
            const checked = form.adjudication_team.includes(u.id)
            return (
              <label key={u.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleTeamMember(u.id)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{displayName(u)}</span>
                <span className="text-xs text-gray-400">{u.email}</span>
              </label>
            )
          })}
        </div>
        <p className="text-xs text-gray-400">Select all team members involved in this adjudication</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="decision">Decision &amp; Action Taken</Label>
        <Textarea
          id="decision"
          value={form.decision_action_taken}
          onChange={(e) => setForm((p) => ({ ...p, decision_action_taken: e.target.value }))}
          placeholder="Describe the decision and any actions taken…"
          rows={4}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="status">Status</Label>
          <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v as 'open' | 'closed' }))}>
            <SelectTrigger id="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {form.status === 'closed' && (
          <div className="space-y-1.5">
            <Label htmlFor="penalty">Penalty Issued?</Label>
            <Select
              value={form.penalty === null ? '' : form.penalty ? 'true' : 'false'}
              onValueChange={(v) => setForm((p) => ({ ...p, penalty: v === 'true' ? true : v === 'false' ? false : null }))}
            >
              <SelectTrigger id="penalty">
                <SelectValue placeholder="Select…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Yes — Penalty Issued</SelectItem>
                <SelectItem value="false">No — No Penalty</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Adjudication'}
        </Button>
      </div>
    </form>
  )
}
