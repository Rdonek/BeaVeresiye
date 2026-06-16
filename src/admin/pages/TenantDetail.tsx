import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, MessageSquare, Save, AlertTriangle, Clock } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { motion } from 'framer-motion';
import { useAdminTenant, useUpdateAdminTenant } from '../hooks/useAdmin';

export const TenantDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const { data: tenant, isLoading: loading } = useAdminTenant(id);
  const updateTenantMutation = useUpdateAdminTenant();
  
  const [addSms, setAddSms] = useState('');
  const [extendMonths, setExtendMonths] = useState(1);
  const [localStatus, setLocalStatus] = useState<string | null>(null);

  const currentStatus = localStatus !== null ? localStatus : (tenant?.status || 'active');

  const handleUpdate = async () => {
    if (!tenant) return;
    const smsToAdd = parseInt(addSms) || 0;
    const newSms = (tenant.sms_credits || 0) + smsToAdd;
    
    await updateTenantMutation.mutateAsync({
      id: tenant.id,
      updates: {
        sms_credits: newSms,
        status: currentStatus
      }
    });
    
    setAddSms('');
  };

  const handleExtendSubscription = async () => {
    if (!tenant) return;
    
    let currentEnd = new Date((tenant as any).subscription_ends_at || new Date());
    if (currentEnd < new Date()) currentEnd = new Date();
    
    currentEnd.setMonth(currentEnd.getMonth() + extendMonths);
    
    await updateTenantMutation.mutateAsync({
      id: tenant.id,
      updates: {
        subscription_ends_at: currentEnd.toISOString()
      } as any // Bypass TS error for removed field
    });
  };

  if (loading) return <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!tenant) return <div className="p-10 text-center font-headline text-text-secondary">İşletme bulunamadı</div>;

  const isSaving = updateTenantMutation.isPending;

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto space-y-8">
      <div className="flex items-center space-x-4">
        <button onClick={() => navigate('/admin/tenants')} className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-50"><ArrowLeft className="h-5 w-5" /></button>
        <div>
          <h1 className="font-large-title text-text-primary">{tenant.name}</h1>
          <p className="font-body text-text-secondary">{tenant.subdomain}.beaveresiye.com</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="premium-card rounded-3xl p-6">
          <h3 className="font-headline mb-4 flex items-center gap-2"><MessageSquare className="h-5 w-5 text-primary"/> SMS Yönetimi</h3>
          <div className="bg-system-muted/30 p-4 rounded-2xl mb-4 text-center">
            <p className="font-subhead text-text-secondary">Mevcut Bakiye</p>
            <p className="font-large-title text-primary">{tenant.sms_credits || 0}</p>
          </div>
          <label className="mb-2 ml-1 block font-subhead text-text-secondary">Kredi Ekle (Örn: 100)</label>
          <div className="flex gap-2">
            <Input type="number" value={addSms} onChange={e => setAddSms(e.target.value)} placeholder="0" className="flex-1" />
            <Button onClick={handleUpdate} disabled={isSaving || (!addSms && localStatus === null)}>Ekle</Button>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="premium-card rounded-3xl p-6">
          <h3 className="font-headline mb-4 flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-warning"/> Hesap Durumu</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-system-muted/30 rounded-xl">
              <span className="font-subhead text-text-secondary">Durum</span>
              <select 
                value={currentStatus} 
                onChange={(e) => setLocalStatus(e.target.value)}
                className="bg-transparent font-headline outline-none"
              >
                <option value="active">Aktif</option>
                <option value="suspended">Askıya Alınmış</option>
              </select>
            </div>
            <div className="flex justify-between items-center p-3 bg-system-muted/30 rounded-xl">
              <span className="font-subhead text-text-secondary">Ekleyen Admin</span>
              <span className="font-subhead">{(tenant.super_admins as any)?.name || '-'}</span>
            </div>
            <Button fullWidth variant="outline" onClick={handleUpdate} disabled={isSaving} className="mt-4">
              <Save className="h-4 w-4 mr-2" /> Değişiklikleri Kaydet
            </Button>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="premium-card rounded-3xl p-6 md:col-span-2">
          <h3 className="font-headline mb-4 flex items-center gap-2"><Clock className="h-5 w-5 text-primary"/> Abonelik Yönetimi</h3>
          
          <div className="flex flex-col md:flex-row gap-6 items-center">
            <div className="bg-system-muted/30 p-4 rounded-2xl flex-1 w-full">
              <p className="font-subhead text-text-secondary">Bitiş Tarihi</p>
              <p className={`font-large-title ${(tenant as any).subscription_ends_at && new Date((tenant as any).subscription_ends_at) < new Date() ? 'text-danger' : 'text-primary'}`}>
                {(tenant as any).subscription_ends_at ? new Date((tenant as any).subscription_ends_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Belirsiz'}
              </p>
            </div>

            <div className="flex-1 w-full">
              <label className="mb-2 ml-1 block font-subhead text-text-secondary">Süreyi Uzat</label>
              <div className="flex gap-2">
                <select 
                  value={extendMonths}
                  onChange={e => setExtendMonths(parseInt(e.target.value))}
                  className="w-full h-12 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none text-body"
                >
                  <option value={1}>1 Ay Ekle</option>
                  <option value={6}>6 Ay Ekle</option>
                  <option value={12}>1 Yıl Ekle</option>
                </select>
                <Button onClick={handleExtendSubscription} disabled={isSaving}>Uzat</Button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
