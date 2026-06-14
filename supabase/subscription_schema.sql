-- 1. Create subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    plan_type TEXT NOT NULL DEFAULT 'free',
    status TEXT NOT NULL DEFAULT 'active',
    end_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable RLS on subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- 3. Policy for users to view their own subscription
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'subscriptions' AND policyname = 'Users can view their own subscription'
    ) THEN
        CREATE POLICY "Users can view their own subscription" ON public.subscriptions 
        FOR SELECT TO authenticated 
        USING (tenant_id IN (SELECT id FROM public.tenants WHERE owner_id = auth.uid()));
    END IF;
END $$;

-- 4. Policy for users to insert their own subscription (during onboarding)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'subscriptions' AND policyname = 'Users can insert their own subscription'
    ) THEN
        CREATE POLICY "Users can insert their own subscription" ON public.subscriptions 
        FOR INSERT TO authenticated 
        WITH CHECK (tenant_id IN (SELECT id FROM public.tenants WHERE owner_id = auth.uid()));
    END IF;
END $$;

-- 5. Drop redundant columns from tenants table
ALTER TABLE public.tenants 
DROP COLUMN IF EXISTS owner_name,
DROP COLUMN IF EXISTS subscription_ends_at;

-- (Optional) If you have existing tenants and want to give them a free subscription automatically, run this:
INSERT INTO public.subscriptions (tenant_id, plan_type, status)
SELECT id, 'free', 'active' FROM public.tenants
WHERE id NOT IN (SELECT tenant_id FROM public.subscriptions);
