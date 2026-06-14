-- 1. Add new columns to the tenants table
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS category text;

-- 2. Ensure RLS is enabled on the tenants table
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- 3. Policy to allow authenticated users to INSERT a tenant where they are the owner
-- Note: Supabase normally allows INSERT if the user meets the policy condition
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'tenants' AND policyname = 'Users can create their own tenant'
    ) THEN
        CREATE POLICY "Users can create their own tenant" ON public.tenants FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
    END IF;
END $$;

-- 4. Ensure users can update their own tenant
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'tenants' AND policyname = 'Users can update their own tenant'
    ) THEN
        CREATE POLICY "Users can update their own tenant" ON public.tenants FOR UPDATE TO authenticated USING (owner_id = auth.uid());
    END IF;
END $$;
