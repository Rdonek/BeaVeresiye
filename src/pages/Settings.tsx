import { toast } from 'react-hot-toast';
import React, { useState } from 'react';
import { supabase } from '@/shared/api/supabase';
import { useAuth } from '@/app/providers/AuthProvider';
import { useTenant } from '@/app/providers/TenantProvider';
import { User, Store, Shield, Bell, LogOut, ChevronRight, MessageSquareWarning, Send, Download, Loader2, Edit2, CreditCard } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/shared/ui/Input';
import { Header } from '@/widgets/Header';
import { GlassCard as Card } from '@/shared/ui/GlassCard';
import { sendSMS } from '@/shared/lib/netgsm';
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

  const SettingsSection = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <section className="flex flex-col gap-3">
      <h3 className="text-caption font-bold text-text-secondary uppercase tracking-widest ml-1">{title}</h3>
      <Card padding="none" className="overflow-hidden border border-system-border bg-system-surface shadow-sm">
        <div className="flex flex-col divide-y divide-system-border/50">
          {children}
        </div>
      </Card>
    </section>
  );

  const SettingsItem = ({ icon: Icon, title, subtitle, value, onClick, disabled, isPro }: any) => (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center justify-between p-4 sm:p-5 bg-system-surface hover:bg-glass-highlight transition-all text-left group ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-xl transition-colors ${isPro && planType === 'free' ? 'bg-system-bg text-text-tertiary' : 'bg-primary/5 text-primary group-hover:bg-primary/10'}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className={`font-bold text-body ${isPro && planType === 'free' ? 'text-text-tertiary' : 'text-text-primary'}`}>{title}</p>
            {isPro && (
              <span className="inline-flex items-center rounded-md bg-warning/10 px-1.5 py-0.5 text-micro font-black text-warning uppercase tracking-wider border border-warning/20">PRO</span>
            )}
          </div>
          {subtitle && <p className={`text-caption mt-0.5 ${isPro && planType === 'free' ? 'text-text-tertiary' : 'text-text-secondary'}`}>{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {value && <span className={`text-subhead font-medium ${isPro && planType === 'free' ? 'text-text-tertiary' : 'text-text-secondary'}`}>{value}</span>}
        <ChevronRight className={`w-5 h-5 transition-transform group-hover:translate-x-1 ${isPro && planType === 'free' ? 'text-system-border' : 'text-text-tertiary'}`} />
      </div>
    </button>
  );

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      <div className="flex-1 overflow-y-auto min-h-0 w-full pb-20">
        <div className="flex flex-col gap-6 max-w-3xl mx-auto w-full">

          <div className="shrink-0 mb-2">
            <Header title="Ayarlar" subtitle="Profil, işletme ve abonelik" />
          </div>

          {/* Profil Section */}
          <SettingsSection title="Hesap Bilgileri">
            <div className="p-5 flex items-center justify-between bg-system-surface">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-title-2 shadow-sm border border-primary/20">
                  {user?.type === 'owner' ? (ownerName?.charAt(0)?.toUpperCase() || 'O') : (user?.name?.charAt(0)?.toUpperCase() || 'P')}
                </div>
                <div>
                  <h2 className="text-title-3 font-black text-text-primary mb-0.5">
                    {user?.type === 'owner' ? ownerName || 'İsimsiz Kullanıcı' : user?.name || 'Personel'}
                  </h2>
                  <p className="text-caption font-medium text-text-secondary">{user?.email || 'Telefon İle Giriş'}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center rounded-full bg-system-bg border border-system-border px-3 py-1 text-caption font-bold text-text-secondary shadow-sm">
                  {user?.type === 'owner' ? 'Yönetici' : 'Personel'}
                </span>
              </div>
            </div>
            
            {user?.type === 'owner' && (
              <SettingsItem 
                icon={Edit2} 
                title="Profili Düzenle" 
                subtitle="İsim ve kişisel bilgilerinizi güncelleyin"
                onClick={() => { setNewProfileName(ownerName || user?.name || ''); setIsProfileModalOpen(true); }} 
              />
            )}
          </SettingsSection>

          {user?.type === 'owner' && (
            <>
              {/* İşletme Yönetimi Section */}
              <SettingsSection title="İşletme Yönetimi">
                <div className="p-5 flex items-center gap-4 bg-system-surface">
                  <div className="p-3 rounded-xl bg-system-bg border border-system-border flex items-center justify-center text-text-secondary shadow-sm">
                    <Store className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-body font-bold text-text-primary">{tenantName}</h2>
                    <p className="text-caption font-medium text-text-secondary mt-0.5">Mevcut İşletme</p>
                  </div>
                </div>
                <SettingsItem 
                  icon={User} 
                  title="Personel Yönetimi" 
                  subtitle="Yetki sınırlarını ve kasiyerleri düzenle"
                  onClick={() => navigate('/settings/employees')} 
                />
                <SettingsItem 
                  icon={isExporting ? Loader2 : Download} 
                  title={isExporting ? 'Aktarılıyor...' : 'Verileri Dışa Aktar'} 
                  subtitle="Tüm verileri Excel olarak indir"
                  disabled={isExporting}
                  onClick={handleExportData} 
                />
              </SettingsSection>

              {/* SMS Yönetimi Section */}
              <SettingsSection title="SMS & Hatırlatmalar">
                <SettingsItem 
                  icon={Bell} 
                  title="Otomatik Hatırlatmalar" 
                  subtitle="Geciken borçlar için otomatik SMS"
                  value={planType === 'pro' ? (settings?.auto_sms_enabled ? 'Açık' : 'Kapalı') : '-'}
                  isPro={true}
                  onClick={() => handleProFeatureClick(openAutoSmsModal)} 
                />
                <SettingsItem 
                  icon={MessageSquareWarning} 
                  title="SMS Bakiyesi" 
                  subtitle="Hatırlatma mesajları için kredi"
                  value={planType === 'pro' ? (isLoading ? '...' : `${settings?.sms_credits || 0} Kredi`) : '-'}
                  isPro={true}
                  onClick={() => handleProFeatureClick(handleBuyCredits)} 
                />
              </SettingsSection>

              {/* Abonelik Section */}
              <SettingsSection title="Abonelik Yönetimi">
                <SettingsItem 
                  icon={CreditCard} 
                  title="Mevcut Plan" 
                  subtitle="Abonelik paketinizi görüntüleyin veya yükseltin"
                  value={planType === 'pro' ? 'Pro Paket' : 'Ücretsiz Plan'}
                  onClick={() => toast('Yakında paket yükseltme özelliği eklenecektir.')} 
                />
              </SettingsSection>
            </>
          )}

          {/* Çıkış Yap Section */}
          <div className="pt-4 px-2 sm:px-0">
            <Button 
              variant="danger"
              size="lg"
              fullWidth
              onClick={() => signOut()}
              className="shadow-sm font-bold"
            >
              <LogOut className="h-5 w-5 mr-2" />
              Güvenli Çıkış Yap
            </Button>
          </div>

        </div>
      </div>

      {/* Auto SMS Modal */}
      <BottomSheet isOpen={isAutoSmsModalOpen} onClose={() => setIsAutoSmsModalOpen(false)} title="SMS Hatırlatmaları">
        <div className="space-y-6 pt-4 pb-8 px-2 sm:px-0">
          
          <div className="p-5 bg-system-bg border border-system-border rounded-2xl flex justify-between items-center shadow-sm">
            <div className="pr-4">
              <p className="font-bold text-text-primary text-body">Otomatik Gönderim</p>
              <p className="text-caption font-medium text-text-secondary mt-1">Borcu geciken müşterilere her sabah otomatik SMS gönderir.</p>
            </div>
            <Button 
              variant={settings?.auto_sms_enabled ? 'primary' : 'secondary'}
              onClick={handleToggleAutoSms}
              disabled={updateSettings.isPending}
            >
              {settings?.auto_sms_enabled ? 'Açık' : 'Kapalı'}
            </Button>
          </div>

          <div className="pt-2">
            <div className="flex justify-between items-end mb-4 px-1">
              <h3 className="text-body font-bold text-text-primary">Gecikmiş Müşteriler</h3>
              <span className="px-3 py-1 bg-system-bg text-text-secondary rounded-xl font-bold text-caption border border-system-border shadow-sm">{overdueCustomers.length} Müşteri</span>
            </div>
            
            {overdueCustomers.length === 0 ? (
              <div className="p-8 bg-system-bg rounded-2xl text-center border border-system-border border-dashed">
                <p className="text-subhead font-medium text-text-secondary">Şu an gecikmiş alacak bulunamadı.</p>
              </div>
            ) : (
              <div className="space-y-3 mb-6 max-h-[40vh] overflow-y-auto px-1 pb-2">
                {overdueCustomers.map((c: any) => (
                  <div key={c.id} className="p-4 bg-system-surface rounded-xl flex justify-between items-center border border-system-border shadow-sm">
                    <div>
                      <p className="font-bold text-text-primary text-body">{c.name}</p>
                      <p className="text-caption font-medium text-text-secondary mt-0.5 flex items-center gap-1">
                        {c.phone || 'Telefon Kayıtlı Değil'}
                      </p>
                    </div>
                    <p className="font-black text-danger text-body">{c.balance.toLocaleString('tr-TR', {minimumFractionDigits: 2})} ₺</p>
                  </div>
                ))}
              </div>
            )}

            {overdueCustomers.length > 0 && (
              <Button fullWidth size="lg" onClick={handleSendBulkSms} disabled={updateSettings.isPending}>
                <Send className="h-5 w-5 mr-2" />
                Toplu SMS Gönder
              </Button>
            )}
          </div>

        </div>
      </BottomSheet>

      {/* Profile Edit Modal */}
      <BottomSheet isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} title="Profili Düzenle">
        <div className="space-y-6 pt-4 pb-8 px-2 sm:px-0">
          <div>
            <label className="block text-subhead font-medium text-text-secondary mb-2 px-1">Adınız Soyadınız</label>
            <Input 
              placeholder="Örn: Ahmet Yılmaz" 
              value={newProfileName} 
              onChange={e => setNewProfileName(e.target.value)} 
            />
          </div>
          <Button fullWidth size="lg" onClick={handleUpdateProfile} disabled={isUpdatingProfile || !newProfileName.trim()}>
            {isUpdatingProfile ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null} Değişiklikleri Kaydet
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
};
