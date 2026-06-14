import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, supabaseUrl, supabaseAnonKey } from '@/shared/api/supabase';
import { createClient } from '@supabase/supabase-js';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useAdminAuth } from '../providers/AdminAuthProvider';
import { useAddAdminTenant } from '../hooks/useAdmin';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';

export const CreateTenant = () => {
  const navigate = useNavigate();
  const { user } = useAdminAuth();
  const addTenantMutation = useAddAdminTenant();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', subdomain: '', email: '', password: '', durationMonths: 1 });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create temp client so admin doesn't get logged out
      const tempClient = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
      
      const { data: authData, error: authErr } = await tempClient.auth.signUp({
        email: form.email,
        password: form.password,
      });

      if (authErr) throw authErr;
      if (!authData.user) throw new Error("Kullanıcı oluşturulamadı.");

      const endsAt = new Date();
      endsAt.setMonth(endsAt.getMonth() + form.durationMonths);

      await addTenantMutation.mutateAsync({
        name: form.name,
        subdomain: form.subdomain.toLowerCase().trim(),
        owner_id: authData.user.id,
        created_by_admin_id: user?.id,
        sms_credits: 0,
        status: 'active',
        subscription_ends_at: endsAt.toISOString(),
        superAdminId: user?.id || ''
      } as any);
      
      toast.success('İşletme başarıyla oluşturuldu!');
      navigate('/admin/tenants');
    } catch (err: any) {
      toast.error(`Hata oluştu: ${err.message || 'Bilinmeyen bir hata'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-2xl mx-auto space-y-8">
      <div className="flex items-center space-x-4">
        <button onClick={() => navigate('/admin/tenants')} className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-50"><ArrowLeft className="h-5 w-5" /></button>
        <div>
          <h1 className="font-large-title text-text-primary">Yeni İşletme</h1>
          <p className="font-body text-text-secondary">Sisteme yeni bir müşteri ekleyin</p>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="premium-card rounded-3xl p-6 md:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="mb-2 ml-1 block font-subhead text-text-secondary">İşletme Adı</label>
              <Input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Örn: Mavi Kuaför" className="h-12 text-body" />
            </div>
            <div>
              <label className="mb-2 ml-1 block font-subhead text-text-secondary">Alt Alan Adı (Subdomain)</label>
              <Input required value={form.subdomain} onChange={e => setForm({...form, subdomain: e.target.value})} placeholder="mavikuafor" className="h-12 text-body" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div>
              <label className="mb-2 ml-1 block font-subhead text-text-secondary">Başlangıç Lisans Süresi</label>
              <select 
                value={form.durationMonths}
                onChange={e => setForm({...form, durationMonths: parseInt(e.target.value)})}
                className="w-full h-12 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none text-body"
              >
                <option value={1}>1 Ay (Deneme/Kısa)</option>
                <option value={6}>6 Ay</option>
                <option value={12}>1 Yıl</option>
              </select>
            </div>
          </div>
          <div className="pt-4 border-t border-system-muted/30">
            <h3 className="font-headline mb-4">Patron (Giriş) Bilgileri</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="mb-2 ml-1 block font-subhead text-text-secondary">E-posta</label>
                <Input type="email" required value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="patron@gmail.com" className="h-12 text-body" />
              </div>
              <div>
                <label className="mb-2 ml-1 block font-subhead text-text-secondary">Şifre</label>
                <Input type="text" required value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="Geçici şifre" className="h-12 text-body" />
              </div>
            </div>
          </div>
          <Button type="submit" size="lg" fullWidth disabled={loading} className="mt-4">
            {loading ? <Loader2 className="animate-spin h-5 w-5 mx-auto" /> : 'İşletmeyi Oluştur'}
          </Button>
        </form>
      </motion.div>
    </div>
  );
};
