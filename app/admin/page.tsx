import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/Navbar'
import UserRoleManager from '@/components/UserRoleManager'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') redirect('/dashboard')

  const { data: users } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: true })

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar profile={profile} />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage roles for all registered users</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">All Users ({users?.length ?? 0})</CardTitle>
          </CardHeader>
          <CardContent>
            <UserRoleManager users={users ?? []} currentUserId={user.id} />
          </CardContent>
        </Card>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
          <strong>Role permissions:</strong>
          <ul className="mt-1.5 space-y-1 list-disc list-inside">
            <li><strong>Admin</strong> — Full access: create/edit adjudications, manage users, export data</li>
            <li><strong>Adjudication Team</strong> — Create and edit adjudications, add investigation log entries</li>
            <li><strong>Reviewer</strong> — View-only access to all adjudications</li>
          </ul>
        </div>
      </main>
    </div>
  )
}
