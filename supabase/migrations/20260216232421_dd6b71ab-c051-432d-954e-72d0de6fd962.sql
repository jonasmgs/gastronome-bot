CREATE POLICY "Users can update own recipes"
  ON public.recipes FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());