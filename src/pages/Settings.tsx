import { toast } from 'react-hot-toast';
import React, { useState } from 'react';
import { supabase } from '@/shared/api/supabase';
import { useAuth } from '@/app/providers/AuthProvider';
import { useTenant } from '@/app/providers/TenantProvider';
import { User, Store, Shield, Bell, LogOut, ChevronRight, MessageSquareWarning, Send, Download, Loader2, Edit2, CreditCard } from 'lucide-react';
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
  const { tenantId, tenantName, ownerName, setOwnerName, planType } = useTenant();
  const navigate = useNavigate();
  
  const { settings, isLoading, updateSettings } = useSettings(tenantId);

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
    if (planType === 'free') {
      toast('Otomatik Hatırlatmalar özelliği Pro Pakete özeldir. Çok yakında yükseltme seçeneği eklenecek! 💎', {
        icon: '🚀'
      });
      return;
    }
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
    toast.success(`${successCount} SMS başarıyla gönderildi.`);
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
      const { error } = await supabase.auth.updateUser({
        data: { full_name: newProfileName.trim(), name: newProfileName.trim() }
      });

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

  const handleProFeatureClick = (originalOnClick: () => void) => {
    if (planType === 'free') {
      toast('SMS ve Hatırlatma özellikleri Pro Pakete özeldir! 💎', {
        icon: '🚀'
      });
      return;
    }
    originalOnClick();
  };

  const SettingsMenuItem = ({ icon: Icon, title, subtitle, onClick, value, disabled, isPro }: any) => (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`w-full flex items-center p-4 hover:bg-gray-50 active:bg-gray-100 transition-colors group ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <div className={`flex items-center justify-center mr-4 ${isPro && planType === 'free' ? 'text-gray-300' : 'text-gray-500'}`}>
        <Icon className="h-6 w-6" />
      </div>
      <div className="flex-1 text-left">
        <div className="flex items-center gap-2">
          <p className={`font-semibold ${isPro && planType === 'free' ? 'text-gray-400' : 'text-gray-900'}`}>{title}</p>
          {isPro && (
            <span className="inline-flex items-center rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 uppercase">PRO</span>
          )}
        </div>
        {subtitle && <p className={`text-xs mt-0.5 ${isPro && planType === 'free' ? 'text-gray-400' : 'text-gray-500'}`}>{subtitle}</p>}
      </div>
      {value ? (
        <span className={`text-sm font-medium mr-2 ${isPro && planType === 'free' ? 'text-gray-400' : 'text-gray-700'}`}>{value}</span>
      ) : null}
      <ChevronRight className={`h-5 w-5 transition-colors ${isPro && planType === 'free' ? 'text-gray-200' : 'text-gray-300 group-hover:text-gray-500'}`} />
    </button>
  );

  return (
    <div className="flex flex-col gap-6 w-full pb-10">
      <Header title="Ayarlar" subtitle="Profil, işletme ve abonelik" />
      
      <div className="flex flex-col gap-6 max-w-3xl mx-auto w-full px-4 sm:px-0">

        {/* Profil Section */}
        <section>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">Hesap</h3>
          <Card padding="none" className="overflow-hidden divide-y divide-gray-100">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                  {user?.type === 'owner' ? (ownerName?.charAt(0)?.toUpperCase() || 'O') : (user?.name?.charAt(0)?.toUpperCase() || 'P')}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    {user?.type === 'owner' ? ownerName || 'İsimsiz Kullanıcı' : user?.name || 'Personel'}
                  </h2>
                  <p className="text-sm text-gray-500">{user?.email || 'Telefon İle Giriş'}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                  {user?.type === 'owner' ? 'Yönetici' : 'Personel'}
                </span>
              </div>
            </div>
            
            {user?.type === 'owner' && (
              <SettingsMenuItem 
                icon={Edit2} 
                title="Profili Düzenle" 
                onClick={() => { setNewProfileName(ownerName || user?.name || ''); setIsProfileModalOpen(true); }} 
              />
            )}
          </Card>
        </section>

        {user?.type === 'owner' && (
          <>
            {/* Abonelik ve Kullanım Section */}
            <section>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">Abonelik Yönetimi</h3>
              <Card padding="none" className="overflow-hidden divide-y divide-gray-100">
                <SettingsMenuItem 
                  icon={CreditCard} 
                  title="Mevcut Plan" 
                  value={planType === 'pro' ? 'Pro Paket' : 'Ücretsiz Plan'}
                  onClick={() => toast('Yakında paket yükseltme özelliği eklenecektir.')} 
                />
              </Card>
            </section>

            {/* SMS Yönetimi Section */}
            <section>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">SMS & Hatırlatmalar</h3>
              <Card padding="none" className="overflow-hidden divide-y divide-gray-100">
                <SettingsMenuItem 
                  icon={Bell} 
                  title="Otomatik Hatırlatmalar" 
                  subtitle="Geciken borçlar için otomatik SMS"
                  value={planType === 'pro' ? (settings?.auto_sms_enabled ? 'Açık' : 'Kapalı') : '-'}
                  isPro={true}
                  onClick={() => handleProFeatureClick(openAutoSmsModal)} 
                />
                <SettingsMenuItem 
                  icon={MessageSquareWarning} 
                  title="SMS Bakiyesi" 
                  subtitle="Hatırlatma mesajları için kredi"
                  value={planType === 'pro' ? (isLoading ? '...' : `${settings?.sms_credits || 0} Kredi`) : '-'}
                  isPro={true}
                  onClick={() => handleProFeatureClick(handleBuyCredits)} 
                />
              </Card>
            </section>

            {/* İşletme Yönetimi Section */}
            <section>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">İşletme Yönetimi</h3>
              <Card padding="none" className="overflow-hidden divide-y divide-gray-100">
                <div className="p-4 flex items-center gap-4 bg-gray-50/50">
                  <div className="h-10 w-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-600">
                    <Store className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900">{tenantName}</h2>
                    <p className="text-xs text-gray-500">Mevcut İşletme</p>
                  </div>
                </div>
                <SettingsMenuItem 
                  icon={User} 
                  title="Personel Yönetimi" 
                  subtitle="Yetki sınırlarını ve kasiyerleri düzenle"
                  onClick={() => navigate('/settings/employees')} 
                />
                <SettingsMenuItem 
                  icon={isExporting ? Loader2 : Download} 
                  title={isExporting ? 'Aktarılıyor...' : 'Verileri Dışa Aktar'} 
                  subtitle="Tüm verileri Excel olarak indir"
                  disabled={isExporting}
                  onClick={handleExportData} 
                />
              </Card>
            </section>
          </>
        )}

        {/* Çıkış Yap Section */}
        <section className="pt-2">
          <button 
            onClick={() => signOut()}
            className="w-full flex items-center justify-center p-4 bg-white border border-red-200 text-red-600 rounded-2xl hover:bg-red-50 active:bg-red-100 transition-colors font-bold shadow-sm"
          >
            <LogOut className="h-5 w-5 mr-2" />
            Çıkış Yap
          </button>
        </section>

      </div>

      <BottomSheet isOpen={isAutoSmsModalOpen} onClose={() => setIsAutoSmsModalOpen(false)} title="SMS Hatırlatmaları">
        <div className="space-y-6 pt-4 pb-8">
          
          <div className="p-5 bg-gray-50 border border-gray-200 rounded-lg flex justify-between items-center shadow-sm">
            <div className="pr-4">
              <p className="font-bold text-gray-900">Otomatik Gönderim</p>
              <p className="text-xs font-medium text-gray-500 mt-1">Borcu geciken müşterilere her sabah otomatik SMS gönderir.</p>
            </div>
            <button 
              onClick={handleToggleAutoSms}
              disabled={updateSettings.isPending}
              className={`w-14 h-8 flex items-center rounded-full p-1 transition-colors flex-shrink-0 ${settings?.auto_sms_enabled ? 'bg-primary' : 'bg-gray-300'}`}
            >
              <div className={`bg-white w-6 h-6 rounded-full shadow-sm transform transition-transform ${settings?.auto_sms_enabled ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>

          <div className="pt-2">
            <div className="flex justify-between items-end mb-4 px-1">
              <h3 className="text-base font-bold text-gray-900">Gecikmiş Müşteriler</h3>
              <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md font-bold text-sm border border-gray-200">{overdueCustomers.length} Müşteri</span>
            </div>
            
            {overdueCustomers.length === 0 ? (
              <div className="p-6 bg-gray-50 rounded-lg text-center border border-gray-200 border-dashed">
                <p className="text-sm font-medium text-gray-500">Gecikmiş alacak bulunamadı.</p>
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
              <Button fullWidth variant="primary" size="lg" onClick={handleSendBulkSms} disabled={updateSettings.isPending}>
                <Send className="h-5 w-5 mr-2" />
                Toplu SMS Gönder
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
            {isUpdatingProfile ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Değişiklikleri Kaydet'}
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
};
