-- ============================================================
-- NITOC Adjudication Tracking App — Initial Migration
-- Run this in the Supabase SQL Editor
-- ============================================================

-- ── Profiles ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id             UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email          TEXT NOT NULL,
  full_name      TEXT,
  role           TEXT NOT NULL DEFAULT 'reviewer'
                   CHECK (role IN ('admin', 'adjudication_team', 'reviewer')),
  is_super_admin BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Adjudications ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.adjudications (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event                  TEXT NOT NULL CHECK (event IN ('LD', 'TP', 'Parli')),
  aff_gov_team           TEXT NOT NULL,
  neg_opp_team           TEXT NOT NULL,
  round                  TEXT NOT NULL,
  summary_of_complaint   TEXT NOT NULL,
  adjudication_team      UUID[] NOT NULL DEFAULT '{}',
  decision_action_taken  TEXT,
  status                 TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  penalty                BOOLEAN,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by             UUID NOT NULL REFERENCES public.profiles(id),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by             UUID NOT NULL REFERENCES public.profiles(id)
);

-- ── Adjudication History ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.adjudication_history (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  adjudication_id  UUID NOT NULL REFERENCES public.adjudications(id) ON DELETE CASCADE,
  changed_by       UUID NOT NULL REFERENCES public.profiles(id),
  changed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  previous_values  JSONB NOT NULL,
  new_values       JSONB NOT NULL
);

-- ── Investigation Entries ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.investigation_entries (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  adjudication_id  UUID NOT NULL REFERENCES public.adjudications(id) ON DELETE CASCADE,
  content          TEXT NOT NULL,
  created_by       UUID NOT NULL REFERENCES public.profiles(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Investigation Entry History ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.investigation_entry_history (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id          UUID NOT NULL REFERENCES public.investigation_entries(id) ON DELETE CASCADE,
  edited_by         UUID NOT NULL REFERENCES public.profiles(id),
  edited_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  previous_content  TEXT NOT NULL,
  new_content       TEXT NOT NULL
);

-- ── Helper function: get current user's role ──────────────────
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID DEFAULT auth.uid())
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.profiles WHERE id = user_id;
$$;

-- ── Trigger: auto-create profile on signup ────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  profile_count INT;
BEGIN
  SELECT COUNT(*) INTO profile_count FROM public.profiles;

  INSERT INTO public.profiles (id, email, full_name, role, is_super_admin)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name'
    ),
    CASE WHEN profile_count = 0 THEN 'admin' ELSE 'reviewer' END,
    CASE WHEN profile_count = 0 THEN TRUE ELSE FALSE END
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── Trigger: updated_at timestamps ───────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_adjudications_updated_at
  BEFORE UPDATE ON public.adjudications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_investigation_entries_updated_at
  BEFORE UPDATE ON public.investigation_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Row Level Security ────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adjudications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adjudication_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investigation_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investigation_entry_history ENABLE ROW LEVEL SECURITY;

-- profiles: all authenticated users can read
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT TO authenticated USING (TRUE);

-- profiles: each user can update their own name; admins can update roles
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.get_user_role() = 'admin')
  WITH CHECK (id = auth.uid() OR public.get_user_role() = 'admin');

-- adjudications: all authenticated users can read
CREATE POLICY "adjudications_select" ON public.adjudications
  FOR SELECT TO authenticated USING (TRUE);

-- adjudications: admin + adjudication_team can insert
CREATE POLICY "adjudications_insert" ON public.adjudications
  FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() IN ('admin', 'adjudication_team'));

-- adjudications: admin + adjudication_team can update
CREATE POLICY "adjudications_update" ON public.adjudications
  FOR UPDATE TO authenticated
  USING (public.get_user_role() IN ('admin', 'adjudication_team'))
  WITH CHECK (public.get_user_role() IN ('admin', 'adjudication_team'));

-- adjudication_history: all authenticated users can read
CREATE POLICY "adjudication_history_select" ON public.adjudication_history
  FOR SELECT TO authenticated USING (TRUE);

-- investigation_entries: all authenticated users can read
CREATE POLICY "investigation_entries_select" ON public.investigation_entries
  FOR SELECT TO authenticated USING (TRUE);

-- investigation_entries: admin + adjudication_team can insert
CREATE POLICY "investigation_entries_insert" ON public.investigation_entries
  FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() IN ('admin', 'adjudication_team'));

-- investigation_entries: only author or admin can update
CREATE POLICY "investigation_entries_update" ON public.investigation_entries
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.get_user_role() = 'admin')
  WITH CHECK (created_by = auth.uid() OR public.get_user_role() = 'admin');

-- investigation_entry_history: all authenticated users can read
CREATE POLICY "investigation_entry_history_select" ON public.investigation_entry_history
  FOR SELECT TO authenticated USING (TRUE);
