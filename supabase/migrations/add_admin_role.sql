-- Add admin role to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Create admin policy for challenges
CREATE POLICY "Admins can manage challenges" ON public.challenges
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Create admin policy for viewing all submissions
CREATE POLICY "Admins can view all submissions" ON public.submissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Create admin policy for viewing all reviews
CREATE POLICY "Admins can view all reviews" ON public.reviews
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Grant admin role to a specific user (replace with your email)
-- UPDATE public.profiles SET is_admin = true WHERE email = 'admin@example.com';
