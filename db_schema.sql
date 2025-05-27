-- PDF Management & Collaboration System - Supabase SQL Script
-- Run this script in your Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create users table (extends Supabase auth.users)
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- Create pdf_files table
CREATE TABLE public.pdf_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type TEXT NOT NULL DEFAULT 'application/pdf',
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create file_shares table
CREATE TABLE public.file_shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pdf_file_id UUID NOT NULL REFERENCES public.pdf_files(id) ON DELETE CASCADE,
    shared_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    share_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'base64url'),
    expires_at TIMESTAMP WITH TIME ZONE,
    access_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create comments table
CREATE TABLE public.comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pdf_file_id UUID NOT NULL REFERENCES public.pdf_files(id) ON DELETE CASCADE,
    commenter_name TEXT NOT NULL,
    commenter_email TEXT,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    comment_text TEXT NOT NULL,
    page_number INTEGER,
    position_x FLOAT,
    position_y FLOAT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_edited BOOLEAN DEFAULT FALSE
);

-- Create user_sessions table
CREATE TABLE public.user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    session_token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

-- Create invite_sessions table
CREATE TABLE public.invite_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    share_token TEXT NOT NULL REFERENCES public.file_shares(share_token) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    commenter_name TEXT NOT NULL,
    commenter_email TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create file_access_logs table
