import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../api/supabase';
import type { Database } from '../api/database.types';

export type Transaction = Database['public']['Tables']['transactions']['Row'];
export type TransactionInsert = Database['public']['Tables']['transactions']['Insert'];

export const useFinanceTransactions = (tenantId: string | null, customerId: string | null = null) => {
  return useQuery({
    queryKey: ['transactions', tenantId, customerId],
    queryFn: async () => {
      if (!tenantId) return [];
      let query = supabase.from('transactions').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false });
      if (customerId) {
        query = query.eq('customer_id', customerId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as Transaction[];
    },
    enabled: !!tenantId,
  });
};

export const useAddFinanceTransaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newTx: TransactionInsert) => {
      const { data, error } = await supabase.from('transactions').insert(newTx).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['transactions', variables.tenant_id] });
      if (variables.customer_id) {
        queryClient.invalidateQueries({ queryKey: ['transactions', variables.tenant_id, variables.customer_id] });
      }
    },
  });
};

export const useUpdateFinanceTransaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string, tenant_id: string } & Partial<TransactionInsert>) => {
      const { data, error } = await supabase.from('transactions').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['transactions', variables.tenant_id] });
      if (variables.customer_id) {
        queryClient.invalidateQueries({ queryKey: ['transactions', variables.tenant_id, variables.customer_id] });
      }
    },
  });
};

export const useDeleteFinanceTransaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string, tenant_id: string }) => {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['transactions', variables.tenant_id] });
      // Since we don't have customer_id in variables here, we rely on the component to invalidate customer balance
    },
  });
};
