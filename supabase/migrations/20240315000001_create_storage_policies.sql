-- Create storage policies for the pdfs bucket
CREATE POLICY "Users can upload their own PDFs"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'pdfs' AND
        auth.uid() = (storage.foldername(name))[1]::uuid
    );

CREATE POLICY "Users can view their own PDFs"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'pdfs' AND
        auth.uid() = (storage.foldername(name))[1]::uuid
    );

CREATE POLICY "Users can update their own PDFs"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'pdfs' AND
        auth.uid() = (storage.foldername(name))[1]::uuid
    );

CREATE POLICY "Users can delete their own PDFs"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'pdfs' AND
        auth.uid() = (storage.foldername(name))[1]::uuid
    ); 