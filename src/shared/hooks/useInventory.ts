import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../api/supabase';
import type { Database } from '../api/database.types';

export type Product = Database['public']['Tables']['products']['Row'];
export type ProductInsert = Database['public']['Tables']['products']['Insert'];

export const useInventory = (tenantId: string | null) => {
  return useQuery({
    queryKey: ['products', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase.from('products').select('*').eq('tenant_id', tenantId).order('name', { ascending: true });
      if (error) throw error;
      return data as Product[];
    },
    enabled: !!tenantId,
  });
};

export const useAddProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newProduct: ProductInsert) => {
      const { data, error } = await supabase.from('products').insert(newProduct).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['products', variables.tenant_id] });
    },
  });
};

export const useUpdateProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string, tenant_id: string } & Partial<ProductInsert>) => {
      const { data, error } = await supabase.from('products').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['products', variables.tenant_id] });
    },
  });
};

export const useDeleteProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string, tenant_id: string }) => {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['products', variables.tenant_id] });
    },
  });
};
