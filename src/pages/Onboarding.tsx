import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/shared/api/supabase';
import { useAuth } from '@/app/providers/AuthProvider';
import { motion } from 'framer-motion';
import { Store, Phone, User, Tag, Loader2, ArrowRight, LogOut } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { GlassCard as Card } from '@/shared/ui/GlassCard';

export const Onboarding = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    ownerName: user?.name || '',
    businessName: '',
    phone: '',
    category: 'Bakkal/Market',
  });

  const categories = [
    'Bakkal/Market',
    'Tekel Bayi',
    'Kafeterya/Çay Ocağı',
    'Manav',
    'Kasap',
    'Kırtasiye',
    'Diğer'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);

    try {
      // 1. Generate a base subdomain from business name
      let baseSubdomain = formData.businessName
        .toLowerCase()
        // Replace Turkish characters
        .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
        .replace(/[^a-z0-9]/g, '')
        .substring(0, 20);
        
      if (!baseSubdomain) baseSubdomain = 'isletme';

      let subdomain = baseSubdomain;
      let isUnique = false;
      let counter = 1;

      // Check if subdomain is unique, if not add a number
      while (!isUnique) {
        const { data: existing } = await supabase
          .from('tenants')
          .select('subdomain')
          .eq('subdomain', subdomain)
          .maybeSingle();

        if (existing) {
          subdomain = `${baseSubdomain}${counter}`;
          counter++;
        } else {
          isUnique = true;
        }
      }

      // 2. Update user's metadata in Auth table
      const { error: authError } = await supabase.auth.updateUser({
        data: { full_name: formData.ownerName, name: formData.ownerName }
      });
      if (authError) {
        console.error('Failed to update user profile name:', authError);
      }

      const newTenant = {
        name: formData.businessName,
        owner_id: user.id,
        subdomain,
        status: 'active',
        phone: formData.phone,
        category: formData.category,
      };

      const { data: tenantData, error } = await supabase.from('tenants').insert(newTenant).select('id').single();
      
      if (error) throw error;

      // 3. Create a free subscription for the new tenant
      if (tenantData?.id) {
        const { error: subError } = await supabase.from('subscriptions').insert({
          tenant_id: tenantData.id,
          plan_type: 'free',
          status: 'active'
        });
        if (subError) console.error('Subscription creation error:', subError);
      }

      toast.success('İşletmeniz başarıyla oluşturuldu! Hoş geldiniz.');
      // Reload to let TenantProvider pick up the new tenant
      window.location.href = '/';
    } catch (err: any) {
      console.error('Onboarding Submit Catch Error:', err);
      toast.error(`İşletme oluşturulurken bir hata meydana geldi: ${err?.message || 'Bilinmeyen Hata'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center relative bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      
      {/* Logout Button */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <button
          onClick={async () => {
            await signOut();
            navigate('/login');
          }}
          className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors bg-white px-4 py-2 rounded-full shadow-sm border border-gray-200"
        >
          <LogOut className="h-4 w-4" />
          Çıkış Yap
        </button>
      </div>

      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-white shadow-sm flex items-center justify-center border border-gray-200 p-2 mb-4">
            <img src="/bidefter_icon.svg" alt="Bidefter" className="w-full h-full object-contain" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">İşletmenizi Kurun</h2>
          <p className="mt-2 text-sm text-gray-500">15 saniyede veresiye defterinizi oluşturun.</p>
        </div>

        <Card padding="lg" className="w-full shadow-xl border-gray-200 bg-white">
          <form onSubmit={handleSubmit} className="space-y-5">
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Adınız Soyadınız</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  required
                  value={formData.ownerName}
                  onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                  className="block w-full rounded-md border border-gray-300 py-3 pl-10 pr-3 text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm shadow-sm"
                  placeholder="Ahmet Yılmaz"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">İşletme Adı</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Store className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  required
                  value={formData.businessName}
                  onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                  className="block w-full rounded-md border border-gray-300 py-3 pl-10 pr-3 text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm shadow-sm"
                  placeholder="Yılmaz Bakkal"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Telefon Numarası</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Phone className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="block w-full rounded-md border border-gray-300 py-3 pl-10 pr-3 text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm shadow-sm"
                  placeholder="05XX XXX XX XX"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">İşletme Türü</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Tag className="h-5 w-5 text-gray-400" />
                </div>
                <select
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="block w-full rounded-md border border-gray-300 py-3 pl-10 pr-10 text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm shadow-sm appearance-none bg-white"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                  <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            </div>

            <motion.button
              type="submit"
              disabled={loading || !formData.businessName || !formData.ownerName}
              whileTap={{ scale: loading ? 1 : 0.98 }}
              className="mt-6 w-full bg-primary text-white rounded-md h-12 flex items-center justify-center font-bold hover:bg-primary-hover transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  <span>Kuruluyor...</span>
                </>
              ) : (
                <>
                  <span>İşletmemi Kur</span>
                  <ArrowRight className="h-5 w-5 ml-2" />
                </>
              )}
            </motion.button>
            
          </form>
        </Card>
      </motion.div>
    </div>
  );
};
