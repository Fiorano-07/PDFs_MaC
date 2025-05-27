-- Update RLS policy for selecting files

-- Drop the existing policy first to avoid conflicts if it exists
DROP POLICY IF EXISTS "Users can view their own files" ON public.files;

-- Create a new policy that allows viewing own files OR public files
CREATE POLICY "Users can view their own or public files"
    ON public.files FOR SELECT
    USING (
        auth.uid() = user_id OR
        is_public = true
    );

-- Optionally, if you want to ensure previously public files remain accessible
-- and non-public files owned by others remain inaccessible by default for other operations,
-- review your INSERT, UPDATE, DELETE policies for the 'files' table.
-- The existing policies from '20240315000000_create_files_table.sql' for these operations are:
-- CREATE POLICY "Users can insert their own files" ON files FOR INSERT WITH CHECK (auth.uid() = user_id);
-- CREATE POLICY "Users can update their own files" ON files FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
-- CREATE POLICY "Users can delete their own files" ON files FOR DELETE USING (auth.uid() = user_id);
-- These generally seem fine as they restrict modifications to the owner. 