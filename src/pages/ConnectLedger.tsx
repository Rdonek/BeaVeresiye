import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { CheckCircle2, Link as LinkIcon, Loader2, Users, AlertCircle } from 'lucide-react';
import { supabase } from '@/shared/api/supabase';
import { useTenant } from '@/app/providers/TenantProvider';
import { Button } from '@/shared/ui/Button';
import { GlassCard as Card } from '@/shared/ui/GlassCard';
import { Input } from '@/shared/ui/Input';
import { useAddEntity } from '@/shared/hooks/useEntities';

export const ConnectLedger = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();
  
  const [selectedEntityId, setSelectedEntityId] = useState<string>('');
  const [newName, setNewName] = useState<string>('');
  const addEntityMutation = useAddEntity();

  // 1. Fetch link details
  const { data: linkInfo, isLoading: isLoadingLink, error: linkError } = useQuery({
    queryKey: ['network_link_preview', code],
    queryFn: async () => {
      if (!code) throw new Error('Kod bulunamadı');
      
      const { data, error } = await supabase
        .from('network_links')
        .select('*, sender:tenants!network_links_sender_tenant_id_fkey(name)')
        .eq('link_code', code)
        .maybeSingle();
        
      if (error) throw error;
      if (!data) throw new Error('Bağlantı kodu bulunamadı veya süresi dolmuş.');
      return data as any;
    },
    retry: false
  });

  // 2. Fetch current tenant's entities (customers/suppliers)
  const { data: entities = [], isLoading: isLoadingEntities } = useQuery({
    queryKey: ['entities', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, type, phone')
        .eq('tenant_id', tenantId)
        .order('name');
      if (error) throw error;
      return data as any[];
    },
    enabled: !!tenantId
  });

  // 3. Accept Connection Mutation
  const acceptConnection = useMutation({
    mutationFn: async (entityId: string) => {
      if (!code || !tenantId) throw new Error('Eksik bilgi');
      
      const { data, error } = await supabase.rpc('accept_network_link', {
        p_link_code: code,
        p_receiver_tenant_id: tenantId,
        p_receiver_entity_id: entityId
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Bağlantı başarıyla kuruldu!');
      queryClient.invalidateQueries({ queryKey: ['network_link'] });
      // Go back to the entity type page
      const entity = entities.find(e => e.id === selectedEntityId);
      if (entity?.type === 'supplier') {
        navigate('/suppliers');
      } else {
        navigate('/customers');
      }
    },
    onError: (err: any) => {
      toast.error(err.message || 'Bağlantı kurulurken bir hata oluştu.');
    }
  });

  useEffect(() => {
    if (linkInfo?.sender?.name && !newName) {
      setNewName(linkInfo.sender.name);
    }
  }, [linkInfo, newName]);

  const handleConfirm = async (type?: 'NEW_CUSTOMER' | 'NEW_SUPPLIER' | string) => {
    const targetId = type || selectedEntityId;
    const isNew = targetId === 'NEW_CUSTOMER' || targetId === 'NEW_SUPPLIER';
    setSelectedEntityId(targetId);
    
    if (isNew) {
      if (!newName || !tenantId) {
        toast.error('Lütfen bir isim girin.');
        return;
      }
      try {
        const newEntity = await addEntityMutation.mutateAsync({
          tenant_id: tenantId,
          name: newName,
          type: targetId === 'NEW_SUPPLIER' ? 'supplier' : 'customer',
          balance: 0
        });
        await acceptConnection.mutateAsync(newEntity.id);
      } catch (err) {
        toast.error('Yeni kayıt oluşturulurken hata oluştu.');
      }
    } else {
      acceptConnection.mutate(targetId);
    }
  };

  if (isLoadingLink) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (linkError || !linkInfo) {
    return (
      <div className="flex flex-col h-[80vh] items-center justify-center p-4">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-red-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Geçersiz veya Süresi Dolmuş Link</h2>
        <p className="text-gray-500 text-center max-w-md">
          Bu bağlantı kodu geçersiz veya daha önce kullanılmış. Lütfen daveti gönderen kişiden yeni bir link isteyin.
        </p>
        <Button className="mt-8" onClick={() => navigate('/')}>Ana Sayfaya Dön</Button>
      </div>
    );
  }

  if (linkInfo.status !== 'pending') {
    return (
      <div className="flex flex-col h-[80vh] items-center justify-center p-4">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Bu Bağlantı Zaten Aktif</h2>
        <p className="text-gray-500 text-center max-w-md">
          Bu veresiye defteri bağlantısı başarıyla kurulmuş ve aktif olarak kullanılıyor.
        </p>
        <Button className="mt-8" onClick={() => navigate('/')}>Ana Sayfaya Dön</Button>
      </div>
    );
  }

  if (linkInfo.sender_tenant_id === tenantId) {
    return (
      <div className="flex flex-col h-[80vh] items-center justify-center p-4">
        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-orange-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Kendi Linkiniz</h2>
        <p className="text-gray-500 text-center max-w-md">
          Oluşturduğunuz bağlantı linkine kendiniz tıkladınız. Bu linki bağlanmak istediğiniz esnafa/toptancıya göndermelisiniz.
        </p>
        <Button className="mt-8" onClick={() => navigate(-1)}>Geri Dön</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 max-w-2xl mx-auto">
      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-6">
        <LinkIcon className="w-8 h-8 text-blue-600" />
      </div>
      
      <h1 className="text-3xl font-black text-gray-900 mb-2 text-center">Defter Bağlantı İsteği</h1>
      <p className="text-gray-500 text-center mb-8 text-lg">
        <strong className="text-gray-900">{linkInfo.sender?.name || 'Bir işletme'}</strong> sizinle karşılıklı veresiye defterini eşleştirmek istiyor.
      </p>

      <Card padding="lg" className="w-full bg-white shadow-xl border-gray-100">
        {isLoadingEntities ? (
          <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-4">
              <Button 
                className="w-full h-16 text-lg font-bold bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 rounded-2xl transition-transform hover:scale-[1.02]" 
                onClick={() => handleConfirm('NEW_SUPPLIER')}
                isLoading={(selectedEntityId === 'NEW_SUPPLIER') && (acceptConnection.isPending || addEntityMutation.isPending)}
                disabled={acceptConnection.isPending || addEntityMutation.isPending}
              >
                <div className="flex items-center justify-center gap-3 w-full">
                  <span className="text-2xl">🏢</span> Toptancım Olarak Ekle ve Bağlan
                </div>
              </Button>

              <Button 
                className="w-full h-16 text-lg font-bold bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 rounded-2xl transition-transform hover:scale-[1.02]" 
                onClick={() => handleConfirm('NEW_CUSTOMER')}
                isLoading={(selectedEntityId === 'NEW_CUSTOMER') && (acceptConnection.isPending || addEntityMutation.isPending)}
                disabled={acceptConnection.isPending || addEntityMutation.isPending}
              >
                <div className="flex items-center justify-center gap-3 w-full">
                  <span className="text-2xl">👤</span> Müşterim Olarak Ekle ve Bağlan
                </div>
              </Button>
            </div>

            <p className="text-xs text-center text-gray-400">
              Onayladıktan sonra, karşı tarafın hesabınıza yazacağı her işlem (borç veya ödeme) sizin defterinize otomatik yansır.
            </p>

            <div className="mt-8 pt-6 border-t border-gray-100">
              <details className="group cursor-pointer">
                <summary className="text-sm font-semibold text-gray-500 hover:text-gray-800 transition-colors list-none flex items-center justify-center">
                  <span className="border-b border-dashed border-gray-400 pb-0.5">Zaten listemde ekli biriyle eşleştir</span>
                </summary>
                <div className="mt-4 p-5 bg-gray-50 border border-gray-100 rounded-2xl space-y-4">
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Eğer bu işletme zaten Müşteriler veya Toptancılar listenizde varsa ve mevcut bir bakiyesi bulunuyorsa, yeni kayıt açmak yerine aşağıdan o kişiyi seçin. Aksi takdirde eski bakiyeniz bu ağa dahil olmaz.
                  </p>
                  <select 
                    className="w-full p-3.5 bg-white border border-gray-200 rounded-xl font-medium outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    value={selectedEntityId !== 'NEW_CUSTOMER' && selectedEntityId !== 'NEW_SUPPLIER' ? selectedEntityId : ''}
                    onChange={(e) => setSelectedEntityId(e.target.value)}
                  >
                    <option value="" disabled>Kayıtlı bir kişi seçin...</option>
                    {entities.map(e => (
                      <option key={e.id} value={e.id}>
                        {e.name} {e.type === 'supplier' ? '(Toptancı)' : '(Müşteri)'}
                      </option>
                    ))}
                  </select>
                  <Button 
                    className="w-full py-6" 
                    disabled={!selectedEntityId || selectedEntityId === 'NEW_CUSTOMER' || selectedEntityId === 'NEW_SUPPLIER'}
                    onClick={() => handleConfirm()}
                    isLoading={(selectedEntityId !== 'NEW_CUSTOMER' && selectedEntityId !== 'NEW_SUPPLIER') && acceptConnection.isPending}
                  >
                    Seçili Kişiyle Eşleştir
                  </Button>
                </div>
              </details>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
