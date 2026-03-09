
CREATE TABLE public.nutrition_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  height_cm numeric,
  weight_kg numeric,
  sex text CHECK (sex IN ('male', 'female')),
  age integer,
  goal text CHECK (goal IN ('weight_loss', 'muscle_gain', 'maintenance', 'general_health')),
  allergies text[] DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.nutrition_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own nutrition profile"
  ON public.nutrition_profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own nutrition profile"
  ON public.nutrition_profiles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own nutrition profile"
  ON public.nutrition_profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
