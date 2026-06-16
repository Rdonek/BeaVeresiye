import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/shared/api/supabase';
import { useAuth } from './AuthProvider';

interface TenantContextType {
  tenantId: string | null;
  tenantName: string | null;
  ownerName: string | null;
  planType: string | null;
  isLoading: boolean;
  error: string | null;
  setOwnerName: (name: string) => void;
}

const TenantContext = createContext<TenantContextType>({
  tenantId: null,
  tenantName: null,
  ownerName: null,
  planType: null,
  isLoading: true,
  error: null,
  setOwnerName: () => {},
});

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [tenantName, setTenantName] = useState<string | null>(null);
  const [ownerName, setOwnerName] = useState<string | null>(null);
  const [planType, setPlanType] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [prevUserId, setPrevUserId] = useState<string | undefined>(user?.id);

  // React pattern to update state based on prop (user) change BEFORE render
  if (user?.id !== prevUserId) {
    setPrevUserId(user?.id);
    if (user) {
      setIsLoading(true);
    }
  }

  useEffect(() => {
    const resolveTenant = async () => {
      try {
        if (!user) {
          setIsLoading(false);
          return;
        }

        setIsLoading(true); // VERY IMPORTANT: user changed, start loading again
        let query = supabase.from('tenants').select('id, name');
        
        if (user.type === 'employee' && user.tenant_id) {
           query = query.eq('id', user.tenant_id);
        } else {
           query = query.eq('owner_id', user.id).order('created_at', { ascending: true }).limit(1);
        }

        const { data, error: sbError } = await query.maybeSingle();

        if (sbError) {
          console.error('TenantProvider fetch error:', sbError);
          setError('Bağlantı hatası: İşletme sorgulanamadı.');
          setTenantId(null);
        } else if (!data) {
          // No tenant found - this is expected for new users
          setTenantId(null);
        } else {
          setTenantId(data.id);
          setTenantName(data.name);
          
          // Get owner name from Auth user if it's the owner, otherwise we don't strictly need it here
          if (user.type === 'owner') {
             setOwnerName(user.name || '');
          }

          // Fetch subscription plan
          const { data: subData } = await supabase
             .from('subscriptions')
             .select('plan_type')
             .eq('tenant_id', data.id)
             .maybeSingle();
             
          setPlanType(subData?.plan_type || 'free');
          setIsExpired(false); // Free plans do not expire yet
        }
      } catch (err) {
        console.error('Tenant fetch error:', err);
        setError('Beklenmeyen bir hata oluştu.');
      } finally {
        setIsLoading(false);
      }
    };

    resolveTenant();
  }, [user?.id, user?.type, user?.tenant_id]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-system-bg text-text-secondary">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="font-subhead">İşletme yükleniyor...</p>
        </div>
      </div>
    );
  }

  // Do not block rendering if there's no tenant. 
  // Let ProtectedRoute handle redirecting to /onboarding.
  if (isExpired && tenantId) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-system-bg p-6 text-center">
        <div className="rounded-2xl bg-white p-8 max-w-sm w-full border border-danger/20 shadow-lg">
          <div className="mx-auto w-16 h-16 rounded-full bg-danger/10 flex items-center justify-center mb-6">
            <svg className="w-8 h-8 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="mb-2 font-large-title text-danger">Süreniz Doldu</h2>
          <p className="font-subhead text-text-secondary mb-6">Abonelik süreniz sona ermiştir. Sistemi kullanmaya devam etmek için lütfen yöneticiyle iletişime geçerek sürenizi uzatın.</p>
          <button 
            onClick={() => window.open(`https://wa.me/905000000000?text=${encodeURIComponent(`Merhaba, ${tenantName} işletmesi için BiDefter aboneliğimi uzatmak istiyorum.`)}`, '_blank')}
            className="w-full bg-[#25D366] text-white py-3 rounded-xl font-headline flex justify-center items-center gap-2 hover:bg-[#128C7E] transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.347-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.876 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
            </svg>
            WhatsApp'tan Ulaşın
          </button>
        </div>
      </div>
    );
  }

  return (
    <TenantContext.Provider value={{ tenantId, tenantName, ownerName, planType, isLoading, error, setOwnerName }}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => useContext(TenantContext);
