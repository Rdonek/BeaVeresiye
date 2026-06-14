import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../api/supabase';
import type { Database } from '../api/database.types';

export type Entity = Database['public']['Tables']['customers']['Row'];
export type EntityInsert = Database['public']['Tables']['customers']['Insert'];

export const useEntities = (tenantId: string | null, type: 'customer' | 'supplier' = 'customer') => {
  return useQuery({
    queryKey: ['customers', tenantId, type],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase.from('customers').select('*').eq('tenant_id', tenantId).eq('type', type).order('name', { ascending: true });
      if (error) throw error;
      return data as Entity[];
    },
    enabled: !!tenantId,
  });
};

export const useAddEntity = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newEntity: EntityInsert) => {
      const { data, error } = await supabase.from('customers').insert(newEntity).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customers', variables.tenant_id] });
    },
  });
};

export const useUpdateEntityBalance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, newBalance }: { id: string; newBalance: number; tenantId: string }) => {
      const { error } = await supabase.from('customers').update({ balance: newBalance }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customers', variables.tenantId] });
    },
  });
};

export const useUpdateEntity = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Entity> }) => {
      const { data, error } = await supabase.from('customers').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['customers', data.tenant_id] });
    },
  });
};

export const useDeleteEntity = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, tenantId }: { id: string; tenantId: string }) => {
      const { error } = await supabase.from('customers').delete().eq('id', id).eq('tenant_id', tenantId);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customers', variables.tenantId] });
    },
  });
};
