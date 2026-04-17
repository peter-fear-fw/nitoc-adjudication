import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/Navbar'
import AdjudicationForm from '@/components/AdjudicationForm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function NewAdjudicationPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'adjudication_team'].includes(profile.role)) {
    redirect('/dashboard')
  }

  const { data: allUsers } = await supabase
    .from('profiles')
    .select('id, email, full_name, role')
    .order('full_name', { ascending: true })

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar profile={profile} />
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-6">
        <Card>
          <CardHeader>
            <CardTitle>New Adjudication</CardTitle>
          </CardHeader>
          <CardContent>
            <AdjudicationForm allUsers={allUsers ?? []} />
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
