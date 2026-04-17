'use client'

import { useState } from 'react'
import { type Profile, type Role } from '@/lib/types'
import { displayName, formatDate } from '@/lib/utils'
import { Badge } from './ui/badge'

interface UserRoleManagerProps {
  users: Profile[]
  currentUserId: string
}

const roleLabels: Record<Role, string> = {
  admin: 'Admin',
  adjudication_team: 'Adjudication Team',
  reviewer: 'Reviewer',
}

const roleBadgeVariant: Record<Role, 'default' | 'secondary' | 'outline'> = {
  admin: 'default',
  adjudication_team: 'secondary',
  reviewer: 'outline',
}

export default function UserRoleManager({ users: initialUsers, currentUserId }: UserRoleManagerProps) {
  const [users, setUsers] = useState<Profile[]>(initialUsers)
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function changeRole(userId: string, role: Role) {
    setSaving(userId)
    setError(null)
    const res = await fetch('/api/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, role }),
    })
    if (res.ok) {
      const updated = await res.json()
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: updated.role } : u)))
    } else {
      const data = await res.json()
      setError(data.error ?? 'Failed to update role')
    }
    setSaving(null)
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}

      {/* Mobile: card list */}
      <div className="sm:hidden space-y-3">
        {users.map((user) => {
          const isMe = user.id === currentUserId
          const locked = user.is_super_admin || isMe
          return (
            <div key={user.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{displayName(user)}</span>
                    {user.is_super_admin && <Badge variant="default" className="text-xs">Super Admin</Badge>}
                    {isMe && <Badge variant="outline" className="text-xs">You</Badge>}
                  </div>
                  <span className="text-xs text-gray-400">{user.email}</span>
                </div>
                <Badge variant={roleBadgeVariant[user.role]}>{roleLabels[user.role]}</Badge>
              </div>
              {!locked && (
                <div className="mt-3">
                  <select
                    value={user.role}
                    disabled={saving === user.id}
                    onChange={(e) => changeRole(user.id, e.target.value as Role)}
                    className="w-full h-9 rounded-lg border border-gray-300 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="reviewer">Reviewer</option>
                    <option value="adjudication_team">Adjudication Team</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Desktop: table */}
      <div className="hidden sm:block bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Role</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Change Role</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((user) => {
              const isMe = user.id === currentUserId
              const locked = user.is_super_admin || isMe
              return (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{displayName(user)}</span>
                      {user.is_super_admin && <Badge variant="default" className="text-xs">Super Admin</Badge>}
                      {isMe && <Badge variant="outline" className="text-xs">You</Badge>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{user.email}</td>
                  <td className="px-4 py-3">
                    <Badge variant={roleBadgeVariant[user.role]}>{roleLabels[user.role]}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    {locked ? (
                      <span className="text-xs text-gray-400">{user.is_super_admin ? 'Protected' : 'Cannot change own role'}</span>
                    ) : (
                      <select
                        value={user.role}
                        disabled={saving === user.id}
                        onChange={(e) => changeRole(user.id, e.target.value as Role)}
                        className="h-8 rounded-lg border border-gray-300 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        <option value="reviewer">Reviewer</option>
                        <option value="adjudication_team">Adjudication Team</option>
                        <option value="admin">Admin</option>
                      </select>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400">{formatDate(user.created_at)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
