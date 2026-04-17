export type Role = 'admin' | 'adjudication_team' | 'reviewer'
export type DebateEvent = 'LD' | 'TP' | 'Parli'
export type Status = 'open' | 'closed'

export type Profile = {
  id: string
  email: string
  full_name: string | null
  role: Role
  is_super_admin: boolean
  created_at: string
  updated_at: string
}

export type Adjudication = {
  id: string
  event: DebateEvent
  aff_gov_team: string
  neg_opp_team: string
  round: string
  summary_of_complaint: string
  adjudication_team: string[]
  decision_action_taken: string | null
  status: Status
  penalty: boolean | null
  created_at: string
  created_by: string
  updated_at: string
  updated_by: string
  created_by_profile?: Pick<Profile, 'id' | 'full_name' | 'email'>
  updated_by_profile?: Pick<Profile, 'id' | 'full_name' | 'email'>
  adjudication_team_profiles?: Pick<Profile, 'id' | 'full_name' | 'email'>[]
}

export type InvestigationEntry = {
  id: string
  adjudication_id: string
  content: string
  created_by: string
  created_at: string
  updated_at: string
  created_by_profile?: Pick<Profile, 'id' | 'full_name' | 'email'>
  history?: InvestigationEntryHistory[]
}

export type InvestigationEntryHistory = {
  id: string
  entry_id: string
  edited_by: string
  edited_at: string
  previous_content: string
  new_content: string
  edited_by_profile?: Pick<Profile, 'id' | 'full_name' | 'email'>
}

export type AdjudicationHistory = {
  id: string
  adjudication_id: string
  changed_by: string
  changed_at: string
  previous_values: Record<string, unknown>
  new_values: Record<string, unknown>
  changed_by_profile?: Pick<Profile, 'id' | 'full_name' | 'email'>
}

export type DashboardStats = {
  total: number
  open: number
  closed: number
  closed_penalty: number
  closed_no_penalty: number
}

export type FilterType = 'all' | 'open' | 'closed' | 'penalty' | 'no_penalty'
