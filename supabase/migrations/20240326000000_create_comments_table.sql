-- Create comments table
CREATE TABLE public.comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    file_id UUID NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    page_number INTEGER NOT NULL,
    content TEXT NOT NULL,
    CONSTRAINT valid_page_number CHECK (page_number > 0)
);

-- Create indexes
CREATE INDEX idx_comments_file_id ON comments(file_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_comments_page_number ON comments(page_number);

-- Enable Row Level Security
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view comments on files they have access to"
    ON comments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM files
            WHERE files.id = comments.file_id
            AND (
                files.user_id = auth.uid() OR
                files.is_public = true
            )
        )
    );

CREATE POLICY "Users can insert comments on files they have access to"
    ON comments FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM files
            WHERE files.id = comments.file_id
            AND (
                files.user_id = auth.uid() OR
                files.is_public = true
            )
        )
    );

CREATE POLICY "Users can update their own comments"
    ON comments FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
    ON comments FOR DELETE
    USING (auth.uid() = user_id);

-- Create a function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create a trigger to automatically update updated_at
CREATE TRIGGER update_comments_updated_at
    BEFORE UPDATE ON comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 