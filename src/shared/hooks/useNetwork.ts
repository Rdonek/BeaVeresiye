import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../api/supabase';

export interface NetworkLink {
  id: string;
  sender_tenant_id: string;
  sender_entity_id: string;
  receiver_tenant_id: string | null;
  receiver_entity_id: string | null;
  link_code: string;
  status: 'pending' | 'active' | 'rejected' | 'paused';
}

export const useNetworkLink = (entityId: string | undefined) => {
  return useQuery({
    queryKey: ['network_link', entityId],
    queryFn: async () => {
      if (!entityId) return null;
      const { data, error } = await supabase
        .from('network_links')
        .select('*')
        .or(`sender_entity_id.eq.${entityId},receiver_entity_id.eq.${entityId}`)
        .maybeSingle();
      
      if (error) throw error;
      return data as NetworkLink | null;
    },
    enabled: !!entityId
  });
};

export const useCreateNetworkLink = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ tenantId, entityId }: { tenantId: string, entityId: string }) => {
      const code = 'BEA-' + Math.random().toString(36).substring(2, 6).toUpperCase();
      const { data, error } = await supabase
        .from('network_links')
        .insert({
          sender_tenant_id: tenantId,
          sender_entity_id: entityId,
          link_code: code,
          status: 'pending'
        })
        .select()
        .single();
        
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['network_link', variables.entityId] });
    }
  });
};

export const useDisconnectNetworkLink = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ linkId }: { linkId: string }) => {
      const { data, error } = await supabase
        .from('network_links')
        .update({ status: 'paused' })
        .eq('id', linkId)
        .select()
        .single();
        
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['network_link'] });
    }
  });
};
