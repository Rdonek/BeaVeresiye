import { toast } from 'react-hot-toast';
import React, { useState } from 'react';
import { useTenant } from '@/app/providers/TenantProvider';
import { useAuth } from '@/app/providers/AuthProvider';
import { Input } from '@/shared/ui/Input';
import { Button } from '@/shared/ui/Button';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { Search, UserPlus, Phone, Send, ChevronRight, ArrowDownRight, ArrowUpRight, History, X, Loader2, Users, Plus, Edit2, Trash2, Check, CheckCheck, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { sendSMS } from '@/shared/lib/netgsm';
import { Header } from '@/widgets/Header';
import { EmptyState } from '@/shared/ui/EmptyState';
import { DataList } from '@/shared/ui/DataList';
import { supabase } from '@/shared/api/supabase';
import { useEntities, useAddEntity, useUpdateEntityBalance, useUpdateEntity, useDeleteEntity, type Entity } from '@/shared/hooks/useEntities';
import { useFinanceTransactions, useAddFinanceTransaction, useUpdateFinanceTransaction, useDeleteFinanceTransaction, type Transaction } from '@/shared/hooks/useFinance';
import { useNetworkLink, useCreateNetworkLink, useDisconnectNetworkLink } from '@/shared/hooks/useNetwork';
import { FilterChip } from '@/shared/ui/FilterChip';
import { GlassCard as Card } from '@/shared/ui/GlassCard';
import { useSettings } from '@/shared/hooks/useSettings';

export const Contacts = () => {
  const { tenantId, tenantName } = useTenant();
  const { user } = useAuth();
  
  const { data: customers = [], isLoading: loading } = useEntities(tenantId, 'all');
  const { settings, updateSettings } = useSettings(tenantId);
  const addCustomerMutation = useAddEntity();
  const updateCustomerMutation = useUpdateEntity();
  const deleteCustomerMutation = useDeleteEntity();
  const updateBalanceMutation = useUpdateEntityBalance();
  const addTransactionMutation = useAddFinanceTransaction();
  const updateTransactionMutation = useUpdateFinanceTransaction();
  const deleteTransactionMutation = useDeleteFinanceTransaction();
  
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'debtors'>('all');
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Entity | null>(null);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newInitialDebt, setNewInitialDebt] = useState('');

  const [selectedCustomer, setSelectedCustomer] = useState<Entity | null>(null);
  
  const { data: ledgerTxs = [], isLoading: ledgerLoading } = useFinanceTransactions(tenantId, selectedCustomer?.id || null);
  
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [txActionType, setTxActionType] = useState<'add_debt' | 'add_credit'>('add_debt');
  const [txAmount, setTxAmount] = useState('');
  const [txDesc, setTxDesc] = useState('');
  const [txDueDate, setTxDueDate] = useState('');
  const [txDate, setTxDate] = useState('');
  const [txPaymentMethod, setTxPaymentMethod] = useState('cash');

  // Network connection state
  const { data: networkLink, isLoading: isNetworkLoading } = useNetworkLink(selectedCustomer?.id);
  const createNetworkLink = useCreateNetworkLink();
  const disconnectNetworkLink = useDisconnectNetworkLink();
  const [isNetworkModalOpen, setIsNetworkModalOpen] = useState(false);

  const handleDisconnect = async () => {
    if (!networkLink) return;
    if (window.confirm('Bu hesapla olan defter bağlantısını (ağı) koparmak istediğinize emin misiniz? Karşılıklı yeni işlemler artık senkronize edilmeyecektir.')) {
      try {
        await disconnectNetworkLink.mutateAsync({ linkId: networkLink.id });
        toast.success('Bağlantı başarıyla koparıldı.');
      } catch (err) {
        toast.error('Bağlantı koparılırken hata oluştu.');
      }
    }
  };

  const handleCreateNetworkLink = async () => {
    if (!tenantId || !selectedCustomer) return;
    try {
      await createNetworkLink.mutateAsync({ tenantId, entityId: selectedCustomer.id });
    } catch (error) {
      toast.error('Bağlantı oluşturulamadı.');
    }
  };

  const getWhatsAppUrl = (code: string) => {
    const url = `${window.location.origin}/bagla/${code}`;
    const text = `Selam, hesabımızı BeaVeresiye'den tutuyorum. Sen de bu linke tıklarsan yazdığım borçları ve ödemeleri anında kendi telefonunda görebilirsin. Link: ${url}`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  };

  const openTxModal = (type: 'add_debt' | 'add_credit', tx?: Transaction) => {
    setTxActionType(type);
    if (tx) {
      setEditingTx(tx);
      setTxAmount(tx.amount.toString());
      setTxDesc(tx.description || '');
      setTxPaymentMethod(tx.payment_method || 'cash');
      setTxDate(tx.created_at ? tx.created_at.split('T')[0] : '');
    } else {
      setEditingTx(null);
      setTxAmount('');
      setTxDesc('');
      setTxDate('');
      setTxPaymentMethod('cash');
    }
    setIsTxModalOpen(true);
  };

  const openLedger = (customer: Entity) => {
    setSelectedCustomer(customer);
  };

  const handleAddOrEditCustomer = async () => {
    if (!tenantId || !newName || !user) return;
    
    if (editingCustomer) {
      try {
        await updateCustomerMutation.mutateAsync({
          id: editingCustomer.id,
          updates: { name: newName, phone: newPhone || null }
        });
        setSelectedCustomer(prev => prev ? { ...prev, name: newName, phone: newPhone || null } : null);
        setEditingCustomer(null);
        setIsAddOpen(false);
        toast.success('Kayıt güncellendi.');
      } catch (err) {
        toast.error('Güncellenirken hata oluştu.');
      }
      return;
    }
    
    const initialDebt = parseFloat(newInitialDebt) || 0;
    
    try {
      const newCustomer = await addCustomerMutation.mutateAsync({
        tenant_id: tenantId,
        name: newName,
        phone: newPhone || null,
        balance: initialDebt,
      });
      
      if (initialDebt > 0) {
        await addTransactionMutation.mutateAsync({
          tenant_id: tenantId,
          customer_id: newCustomer.id,
          user_id: user.id,
          cashier_name: user.name || user.email?.split('@')[0] || 'Patron',
          type: 'income',
          amount: initialDebt,
          description: 'Açılış / Devir Bakiyesi',
          payment_method: 'veresiye'
        });
      }
      
      setNewName('');
      setNewPhone('');
      setNewInitialDebt('');
      setIsAddOpen(false);
    } catch (err) {
      toast.error('Müşteri eklenirken hata oluştu.');
    }
  };

  const handleOpenEdit = () => {
    if (!selectedCustomer) return;
    setNewName(selectedCustomer.name);
    setNewPhone(selectedCustomer.phone || '');
    setEditingCustomer(selectedCustomer);
    setIsAddOpen(true);
  };

  const handleDeleteCustomer = async () => {
    if (!selectedCustomer || !tenantId) return;
    
    if (selectedCustomer.balance && selectedCustomer.balance > 0) {
      toast.error('Bakiyesi olan müşteriyi silemezsiniz. Önce hesabı sıfırlayın.');
      return;
    }
    
    if (window.confirm(`${selectedCustomer.name} isimli müşteriyi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`)) {
      try {
        await deleteCustomerMutation.mutateAsync({ id: selectedCustomer.id, tenantId });
        setSelectedCustomer(null);
        toast.success('Kayıt başarıyla silindi.');
      } catch (err) {
        toast.error('Kayıt silinirken hata oluştu. (Geçmiş işlemleri olabilir)');
      }
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 0 && !val.startsWith('0')) val = '0' + val;
    
    let formatted = val.substring(0, 4);
    if (val.length > 4) formatted += ' ' + val.substring(4, 7);
    if (val.length > 7) formatted += ' ' + val.substring(7, 9);
    if (val.length > 9) formatted += ' ' + val.substring(9, 11);
    
    setNewPhone(formatted);
  };

  const handleSms = async (e: React.MouseEvent, customer: Entity) => {
    e.stopPropagation();
    if (!customer.phone) {
      toast.error('Bu müşterinin telefon numarası kayıtlı değil!');
      return;
    }

    if (!tenantId || !settings) return;

    const currentCredits = settings.sms_credits || 0;

    if (currentCredits <= 0) {
      toast.error('Yetersiz SMS Kredisi! Lütfen Ayarlar sayfasından kredi satın alın.');
      return;
    }
    
    const message = `Sayın ${customer.name}, ${tenantName} işletmesine ${(customer.balance ?? 0).toLocaleString('tr-TR')} TL vadesi geçmiş borcunuz bulunmaktadır. Lütfen en kısa sürede ödeme yapınız.`;
    
    if (window.confirm(`${customer.phone} numarasına SMS gönderilecek.\nMevcut Krediniz: ${currentCredits}\nKalan Kredi: ${currentCredits - 1}\n\nOnaylıyor musunuz?`)) {
      const res = await sendSMS(customer.phone, message);
      if (res.success) {
        await updateSettings.mutateAsync({ sms_credits: currentCredits - 1 });
        toast.success('SMS Başarıyla Gönderildi! Kredinizden 1 adet düşüldü.');
      } else {
        toast.error('SMS Gönderilemedi. Lütfen sistem yöneticisiyle iletişime geçin.');
      }
    }
  };

  const handleTransaction = async () => {
    if (!selectedCustomer || !txAmount || !tenantId || !user) return;
    const amountNum = parseFloat(txAmount);
    
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('Lütfen geçerli bir tutar giriniz.');
      return;
    }


    
    let dbType: 'income' | 'expense' = 'income';
    let balanceChange = 0;
    if (txActionType === 'add_debt') {
      balanceChange = amountNum;
      dbType = 'income';
    } else {
      balanceChange = -amountNum;
      dbType = txPaymentMethod === 'veresiye' ? 'expense' : 'income';
    }

    try {
      if (editingTx) {
        // Revert old transaction effect
        const isOldDebt = editingTx.payment_method === 'veresiye' || editingTx.description?.includes('Borç') || editingTx.description?.includes('Açılış');
        const oldBalanceChange = isOldDebt ? -editingTx.amount : editingTx.amount;
        
        const newBalance = (selectedCustomer.balance ?? 0) + oldBalanceChange + balanceChange;

        await updateBalanceMutation.mutateAsync({
          id: selectedCustomer.id,
          newBalance,
          tenantId
        });

        const txData: any = {
          id: editingTx.id,
          tenant_id: tenantId,
          customer_id: selectedCustomer.id,
          amount: amountNum,
          description: txDesc || (txActionType === 'add_debt' ? 'Manuel Borçlandırme' : 'Tahsilat'),
          payment_method: txActionType === 'add_credit' ? txPaymentMethod : 'veresiye',
        };
        
        if (txDate) {
          txData.created_at = new Date(txDate).toISOString();
        }

        await updateTransactionMutation.mutateAsync(txData);
        setSelectedCustomer({ ...selectedCustomer, balance: newBalance });

      } else {
        const newBalance = (selectedCustomer.balance ?? 0) + balanceChange;
        
        await updateBalanceMutation.mutateAsync({
          id: selectedCustomer.id,
          newBalance,
          tenantId
        });

        const txData: any = {
          tenant_id: tenantId,
          customer_id: selectedCustomer.id,
          user_id: user.id,
          cashier_name: user.name || user.email?.split('@')[0] || 'Patron',
          type: dbType,
          amount: amountNum,
          description: txDesc || (txActionType === 'add_debt' ? 'Manuel Borçlandırme' : 'Tahsilat'),
          payment_method: txActionType === 'add_credit' ? txPaymentMethod : 'veresiye',
        };
        
        if (networkLink?.status === 'active') {
          txData.network_link_id = networkLink.id;
        }

        const addedTx = await addTransactionMutation.mutateAsync(txData);
        setSelectedCustomer({ ...selectedCustomer, balance: newBalance });

        // Trigger Sync if connected
        if (networkLink?.status === 'active' && addedTx?.id) {
          try {
            await supabase.rpc('sync_network_transaction', { p_transaction_id: addedTx.id });
          } catch (syncErr) {
            console.error('Sync failed:', syncErr);
            toast.error('İşlem eklendi ancak ağdaki karşı tarafa iletilemedi.');
          }
        }
      }
      
      setIsTxModalOpen(false);
      setTxAmount('');
      setTxDesc('');
      setTxDueDate('');
      setTxDate('');
      setEditingTx(null);
      
    } catch (err) {
      console.error(err);
      toast.error('İşlem kaydedilirken hata oluştu.');
    }
  };

  const handleDeleteTransaction = async () => {
    if (!editingTx || !selectedCustomer || !tenantId) return;
    if (!window.confirm('Bu işlemi silmek istediğinize emin misiniz? Müşteri bakiyesi de buna göre güncellenecektir.')) return;
    
    try {
      const isOldDebt = editingTx.payment_method === 'veresiye' || editingTx.description?.includes('Borç') || editingTx.description?.includes('Açılış');
      const oldBalanceChange = isOldDebt ? -editingTx.amount : editingTx.amount;
      const newBalance = (selectedCustomer.balance ?? 0) + oldBalanceChange;
      
      await updateBalanceMutation.mutateAsync({
        id: selectedCustomer.id,
        newBalance,
        tenantId
      });

      await deleteTransactionMutation.mutateAsync({
        id: editingTx.id,
        tenant_id: tenantId
      });

      setSelectedCustomer({ ...selectedCustomer, balance: newBalance });
      setIsTxModalOpen(false);
      setEditingTx(null);
    } catch (err) {
      toast.error('İşlem silinirken hata oluştu.');
    }
  };

  const totalReceivables = customers.reduce((sum, c) => sum + Number(c.balance), 0);
  const filteredCustomers = customers.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || (filter === 'debtors' && Number(c.balance) > 0);
    // If user is searching, ignore the 'debtors' filter to allow finding 0 balance customers
    if (search.length > 0) return matchesSearch;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="flex flex-col h-full overflow-hidden w-full gap-4 max-w-[1600px] mx-auto">
      <div className="shrink-0 flex flex-col gap-4">
        <Header title="Veresiye Defteri" subtitle="Müşteri alacakları" />
      </div>

      {/* Compact Top Bar: Stats, Search & Action */}
      <div className="bg-system-surface p-2 sm:p-3 rounded-2xl shadow-sm border border-system-border shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-3 px-1 sm:px-2">
          <div className="w-10 h-10 bg-danger/10 rounded-xl flex items-center justify-center shrink-0">
            <History className="h-5 w-5 text-danger" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-micro font-bold text-text-secondary uppercase tracking-wider truncate">Piyasadaki Alacağınız</p>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-subhead font-black text-danger leading-none truncate">{totalReceivables.toLocaleString('tr-TR', {minimumFractionDigits:2})}</span>
              <span className="text-caption font-bold text-danger/70">₺</span>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto md:min-w-[400px]">
          <div className="flex-1 w-full min-w-0">
            <Input 
              icon={<Search className="w-4 h-4 text-text-tertiary" />} 
              placeholder="Müşteri ara..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button className="w-full sm:w-auto" onClick={() => {
            setEditingCustomer(null);
            setNewName('');
            setNewPhone('');
            setNewInitialDebt('');
            setIsAddOpen(true);
          }}>
            <UserPlus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Yeni</span>
          </Button>
        </div>
      </div>

      {/* Data List */}
      <DataList
        header={
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 w-full">
            <h3 className="font-semibold text-text-primary text-subhead flex items-center gap-2">
              <Users className="w-5 h-5 text-text-tertiary" /> Kişi ve Kurumlar 
              {search && <span className="text-caption font-normal text-text-secondary">({filteredCustomers.length} sonuç)</span>}
            </h3>
            
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <FilterChip 
                label="Tümü"
                isActive={filter === 'all'}
                onClick={() => setFilter('all')}
              />
              <FilterChip 
                label="Borçlular"
                isActive={filter === 'debtors'}
                onClick={() => setFilter('debtors')}
              />
            </div>
          </div>
        }
      >
        {loading ? (
          <div className="w-full min-h-[200px] flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="h-full flex items-center justify-center p-4">
            <EmptyState 
              icon={Users}
              title={search ? 'Sonuç bulunamadı' : 'Henüz müşteri yok'}
              description={search ? 'Arama kriterlerinize uyan bir müşteri bulunamadı.' : 'Sisteme henüz hiç müşteri (cari) eklemediniz. Hemen yeni bir müşteri ekleyerek satışlara başlayın.'}
              actionLabel={search ? undefined : 'Yeni Kayıt Ekle Ekle'}
              actionIcon={Plus}
              onAction={search ? undefined : () => { setIsAddOpen(true); }}
            />
          </div>
        ) : (
          <div className="divide-y divide-system-border/50">
            <AnimatePresence>
              {filteredCustomers.map((customer) => (
                <motion.div 
                  key={customer.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-4 sm:px-6 hover:bg-glass-highlight transition-colors flex items-center justify-between group cursor-pointer"
                  onClick={() => openLedger(customer)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-system-bg text-text-secondary flex items-center justify-center font-bold text-headline uppercase group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      {customer.name.substring(0, 2)}
                    </div>
                    <div>
                      <p className="font-semibold text-text-primary text-body">{customer.name}</p>
                      <p className="text-caption text-text-secondary mt-0.5 flex items-center gap-1">
                        {customer.phone ? (
                          <><Phone className="w-3.5 h-3.5" /> {customer.phone}</>
                        ) : (
                          'Telefon Kayıtlı Değil'
                        )}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <span className={`text-headline sm:text-title-3 font-bold ${(customer.balance ?? 0) > 0 ? 'text-success' : (customer.balance ?? 0) < 0 ? 'text-danger' : 'text-text-primary'}`}>
                      {(customer.balance ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                    </span>
                    <ChevronRight className="w-5 h-5 text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </DataList>

      <BottomSheet isOpen={isAddOpen} onClose={() => { setIsAddOpen(false); setEditingCustomer(null); }} title={editingCustomer ? "Müşteriyi Düzenle" : "Yeni Kayıt Ekle Ekle"}>
        <div className="space-y-4 pt-4 pb-8">
          <div>
            <label className="block text-subhead font-medium text-text-secondary mb-1">Ad Soyad</label>
            <Input placeholder="Kişi/Kurum Adı" value={newName} onChange={e => setNewName(e.target.value)} />
          </div>
          <div>
            <label className="block text-subhead font-medium text-text-secondary mb-1">Telefon (İsteğe Bağlı)</label>
            <Input placeholder="05XX XXX XX XX" type="tel" maxLength={15} value={newPhone} onChange={handlePhoneChange} />
          </div>
          {!editingCustomer && (
            <div>
              <label className="block text-subhead font-medium text-text-secondary mb-1">Açılış Bakiyesi (İsteğe Bağlı)</label>
              <Input placeholder="0.00" type="number" value={newInitialDebt} onChange={e => setNewInitialDebt(e.target.value)} />
              <p className="text-xs text-text-secondary mt-1">Geçmişten kalan bir borcu varsa girebilirsiniz.</p>
            </div>
          )}
          <Button 
            fullWidth
            size="lg" 
            className="mt-6"
            onClick={handleAddOrEditCustomer} 
            disabled={!newName || addCustomerMutation.isPending || updateCustomerMutation.isPending}
            isLoading={addCustomerMutation.isPending || updateCustomerMutation.isPending}
          >
            {editingCustomer ? 'Değişiklikleri Kaydet' : 'Müşteriyi Kaydet'}
          </Button>
        </div>
      </BottomSheet>

      {/* Customer Ledger Slide-out Panel */}
      <AnimatePresence>
        {selectedCustomer && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-gray-900/40 backdrop-blur-sm" 
              onClick={() => setSelectedCustomer(null)} 
            />
            
            {/* Right Drawer */}
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-system-surface shadow-2xl flex flex-col border-l border-system-border"
            >
              {/* Drawer Header & Balance Area */}
              <div className="bg-hero-bg text-hero-text z-10 relative px-4 py-6 sm:px-6 sm:py-8 shadow-xl">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-hero-surface border border-hero-border flex items-center justify-center font-bold text-lg uppercase text-white shadow-sm shrink-0">
                      {selectedCustomer.name.substring(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight leading-tight truncate">{selectedCustomer.name}</h2>
                      <p className="text-xs sm:text-sm text-hero-muted flex items-center gap-1 mt-0.5 truncate">
                        {selectedCustomer.phone ? <><Phone className="w-3 h-3 shrink-0" /> {selectedCustomer.phone}</> : 'Telefon Kayıtlı Değil'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Button 
                      variant="ghost"
                      size="icon"
                      onClick={handleOpenEdit}
                      title="Düzenle"
                      className="text-hero-muted hover:text-white hover:bg-hero-surface"
                    >
                      <Edit2 className="h-4 w-4 sm:h-5 sm:w-5" />
                    </Button>
                    <Button 
                      variant="ghost"
                      size="icon"
                      onClick={handleDeleteCustomer}
                      title="Sil"
                      className="text-hero-muted hover:text-danger hover:bg-hero-surface"
                    >
                      <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                    </Button>
                    <Button 
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedCustomer(null)}
                      title="Kapat"
                      className="text-hero-muted hover:text-white hover:bg-hero-surface"
                    >
                      <X className="h-4 w-4 sm:h-5 sm:w-5" />
                    </Button>
                  </div>
                </div>

                {/* Network Connection Status Badge */}
                <div className="flex justify-center mb-6">
                  {!isNetworkLoading && (
                    networkLink?.status === 'active' ? (
                      <Button 
                        onClick={handleDisconnect}
                        disabled={disconnectNetworkLink.isPending}
                        variant="danger"
                        size="sm"
                        title="Bağlantıyı Koparmak İçin Tıklayın"
                        className="bg-danger/20 text-danger-light hover:bg-danger/30 border-none"
                      >
                        {disconnectNetworkLink.isPending ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                        ) : (
                          <X className="w-3.5 h-3.5 mr-1.5" />
                        )}
                        Bağlantıyı Kopar
                      </Button>
                    ) : (
                      <Button 
                        onClick={() => setIsNetworkModalOpen(true)}
                        size="sm"
                        className="bg-hero-surface text-white border border-hero-border hover:bg-hero-surface/80"
                      >
                        <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                        Defteri Bağla
                      </Button>
                    )
                  )}
                </div>

                <div className="text-center mb-4">
                  <p className="text-micro font-bold text-hero-muted uppercase tracking-widest mb-1 opacity-80">Toplam Bakiye</p>
                  <p className="text-4xl sm:text-5xl font-black tracking-tighter text-white">
                    {(selectedCustomer.balance ?? 0).toLocaleString('tr-TR', {minimumFractionDigits: 2})} <span className="text-xl sm:text-2xl font-bold opacity-70">₺</span>
                  </p>
                </div>
                
                {/* Action Buttons directly inside, not floating out */}
                <div className="flex gap-2 sm:gap-3 mt-6">
                  <Button 
                    onClick={() => openTxModal('add_debt')}
                    variant="danger"
                    className="flex-1 shadow-lg shadow-danger/20 py-2 sm:py-3 h-auto text-sm sm:text-base font-bold"
                  >
                    <ArrowUpRight className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5"/> Hesaba Ekle (+)
                  </Button>
                  <Button 
                    onClick={() => openTxModal('add_credit')}
                    className="flex-1 bg-success hover:bg-success-hover border-success text-white shadow-lg shadow-success/20 py-2 sm:py-3 h-auto text-sm sm:text-base font-bold"
                  >
                    <ArrowDownRight className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5"/> Hesaptan Düş (-)
                  </Button>
                </div>
              </div>

              {/* Drawer Content - Ledger Timeline */}
              <div className="flex-1 overflow-y-auto px-4 sm:px-6 pt-6 pb-6 bg-system-bg">
                {(selectedCustomer.balance ?? 0) > 0 && selectedCustomer.phone && (
                  <Button 
                    fullWidth
                    variant="secondary"
                    size="md"
                    className="mb-6 shadow-sm"
                    onClick={(e) => handleSms(e, selectedCustomer)}
                  >
                    <Send className="h-4 w-4 mr-2 text-primary" /> Hatırlatma SMS'i Gönder (1 Kredi)
                  </Button>
                )}

                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold text-text-tertiary uppercase tracking-widest flex items-center">
                    <History className="h-4 w-4 mr-1.5" /> İşlem Geçmişi
                  </h3>
                </div>
                
                <div className="space-y-4">
                  {ledgerLoading ? (
                    <p className="text-center py-5 text-sm text-text-secondary"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></p>
                  ) : ledgerTxs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 bg-system-surface rounded-2xl border border-system-border border-dashed">
                      <div className="w-12 h-12 bg-system-bg rounded-full flex items-center justify-center mb-3">
                        <History className="h-6 w-6 text-system-border" />
                      </div>
                      <p className="text-sm font-medium text-text-secondary">Henüz işlem bulunmuyor</p>
                    </div>
                  ) : (
                    <div className="relative before:absolute before:inset-y-0 before:left-[23px] before:w-[2px] before:bg-gray-200/60 pb-8 space-y-4">
                      {ledgerTxs.map(tx => {
                        const isCustomerTx = tx.type === 'income';
                        const isOldDebtAdded = tx.payment_method === 'veresiye' || tx.description?.includes('Borç') || tx.description?.includes('Açılış');
                        let impact = 0;
                        if (isCustomerTx) {
                          impact = isOldDebtAdded ? tx.amount : -tx.amount;
                        } else {
                          impact = isOldDebtAdded ? -tx.amount : tx.amount;
                        }
                        const isIncrease = impact > 0;
                        const isExternal = tx.network_source_tenant_id && tx.network_source_tenant_id !== tenantId;
                        const isMySyncedTx = tx.network_link_id && tx.network_source_tenant_id === tenantId;
                        
                        return (
                          <div 
                            key={tx.id} 
                            className="relative pl-14 cursor-pointer group"
                            onClick={() => openTxModal(isIncrease ? 'add_debt' : 'add_credit', tx)}
                          >
                            <div className={`absolute left-2 top-3 w-8 h-8 rounded-full border-4 border-gray-50 flex items-center justify-center z-10 transition-transform group-hover:scale-110 ${isIncrease ? 'bg-red-500 text-white shadow-sm shadow-red-200' : 'bg-green-500 text-white shadow-sm shadow-green-200'}`}>
                              {isIncrease ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                            </div>
                            
                            <div className={`${isExternal ? 'bg-blue-50/60 border-blue-100' : 'bg-system-surface border-system-border'} p-4 rounded-2xl border shadow-sm group-hover:border-primary/40 group-hover:shadow-md transition-all flex justify-between items-center relative overflow-hidden`}>
                              <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <p className="text-[15px] font-bold text-text-primary">
                                    {isIncrease ? 'EKLENDİ (+)' : 'DÜŞÜLDÜ (-)'}
                                  </p>
                                  {isExternal && <span className="px-1.5 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-700 rounded-md">DIŞ AĞ</span>}
                                </div>
                                <p className="text-xs font-medium text-text-secondary line-clamp-1 mb-1">{tx.description || 'Açıklama yok'}</p>
                                <div className="flex items-center gap-2">
                                  <p className="text-[11px] text-text-tertiary font-semibold tracking-wider">
                                    {tx.created_at && new Date(tx.created_at).toLocaleDateString('tr-TR', { month: 'short', day: 'numeric', year: 'numeric' })}
                                  </p>
                                  {isMySyncedTx && (
                                      <span className="flex items-center">
                                        {tx.network_read_status === 'sent' && <span title="Gönderildi"><Check className="w-3.5 h-3.5 text-text-tertiary" /></span>}
                                        {tx.network_read_status === 'read' && <span title="Okundu"><CheckCheck className="w-3.5 h-3.5 text-blue-500" /></span>}
                                        {tx.network_read_status === 'disputed' && <span title="İtiraz Edildi"><AlertCircle className="w-3.5 h-3.5 text-red-500" /></span>}
                                      </span>
                                  )}
                                </div>
                              </div>
                              <div className="text-right relative z-10">
                                <p className={`text-lg font-black tracking-tight ${isIncrease ? 'text-red-600' : 'text-green-600'}`}>
                                  {isIncrease ? '+' : '-'}{tx.amount.toLocaleString('tr-TR')} <span className="text-sm">₺</span>
                                </p>
                                <div className="mt-1 inline-flex items-center px-2 py-0.5 rounded-md bg-system-surface border border-system-border shadow-sm text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                                  {tx.payment_method === 'cash' ? 'Nakit' : tx.payment_method === 'credit_card' ? 'Kart' : tx.payment_method === 'veresiye' ? 'Açık Hesap' : 'Havale'}
                                </div>
                              </div>
                              
                              {/* Soft background glow based on type */}
                              <div className={`absolute -right-4 -bottom-4 w-16 h-16 rounded-full blur-2xl opacity-20 ${isIncrease ? 'bg-red-500' : 'bg-green-500'}`} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <BottomSheet isOpen={isTxModalOpen} onClose={() => setIsTxModalOpen(false)} title={txActionType === 'add_debt' ? 'Manuel Borçlandır' : 'Hesaptan Düş (-)'}>
        <div className="space-y-4 pt-4 pb-8">
          <div>
            <label className="block text-subhead font-medium text-text-secondary mb-1">Tutar (₺)</label>
            <Input type="number" placeholder="0.00" value={txAmount} onChange={e => setTxAmount(e.target.value)} />
          </div>
          
          <div>
            <label className="block text-subhead font-medium text-text-secondary mb-1">Açıklama (İsteğe Bağlı)</label>
            <Input placeholder={txActionType === 'add_debt' ? 'Örn: 2 koli yumurta' : 'Örn: Elden nakit alındı'} value={txDesc} onChange={e => setTxDesc(e.target.value)} />
          </div>

          {txActionType === 'add_credit' && (
            <div>
              <label className="block text-subhead font-medium text-text-secondary mb-1">Ödeme Yöntemi</label>
              <div className="flex gap-2">
                <Button 
                  onClick={() => setTxPaymentMethod('cash')} 
                  variant={txPaymentMethod === 'cash' ? 'primary' : 'secondary'}
                  size="md"
                  className="flex-1"
                >
                  Nakit
                </Button>
                <Button 
                  onClick={() => setTxPaymentMethod('credit_card')} 
                  variant={txPaymentMethod === 'credit_card' ? 'primary' : 'secondary'}
                  size="md"
                  className="flex-1"
                >
                  Kart
                </Button>
                <Button 
                  onClick={() => setTxPaymentMethod('transfer')} 
                  variant={txPaymentMethod === 'transfer' ? 'primary' : 'secondary'}
                  size="md"
                  className="flex-1"
                >
                  EFT/Havale
                </Button>
              </div>
            </div>
          )}

          {txActionType === 'add_debt' && (
            <>
              <div>
                <label className="block text-subhead font-medium text-text-secondary mb-1">İşlem Tarihi (Geçmişe dönük)</label>
                <Input type="date" value={txDate} onChange={e => setTxDate(e.target.value)} />
              </div>
              <div>
                <label className="block text-subhead font-medium text-text-secondary mb-1">Söz Verilen Ödeme Tarihi</label>
                <Input type="date" value={txDueDate} onChange={e => setTxDueDate(e.target.value)} />
              </div>
            </>
          )}
          
          <div className="flex gap-3 mt-6">
            {editingTx && (
              <Button 
                variant="danger"
                onClick={handleDeleteTransaction}
                disabled={deleteTransactionMutation.isPending || addTransactionMutation.isPending || updateTransactionMutation.isPending}
              >
                Sil
              </Button>
            )}
            <Button 
              className="flex-1" size="lg" 
              variant={txActionType === 'add_debt' ? 'danger' : 'primary'}
              onClick={handleTransaction} 
              disabled={!txAmount || addTransactionMutation.isPending || updateTransactionMutation.isPending}
              isLoading={addTransactionMutation.isPending || updateTransactionMutation.isPending}
            >
              {editingTx ? 'Değişiklikleri Kaydet' : (txActionType === 'add_debt' ? 'Borç Olarak Kaydet' : 'Tahsilatı Tamamla')}
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* Network Connection Modal */}
      <BottomSheet isOpen={isNetworkModalOpen} onClose={() => setIsNetworkModalOpen(false)} title="Defteri Bağla">
        <div className="pt-4 pb-8 flex flex-col items-center text-center space-y-6">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center">
            <UserPlus className="w-8 h-8 text-blue-500" />
          </div>
          
          <div>
            <h3 className="text-xl font-bold text-text-primary mb-2">Mavi Tikli Veresiye</h3>
            <p className="text-sm text-text-secondary leading-relaxed max-w-sm mx-auto">
              Müşterinize bir davet gönderin. Kabul ettiğinde, sizin yazdığınız tüm borçlar ve ödemeler otomatik olarak onun telefonunda görünür.
            </p>
          </div>

          <div className="w-full">
            {!networkLink ? (
              <Button 
                onClick={handleCreateNetworkLink} 
                className="w-full" 
                size="lg"
                isLoading={createNetworkLink.isPending}
              >
                Bağlantı Linki Oluştur
              </Button>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-system-bg border border-system-border rounded-xl">
                  <p className="text-xs font-bold text-text-secondary uppercase mb-2">Davet Kodu</p>
                  <p className="text-3xl font-black text-text-primary tracking-widest">{networkLink.link_code}</p>
                </div>
                
                {networkLink.status === 'pending' && (
                  <a 
                    href={getWhatsAppUrl(networkLink.link_code)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex w-full items-center justify-center py-3.5 bg-[#25D366] hover:bg-[#128C7E] text-white rounded-xl text-sm font-bold transition-all shadow-md"
                  >
                    <Send className="w-5 h-5 mr-2" /> WhatsApp'tan Gönder
                  </a>
                )}

                {networkLink.status === 'active' && (
                  <div className="p-3 bg-green-50 text-green-700 font-bold rounded-xl flex items-center justify-center gap-2 border border-green-200">
                    Defterler Başarıyla Bağlandı!
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </BottomSheet>
    </div>
  );
};
