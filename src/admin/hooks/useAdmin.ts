import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/api/supabase';
import type { Database } from '@/shared/api/database.types';

type Tenant = Database['public']['Tables']['tenants']['Row'];
type TenantInsert = Database['public']['Tables']['tenants']['Insert'];
type TenantUpdate = Database['public']['Tables']['tenants']['Update'];

export const useAdminStats = () => {
  return useQuery({
    queryKey: ['admin_stats'],
    queryFn: async () => {
      const { data, error } = await supabase.from('tenants').select('status, sms_credits');
      if (error) throw error;
      
      const totalTenants = data?.length || 0;
      const activeTenants = data?.filter(t => t.status === 'active' || !t.status).length || 0;
      const totalSmsCredits = data?.reduce((sum, t) => sum + (Number(t.sms_credits) || 0), 0) || 0;
      
      return { totalTenants, activeTenants, totalSmsCredits };
    }
  });
};

export const useAdminTenants = () => {
  return useQuery({
    queryKey: ['admin_tenants'],
    queryFn: async () => {
      const { data, error } = await supabase.from('tenants').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as Tenant[];
    }
  });
};

export const useAdminTenant = (id: string | undefined) => {
  return useQuery({
    queryKey: ['admin_tenant', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase.from('tenants').select('*, super_admins(name)').eq('id', id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id
  });
};

export const useUpdateAdminTenant = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: TenantUpdate }) => {
      const { data, error } = await supabase.from('tenants').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin_tenants'] });
      queryClient.invalidateQueries({ queryKey: ['admin_tenant', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['admin_stats'] });
    }
  });
};

export const useAddAdminTenant = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: TenantInsert & { superAdminId: string }) => {
      const { superAdminId, ...tenantData } = payload;
      const { data: tenant, error: tenantErr } = await supabase.from('tenants').insert(tenantData).select().single();
      if (tenantErr) throw tenantErr;
      
      // We assume superAdmin ID is passed and linked via owner_id or just logged in user ID? 
      // Actually, CreateTenant does not use owner_id. It just creates a tenant.
      return tenant;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_tenants'] });
      queryClient.invalidateQueries({ queryKey: ['admin_stats'] });
    }
  });
};
