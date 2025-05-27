-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;

-- Create new policies for the users table
CREATE POLICY "Enable read access for users" ON public.users
  FOR SELECT USING (
    auth.uid() = id OR 
    auth.role() = 'service_role'
  );

CREATE POLICY "Enable insert for service role only" ON public.users
  FOR INSERT WITH CHECK (
    auth.role() = 'service_role'
  );

CREATE POLICY "Enable update for users and service role" ON public.users
  FOR UPDATE USING (
    auth.uid() = id OR 
    auth.role() = 'service_role'
  );

-- Create policies for user_preferences table
CREATE POLICY "Enable read access for own preferences" ON public.user_preferences
  FOR SELECT USING (
    auth.uid() = user_id OR 
    auth.role() = 'service_role'
  );

CREATE POLICY "Enable insert for service role" ON public.user_preferences
  FOR INSERT WITH CHECK (
    auth.role() = 'service_role'
  );

CREATE POLICY "Enable update for own preferences" ON public.user_preferences
  FOR UPDATE USING (
    auth.uid() = user_id OR 
    auth.role() = 'service_role'
  ); 