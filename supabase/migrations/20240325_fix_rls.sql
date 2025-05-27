-- First, enable RLS on the tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Enable read access for users" ON public.users;
DROP POLICY IF EXISTS "Enable insert for service role only" ON public.users;
DROP POLICY IF EXISTS "Enable update for users and service role" ON public.users;
DROP POLICY IF EXISTS "Enable read access for own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Enable insert for service role" ON public.user_preferences;
DROP POLICY IF EXISTS "Enable update for own preferences" ON public.user_preferences;

-- Create policies for users table
CREATE POLICY "Enable read access for all authenticated users" ON public.users
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for service role" ON public.users
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Enable update for own row" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Create policies for user_preferences table
CREATE POLICY "Enable read access for own preferences" ON public.user_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Enable insert for service role" ON public.user_preferences
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Enable update for own preferences" ON public.user_preferences
  FOR UPDATE USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT ALL ON public.users TO service_role;
GRANT ALL ON public.user_preferences TO service_role;
GRANT SELECT ON public.users TO authenticated;
GRANT SELECT, UPDATE ON public.user_preferences TO authenticated; 