CREATE TABLE public.file_access_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pdf_file_id UUID NOT NULL REFERENCES public.pdf_files(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    share_token TEXT,
    access_type TEXT NOT NULL CHECK (access_type IN ('view', 'download', 'comment')),
    ip_address INET,
    user_agent TEXT,
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_preferences table
CREATE TABLE public.user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    theme TEXT DEFAULT 'light' CHECK (theme IN ('light', 'dark')),
    notifications_enabled BOOLEAN DEFAULT TRUE,
    default_share_expiry INTERVAL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create indexes for performance optimization
CREATE INDEX idx_pdf_files_filename ON public.pdf_files USING gin(to_tsvector('english', filename));
CREATE INDEX idx_pdf_files_owner ON public.pdf_files(owner_id);
CREATE INDEX idx_pdf_files_created ON public.pdf_files(created_at DESC);

CREATE INDEX idx_file_shares_token ON public.file_shares(share_token);
CREATE INDEX idx_file_shares_file ON public.file_shares(pdf_file_id);
CREATE INDEX idx_file_shares_active ON public.file_shares(is_active) WHERE is_active = TRUE;

CREATE INDEX idx_comments_file ON public.comments(pdf_file_id);
CREATE INDEX idx_comments_created ON public.comments(created_at DESC);
CREATE INDEX idx_comments_user ON public.comments(user_id) WHERE user_id IS NOT NULL;

CREATE INDEX idx_user_sessions_token ON public.user_sessions(session_token);
CREATE INDEX idx_user_sessions_expiry ON public.user_sessions(expires_at);
CREATE INDEX idx_user_sessions_user ON public.user_sessions(user_id);

CREATE INDEX idx_invite_sessions_token ON public.invite_sessions(share_token);
CREATE INDEX idx_invite_sessions_session ON public.invite_sessions(session_id);

CREATE INDEX idx_access_logs_file ON public.file_access_logs(pdf_file_id);
CREATE INDEX idx_access_logs_time ON public.file_access_logs(accessed_at DESC);
CREATE INDEX idx_access_logs_user ON public.file_access_logs(user_id) WHERE user_id IS NOT NULL;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON public.users 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pdf_files_updated_at 
    BEFORE UPDATE ON public.pdf_files 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_comments_updated_at 
    BEFORE UPDATE ON public.comments 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at 
    BEFORE UPDATE ON public.user_preferences 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdf_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invite_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view their own profile" ON public.users
    FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update their own profile" ON public.users
    FOR UPDATE USING (auth.uid()::text = id::text);

-- RLS Policies for pdf_files table
CREATE POLICY "Users can view their own files" ON public.pdf_files
    FOR SELECT USING (auth.uid()::text = owner_id::text);

CREATE POLICY "Users can insert their own files" ON public.pdf_files
    FOR INSERT WITH CHECK (auth.uid()::text = owner_id::text);

CREATE POLICY "Users can update their own files" ON public.pdf_files
    FOR UPDATE USING (auth.uid()::text = owner_id::text);

CREATE POLICY "Users can delete their own files" ON public.pdf_files
    FOR DELETE USING (auth.uid()::text = owner_id::text);

-- RLS Policies for file_shares table
CREATE POLICY "Users can view shares of their files" ON public.file_shares
    FOR SELECT USING (
        auth.uid()::text IN (
            SELECT owner_id::text FROM public.pdf_files WHERE id = pdf_file_id
        )
    );

CREATE POLICY "Users can create shares for their files" ON public.file_shares
    FOR INSERT WITH CHECK (
        auth.uid()::text = shared_by::text AND
        auth.uid()::text IN (
            SELECT owner_id::text FROM public.pdf_files WHERE id = pdf_file_id
        )
    );

CREATE POLICY "Users can update shares of their files" ON public.file_shares
    FOR UPDATE USING (
        auth.uid()::text = shared_by::text
    );

CREATE POLICY "Users can delete shares of their files" ON public.file_shares
    FOR DELETE USING (
        auth.uid()::text = shared_by::text
    );

-- RLS Policies for comments table
CREATE POLICY "Users can view comments on their files" ON public.comments
    FOR SELECT USING (
        auth.uid()::text IN (
            SELECT owner_id::text FROM public.pdf_files WHERE id = pdf_file_id
        ) OR
        auth.uid()::text = user_id::text
    );

CREATE POLICY "Authenticated users can insert comments" ON public.comments
    FOR INSERT WITH CHECK (
        (auth.uid()::text = user_id::text) OR
        (user_id IS NULL AND commenter_name IS NOT NULL)
    );

CREATE POLICY "Users can update their own comments" ON public.comments
    FOR UPDATE USING (
        auth.uid()::text = user_id::text OR
        auth.uid()::text IN (
            SELECT owner_id::text FROM public.pdf_files WHERE id = pdf_file_id
        )
    );

-- RLS Policies for user_sessions table
CREATE POLICY "Users can view their own sessions" ON public.user_sessions
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert their own sessions" ON public.user_sessions
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete their own sessions" ON public.user_sessions
    FOR DELETE USING (auth.uid()::text = user_id::text);

-- RLS Policies for user_preferences table
CREATE POLICY "Users can view their own preferences" ON public.user_preferences
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert their own preferences" ON public.user_preferences
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own preferences" ON public.user_preferences
    FOR UPDATE USING (auth.uid()::text = user_id::text);

-- Create storage bucket (run this separately in Supabase dashboard or via client)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('pdfs', 'pdfs', false);

-- Storage policies for pdfs bucket (uncomment after creating the bucket)
-- CREATE POLICY "Users can upload their own PDF files" ON storage.objects
--     FOR INSERT WITH CHECK (bucket_id = 'pdfs' AND auth.uid()::text = owner::text);

-- CREATE POLICY "Users can view their own PDF files" ON storage.objects
--     FOR SELECT USING (bucket_id = 'pdfs' AND auth.uid()::text = owner::text);

-- CREATE POLICY "Users can delete their own PDF files" ON storage.objects
--     FOR DELETE USING (bucket_id = 'pdfs' AND auth.uid()::text = owner::text);

-- Policy to allow shared file access via valid share tokens
-- CREATE POLICY "Allow shared PDF access" ON storage.objects
--     FOR SELECT USING (
--         bucket_id = 'pdfs' AND 
--         name IN (
--             SELECT pf.file_path FROM public.pdf_files pf
--             JOIN public.file_shares fs ON pf.id = fs.pdf_file_id
--             WHERE fs.is_active = true AND (fs.expires_at IS NULL OR fs.expires_at > NOW())
--         )
--     );

COMMENT ON TABLE public.users IS 'Application users with authentication details';
COMMENT ON TABLE public.pdf_files IS 'Uploaded PDF files with metadata';
COMMENT ON TABLE public.file_shares IS 'Shared file access tokens and permissions';
COMMENT ON TABLE public.comments IS 'Comments on PDF files from users and invited guests';
COMMENT ON TABLE public.user_sessions IS 'Active user authentication sessions';
COMMENT ON TABLE public.invite_sessions IS 'Temporary sessions for invited users';
COMMENT ON TABLE public.file_access_logs IS 'Audit trail of file access activities';
COMMENT ON TABLE public.user_preferences IS 'User-specific application preferences';

-- Sample data insertion (optional - remove in production)
-- INSERT INTO public.users (email, name, password_hash) VALUES 
-- ('test@example.com', 'Test User', crypt('password123', gen_salt('bf')));

SELECT 'Database schema created successfully!' as status;