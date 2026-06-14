import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../api/supabase';
import type { Database } from '../api/database.types';

type Employee = Database['public']['Tables']['employees']['Row'];
type EmployeeInsert = Database['public']['Tables']['employees']['Insert'];
type EmployeeUpdate = Database['public']['Tables']['employees']['Update'];

export const useEmployees = (tenantId: string | undefined | null) => {
  const queryClient = useQueryClient();
  const queryKey = ['employees', tenantId];

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('name', { ascending: true });
        
      if (error) throw error;
      return data as Employee[];
    },
    enabled: !!tenantId,
  });

  const addEmployee = useMutation({
    mutationFn: async (newEmployee: EmployeeInsert) => {
      const { data, error } = await supabase.from('employees').insert(newEmployee).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const updateEmployee = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: EmployeeUpdate }) => {
      const { data, error } = await supabase.from('employees').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteEmployee = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('employees').delete().eq('id', id);
      if (error) throw error;
      return true;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    employees: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    addEmployee,
    updateEmployee,
    deleteEmployee,
  };
};
