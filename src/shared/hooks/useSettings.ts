import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../api/supabase';
import type { Database } from '../api/database.types';

type Tenant = Database['public']['Tables']['tenants']['Row'];

export const useSettings = (tenantId: string | undefined | null) => {
  const queryClient = useQueryClient();
  const queryKey = ['tenant_settings', tenantId];

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      if (!tenantId) return null;
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantId)
        .single();
        
      if (error) throw error;
      return data as Tenant;
    },
    enabled: !!tenantId,
  });

  const updateSettings = useMutation({
    mutationFn: async (updates: Partial<Tenant>) => {
      if (!tenantId) throw new Error("Tenant ID is required");
      const { data, error } = await supabase
        .from('tenants')
        .update(updates)
        .eq('id', tenantId)
        .select()
        .single();
        
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    settings: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    updateSettings,
  };
};
