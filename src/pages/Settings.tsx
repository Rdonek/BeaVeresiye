import { toast } from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import { supabase } from '@/shared/api/supabase';
import { useAuth } from '@/app/providers/AuthProvider';
import { useTenant } from '@/app/providers/TenantProvider';
import { User, Store, Shield, Bell, LogOut, ChevronRight, MessageSquareWarning, Send, Download, Loader2, Edit2 } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { sendSMS } from '@/shared/lib/netgsm';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/widgets/Header';
import { GlassCard as Card } from '@/shared/ui/GlassCard';
import { useSettings } from '@/shared/hooks/useSettings';
import * as XLSX from 'xlsx';

export const Settings = () => {
  const { user, signOut } = useAuth();
  const { tenantId, tenantName, ownerName, setOwnerName, subscriptionEndsAt } = useTenant();
  const navigate = useNavigate();
  
  const { settings, isLoading, updateSettings } = useSettings(tenantId);

  const calculateRemainingTime = () => {
    if (!subscriptionEndsAt) return 'Calculating...';
    const end = new Date(subscriptionEndsAt);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    
    if (diff <= 0) return 'Süresi Doldu';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    
    return `${days} Gün ${hours} Saat Kaldı`;
  };

  const [isAutoSmsModalOpen, setIsAutoSmsModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [newProfileName, setNewProfileName] = useState(ownerName || user?.name || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [overdueCustomers, setOverdueCustomers] = useState<any[]>([]);

  const fetchOverdueCustomers = async () => {
    if (!tenantId) return;
    const today = new Date().toISOString();
    const { data } = await supabase
      .from('transactions')
      .select('*, customers!inner(*)')
      .eq('tenant_id', tenantId)
      .not('due_date', 'is', null)
      .lt('due_date', today);
      
    if (data) {
      const uniqueCustomers = Array.from(new Map(data.map(tx => [(tx.customers as any).id, tx.customers])).values());
      setOverdueCustomers(uniqueCustomers.filter((c: any) => c.balance > 0));
    }
  };

  const openAutoSmsModal = () => {
    fetchOverdueCustomers();
    setIsAutoSmsModalOpen(true);
  };

  const handleBuyCredits = () => {
    const message = `Merhaba, ${tenantName} mağazası için SMS bakiyesi satın almak istiyorum.`;
    const whatsappUrl = `https://wa.me/1234567890?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleToggleAutoSms = async () => {
    if (!settings) return;
    await updateSettings.mutateAsync({ auto_sms_enabled: !settings.auto_sms_enabled });
  };

  const handleSendBulkSms = async () => {
    if (!settings) return;
    if (overdueCustomers.length === 0) return;
    if ((settings.sms_credits || 0) < overdueCustomers.length) {
      toast.error(`Yetersiz SMS Bakiyesi! ${overdueCustomers.length} müşteriye mesaj göndermek için yeterli bakiyeniz bulunmuyor.`);
      return;
    }

    if (!window.confirm(`${overdueCustomers.length} müşteriye SMS gönderilecek. ${overdueCustomers.length} SMS bakiyesi düşülecek. Onaylıyor musunuz?`)) return;

    let successCount = 0;
    for (const customer of overdueCustomers) {
      if (customer.phone) {
        const message = `Sayın ${customer.name}, ${tenantName} mağazasına ${customer.balance.toLocaleString('tr-TR')} TL gecikmiş borcunuz bulunmaktadır. Lütfen en kısa sürede ödeme yapınız.`;
        const res = await sendSMS(customer.phone, message);
        if (res.success) successCount++;
      }
    }

    await updateSettings.mutateAsync({ sms_credits: (settings.sms_credits || 0) - successCount });
    toast.error(`${successCount} SMS başarıyla gönderildi.`);
  };

  const handleExportData = async () => {
    if (!tenantId || isExporting) return;
    setIsExporting(true);
    
    try {
      const [{ data: customers }, { data: products }, { data: transactions }] = await Promise.all([
        supabase.from('customers').select('*').eq('tenant_id', tenantId),
        supabase.from('products').select('*').eq('tenant_id', tenantId),
        supabase.from('transactions').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false })
      ]);

      const wb = XLSX.utils.book_new();

      const customerData = customers?.map(c => ({
        'İsim': c.name,
        'Telefon': c.phone || '-',
        'Bakiye (TL)': c.balance,
        'Kayıt Tarihi': new Date(c.created_at).toLocaleDateString('tr-TR')
      })) || [];
      const wsCustomers = XLSX.utils.json_to_sheet(customerData);
      XLSX.utils.book_append_sheet(wb, wsCustomers, "Müşteriler");

      const productData = products?.map(p => ({
        'Ürün': p.name,
        'Barkod': p.barcode || '-',
        'Fiyat (TL)': p.price,
        'Stok': p.stock_quantity ?? 'Sınırsız',
        'Birim': p.unit || 'Adet'
      })) || [];
      const wsProducts = XLSX.utils.json_to_sheet(productData);
      XLSX.utils.book_append_sheet(wb, wsProducts, "Ürünler");

      const txData = transactions?.map(t => ({
        'Tarih/Saat': new Date(t.created_at).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' }),
        'Tip': t.type,
        'Tutar (TL)': t.amount,
        'Yöntem': t.payment_method,
        'Açıklama': t.description || '-',
        'Kasiyer': t.cashier_name || 'Patron'
      })) || [];
      const wsTransactions = XLSX.utils.json_to_sheet(txData);
      XLSX.utils.book_append_sheet(wb, wsTransactions, "İşlemler");

      XLSX.writeFile(wb, `${tenantName}_Veri_Aktarimi_${new Date().toLocaleDateString('tr-TR').replace(/\//g, '-')}.xlsx`);
    } catch (error: any) {
      console.error('Export Error:', error);
      toast.error('Veriler dışa aktarılırken bir hata oluştu.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!newProfileName.trim() || !tenantId) return;
    setIsUpdatingProfile(true);
    try {
      const { error } = await supabase.from('tenants').update({
        owner_name: newProfileName.trim()
      }).eq('id', tenantId);

      if (error) throw error;
      toast.success('Profil bilgileriniz güncellendi.');
      setIsProfileModalOpen(false);
      setOwnerName(newProfileName.trim());
    } catch (error: any) {
      toast.error('Profil güncellenirken bir hata oluştu.');
      console.error(error);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full pb-10">
      <Header title="Ayarlar" subtitle="Uygulama tercihlerinizi yönetin" />
      <div className="flex flex-col gap-6 max-w-3xl mx-auto w-full">

      <div className="space-y-8">
        
        {/* Profile Header & License Banner */}
        <section className="space-y-4">
          <div className="bg-gradient-to-br from-primary/90 to-primary text-white rounded-3xl p-6 shadow-xl shadow-primary/20 relative overflow-hidden">
            {/* Decorative BG */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white opacity-10 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-black opacity-10 rounded-full blur-3xl"></div>
            
            <div className="flex items-center gap-5 relative z-10">
              <div className="h-16 w-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30 shadow-inner">
                <Store className="h-8 w-8" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-black tracking-tight">{tenantName}</h2>
                  {user?.type === 'owner' && (
                    <button onClick={() => { setNewProfileName(ownerName || user?.name || ''); setIsProfileModalOpen(true); }} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors backdrop-blur-sm">
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1 opacity-80 text-sm font-medium">
                  <User className="h-4 w-4" />
                  <span>{user?.type === 'owner' ? (ownerName ? `${ownerName} (${user?.email})` : user?.email) : (user?.name || 'Personel')} ({user?.type === 'owner' ? 'Mağaza Sahibi' : 'Personel'})</span>
                </div>
              </div>
            </div>
          </div>

          {user?.type === 'owner' && (
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-4 shadow-lg shadow-orange-500/20 flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
                  <Shield className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider opacity-80 mb-0.5">Lisans Süresi</p>
                  <p className="font-extrabold text-lg">{calculateRemainingTime()}</p>
                </div>
              </div>
            </div>
          )}
        </section>

        {user?.type === 'owner' && (
          <>
            <section>
              <h3 className="text-[13px] font-bold text-gray-400 uppercase tracking-widest ml-4 mb-3">Sistem Yönetimi</h3>
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
                
                <button onClick={() => navigate('/settings/employees')} className="w-full flex items-center p-5 hover:bg-gray-50/80 active:bg-gray-100 transition-colors group">
                  <div className="h-12 w-12 rounded-2xl bg-cyan-50 flex items-center justify-center text-cyan-600 mr-4 group-hover:scale-105 transition-transform border border-cyan-100/50">
                    <User className="h-6 w-6" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-bold text-[15px] text-gray-900">Personel ve Rol Yönetimi</p>
                    <p className="text-xs font-medium text-gray-500 mt-0.5">Kasiyer hesaplarını ekle, düzenle veya kaldır</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-cyan-500 transition-colors" />
                </button>

                <button onClick={handleExportData} disabled={isExporting} className={`w-full flex items-center p-5 hover:bg-gray-50/80 active:bg-gray-100 transition-colors group ${isExporting ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <div className="h-12 w-12 rounded-2xl bg-green-50 flex items-center justify-center text-green-600 mr-4 group-hover:scale-105 transition-transform border border-green-100/50">
                    {isExporting ? <Loader2 className="h-6 w-6 animate-spin" /> : <Download className="h-6 w-6" />}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-bold text-[15px] text-gray-900">{isExporting ? 'Dışa Aktarılıyor...' : 'Verileri Dışa Aktar'}</p>
                    <p className="text-xs font-medium text-gray-500 mt-0.5">Tüm hareketleri ve ürünleri Excel'e indir</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-green-500 transition-colors" />
                </button>
              </div>
            </section>

            <section>
              <h3 className="text-[13px] font-bold text-gray-400 uppercase tracking-widest ml-4 mb-3">SMS & Hatırlatmalar</h3>
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
                
                <button onClick={openAutoSmsModal} className="w-full flex items-center p-5 hover:bg-gray-50/80 active:bg-gray-100 transition-colors group">
                  <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 mr-4 group-hover:scale-105 transition-transform border border-indigo-100/50">
                    <Bell className="h-6 w-6" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-bold text-[15px] text-gray-900">Otomatik Hatırlatmalar</p>
                    <p className="text-xs font-medium text-gray-500 mt-0.5">Geciken ödemeler için otomatik SMS gönderimi</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-[11px] font-extrabold uppercase px-2 py-1 rounded-md ${settings?.auto_sms_enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {settings?.auto_sms_enabled ? 'Açık' : 'Kapalı'}
                    </span>
                    <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-indigo-500 transition-colors" />
                  </div>
                </button>

                <div className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-50/30">
                  <div className="flex items-center w-full sm:w-auto">
                    <div className="h-12 w-12 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-600 mr-4 border border-orange-100/50">
                      <MessageSquareWarning className="h-6 w-6" />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-[15px] text-gray-900">SMS Bakiyesi</p>
                      <p className="text-xs font-medium text-gray-500 mt-0.5">Hatırlatmalar için kredi</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 bg-white px-5 py-3 rounded-2xl border border-gray-200 shadow-sm w-full sm:w-auto justify-between">
                    <p className="text-2xl font-black text-gray-900">{isLoading ? '...' : (settings?.sms_credits || 0)} <span className="text-sm font-medium text-gray-400">kredi</span></p>
                    <Button size="sm" variant="primary" onClick={handleBuyCredits} className="rounded-xl px-5 font-bold shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30">
                      Satın Al
                    </Button>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        <section className="pt-4">
          <button 
            onClick={() => signOut()}
            className="w-full bg-red-50 hover:bg-red-100 border border-red-100 text-red-600 p-4 rounded-2xl flex items-center justify-center transition-all shadow-sm active:scale-95 group"
          >
            <LogOut className="h-5 w-5 mr-2 group-hover:-translate-x-1 transition-transform" />
            <span className="font-bold text-[15px]">Hesaptan Çıkış Yap</span>
          </button>
        </section>

      </div>

      <BottomSheet isOpen={isAutoSmsModalOpen} onClose={() => setIsAutoSmsModalOpen(false)} title="Gecikmiş Alacak Hatırlatmaları">
        <div className="space-y-6 pt-4 pb-8">
          
          <div className="p-5 bg-gray-50 border border-gray-200 rounded-lg flex justify-between items-center shadow-sm">
            <div className="pr-4">
              <p className="font-bold text-gray-900">Günlük Otomatik Gönderim</p>
              <p className="text-xs font-medium text-gray-500 mt-1">Aktif edildiğinde, sistem her gün saat 10:00'da borcu geciken müşterilere otomatik SMS gönderir.</p>
            </div>
            <button 
              onClick={handleToggleAutoSms}
              disabled={updateSettings.isPending}
              className={`w-14 h-8 flex items-center rounded-full p-1 transition-colors flex-shrink-0 ${settings?.auto_sms_enabled ? 'bg-green-600' : 'bg-gray-300'}`}
            >
              <div className={`bg-white w-6 h-6 rounded-full shadow-sm transform transition-transform ${settings?.auto_sms_enabled ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>

          <div className="pt-2">
            <div className="flex justify-between items-end mb-4 px-1">
              <h3 className="text-lg font-bold text-gray-900">Gecikmiş Müşteriler</h3>
              <span className="px-3 py-1 bg-red-50 text-red-600 rounded-md font-bold text-sm border border-red-100">{overdueCustomers.length} Bulundu</span>
            </div>
            
            {overdueCustomers.length === 0 ? (
              <div className="p-6 bg-gray-50 rounded-lg text-center border border-gray-200 border-dashed">
                <p className="text-sm font-medium text-gray-500 italic">Harika! Gecikmiş alacak bulunamadı.</p>
              </div>
            ) : (
              <div className="space-y-3 mb-6 max-h-[40vh] overflow-y-auto px-1 pb-2">
                {overdueCustomers.map((c: any) => (
                  <div key={c.id} className="p-4 bg-white rounded-md flex justify-between items-center border border-gray-200 shadow-sm">
                    <div>
                      <p className="font-bold text-gray-900">{c.name}</p>
                      <p className="text-xs font-medium text-gray-500 mt-0.5">{c.phone || 'Telefon Yok'}</p>
                    </div>
                    <p className="font-bold text-red-600">{c.balance.toLocaleString('tr-TR', {minimumFractionDigits: 2})} ₺</p>
                  </div>
                ))}
              </div>
            )}

            {overdueCustomers.length > 0 && (
              <Button fullWidth variant="danger" size="lg" onClick={handleSendBulkSms} disabled={updateSettings.isPending}>
                <Send className="h-5 w-5 mr-2" />
                Herkese SMS Gönder
              </Button>
            )}
          </div>

        </div>
      </BottomSheet>

      <BottomSheet isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} title="Profili Düzenle">
        <div className="space-y-4 pt-4 pb-8">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Adınız Soyadınız</label>
            <input 
              type="text" 
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              placeholder="Örn: Ahmet Yılmaz" 
              value={newProfileName} 
              onChange={e => setNewProfileName(e.target.value)} 
            />
          </div>
          <Button className="w-full py-4 text-base mt-2" onClick={handleUpdateProfile} disabled={isUpdatingProfile}>
            {isUpdatingProfile ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Kaydet'}
          </Button>
        </div>
      </BottomSheet>
      </div>
    </div>
  );
};
