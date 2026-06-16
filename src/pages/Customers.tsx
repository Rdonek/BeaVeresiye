import { toast } from 'react-hot-toast';
import React, { useState } from 'react';
import { useTenant } from '@/app/providers/TenantProvider';
import { useAuth } from '@/app/providers/AuthProvider';
import { Input } from '@/shared/ui/Input';
import { Button } from '@/shared/ui/Button';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { Search, UserPlus, Phone, Send, ChevronRight, ArrowDownRight, ArrowUpRight, History, X, Loader2, Users, Plus, Edit2, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { sendSMS } from '@/shared/lib/netgsm';
import { EmptyState } from '@/shared/ui/EmptyState';
import { supabase } from '@/shared/api/supabase';
import { useEntities, useAddEntity, useUpdateEntityBalance, useUpdateEntity, useDeleteEntity, type Entity } from '@/shared/hooks/useEntities';
import { useFinanceTransactions, useAddFinanceTransaction, useUpdateFinanceTransaction, useDeleteFinanceTransaction, type Transaction } from '@/shared/hooks/useFinance';
import { Header } from '@/widgets/Header';
import { GlassCard as Card } from '@/shared/ui/GlassCard';
import { useSettings } from '@/shared/hooks/useSettings';

export const Customers = () => {
  const { tenantId, tenantName } = useTenant();
  const { user } = useAuth();
  
  const { data: customers = [], isLoading: loading } = useEntities(tenantId);
  const { settings, updateSettings } = useSettings(tenantId);
  const addCustomerMutation = useAddEntity();
  const updateCustomerMutation = useUpdateEntity();
  const deleteCustomerMutation = useDeleteEntity();
  const updateBalanceMutation = useUpdateEntityBalance();
  const addTransactionMutation = useAddFinanceTransaction();
  const updateTransactionMutation = useUpdateFinanceTransaction();
  const deleteTransactionMutation = useDeleteFinanceTransaction();
  
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'debtors'>('debtors');
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Entity | null>(null);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newInitialDebt, setNewInitialDebt] = useState('');

  const [selectedCustomer, setSelectedCustomer] = useState<Entity | null>(null);
  
  const { data: ledgerTxs = [], isLoading: ledgerLoading } = useFinanceTransactions(tenantId, selectedCustomer?.id || null);
  
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [txActionType, setTxActionType] = useState<'add_debt' | 'collect_payment'>('add_debt');
  const [txAmount, setTxAmount] = useState('');
  const [txDesc, setTxDesc] = useState('');
  const [txDueDate, setTxDueDate] = useState('');
  const [txDate, setTxDate] = useState('');
  const [txPaymentMethod, setTxPaymentMethod] = useState('cash');

  const openTxModal = (type: 'add_debt' | 'collect_payment', tx?: Transaction) => {
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
        toast.success('Müşteri güncellendi.');
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
        toast.success('Müşteri başarıyla silindi.');
      } catch (err) {
        toast.error('Müşteri silinirken hata oluştu. (Geçmiş işlemleri olabilir)');
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

    if (txActionType === 'collect_payment') {
      const currentBalance = selectedCustomer.balance ?? 0;
      if (currentBalance <= 0) {
        toast.error('Bu müşterinin tahsil edilecek borcu bulunmuyor.');
        return;
      }
      if (amountNum > currentBalance) {
        toast.error(`Tahsilat tutarı mevcut borçtan (${currentBalance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺) fazla olamaz.`);
        return;
      }
    }
    
    let dbType: 'income' | 'expense' = 'income';
    let balanceChange = txActionType === 'add_debt' ? amountNum : -amountNum;

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
          description: txDesc || (txActionType === 'add_debt' ? 'Manuel Borç Ekleme' : 'Tahsilat'),
          payment_method: txActionType === 'collect_payment' ? txPaymentMethod : 'veresiye',
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
          type: dbType,
          amount: amountNum,
          description: txDesc || (txActionType === 'add_debt' ? 'Manuel Borç Ekleme' : 'Tahsilat'),
          payment_method: txActionType === 'collect_payment' ? txPaymentMethod : 'veresiye',
        };
        
        if (txDate) {
          txData.created_at = new Date(txDate).toISOString();
        }

        await addTransactionMutation.mutateAsync(txData);
        setSelectedCustomer({ ...selectedCustomer, balance: newBalance });
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
    <div className="flex flex-col gap-6 w-full">
      <Header title="Veresiye Defteri" subtitle="Müşteri alacakları" />

      {/* Top Bar: Search & Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 -mt-2">
        <div className="w-full md:max-w-md">
          <Input 
            icon={<Search className="w-4 h-4" />} 
            placeholder="Müşteri ara..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button onClick={() => {
          setEditingCustomer(null);
          setNewName('');
          setNewPhone('');
          setNewInitialDebt('');
          setIsAddOpen(true);
        }} className="flex-shrink-0 w-full md:w-auto">
          <UserPlus className="h-4 w-4 mr-2" />
          Yeni Müşteri
        </Button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1">
        <Card padding="md" className="bg-white border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-1">Piyasadaki Alacağınız</p>
              <p className="text-3xl font-bold text-red-600">{totalReceivables.toLocaleString('tr-TR', {minimumFractionDigits:2})} ₺</p>
            </div>
            <div className="p-4 bg-red-50 rounded-full">
              <History className="h-8 w-8 text-red-500" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex bg-gray-100 p-1 rounded-xl w-full max-w-sm mb-2">
        <button 
          onClick={() => setFilter('all')}
          className={`flex-1 py-1.5 text-sm font-semibold rounded-lg transition-all ${filter === 'all' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
        >
          Tümü
        </button>
        <button 
          onClick={() => setFilter('debtors')}
          className={`flex-1 py-1.5 text-sm font-semibold rounded-lg transition-all ${filter === 'debtors' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
        >
          Borçlular
        </button>
      </div>

      {/* Data List */}
      <Card padding="none" className="overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Kişi ve Kurumlar {search && <span className="text-sm font-normal text-gray-500 ml-2">({filteredCustomers.length} sonuç)</span>}</h3>
        </div>
        
        <div className="flex-1 overflow-hidden min-h-0">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="h-full pt-4">
            <EmptyState 
              icon={Users}
              title={search ? 'Sonuç bulunamadı' : 'Henüz müşteri yok'}
              description={search ? 'Arama kriterlerinize uyan bir müşteri bulunamadı.' : 'Sisteme henüz hiç müşteri (cari) eklemediniz. Hemen yeni bir müşteri ekleyerek satışlara başlayın.'}
              actionLabel={search ? undefined : 'Yeni Müşteri Ekle'}
              actionIcon={Plus}
              onAction={search ? undefined : () => { setIsAddOpen(true); }}
            />
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            <AnimatePresence>
              {filteredCustomers.map((customer) => (
                <motion.div 
                  key={customer.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-4 sm:px-6 hover:bg-gray-50 transition-colors flex items-center justify-between group cursor-pointer"
                  onClick={() => openLedger(customer)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gray-100 text-gray-500 flex items-center justify-center font-bold text-lg uppercase group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      {customer.name.substring(0, 2)}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{customer.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                        {customer.phone ? (
                          <><Phone className="w-3 h-3" /> {customer.phone}</>
                        ) : (
                          'Telefon Kayıtlı Değil'
                        )}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <span className={`text-lg font-bold ${(customer.balance ?? 0) > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                      {(customer.balance ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                    </span>
                    <ChevronRight className="w-5 h-5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
        </div>
      </Card>

      <BottomSheet isOpen={isAddOpen} onClose={() => { setIsAddOpen(false); setEditingCustomer(null); }} title={editingCustomer ? "Müşteriyi Düzenle" : "Yeni Müşteri Ekle"}>
        <div className="space-y-4 pt-4 pb-8">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ad Soyad</label>
            <Input placeholder="Müşteri Adı" value={newName} onChange={e => setNewName(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telefon (İsteğe Bağlı)</label>
            <Input placeholder="05XX XXX XX XX" type="tel" maxLength={15} value={newPhone} onChange={handlePhoneChange} />
          </div>
          {!editingCustomer && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Açılış Bakiyesi (İsteğe Bağlı)</label>
              <Input placeholder="0.00" type="number" value={newInitialDebt} onChange={e => setNewInitialDebt(e.target.value)} />
              <p className="text-xs text-gray-500 mt-1">Geçmişten kalan bir borcu varsa girebilirsiniz.</p>
            </div>
          )}
          <Button 
            className="w-full mt-6" 
            size="lg" 
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
              className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col border-l border-gray-200"
            >
              {/* Drawer Header & Balance Area */}
              <div className="bg-gray-900 text-white rounded-b-3xl shadow-lg z-10 relative px-6 py-8 pb-10">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center font-bold text-lg uppercase text-white shadow-inner">
                      {selectedCustomer.name.substring(0, 2)}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white tracking-tight leading-tight">{selectedCustomer.name}</h2>
                      <p className="text-sm text-gray-400 flex items-center gap-1 mt-0.5">
                        {selectedCustomer.phone ? <><Phone className="w-3 h-3" /> {selectedCustomer.phone}</> : 'Telefon Kayıtlı Değil'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={handleOpenEdit}
                      className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors backdrop-blur-md"
                      title="Düzenle"
                    >
                      <Edit2 className="h-5 w-5" />
                    </button>
                    <button 
                      onClick={handleDeleteCustomer}
                      className="p-2 bg-white/10 hover:bg-red-500/80 rounded-full text-white transition-colors backdrop-blur-md"
                      title="Sil"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                    <button 
                      onClick={() => setSelectedCustomer(null)}
                      className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors backdrop-blur-md"
                      title="Kapat"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <div className="mt-2 text-center">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1 opacity-80">Toplam Bakiye</p>
                  <p className={`text-5xl font-black tracking-tighter ${(selectedCustomer.balance ?? 0) > 0 ? 'text-red-400' : 'text-white'}`}>
                    {(selectedCustomer.balance ?? 0).toLocaleString('tr-TR', {minimumFractionDigits: 2})} <span className="text-2xl font-semibold opacity-70">₺</span>
                  </p>
                </div>
                
                {/* Action Buttons Float over the bottom edge */}
                <div className="absolute -bottom-6 left-0 right-0 px-6 flex gap-3">
                  <button 
                    onClick={() => openTxModal('add_debt')}
                    className="flex-1 flex items-center justify-center py-3.5 bg-red-500 hover:bg-red-600 text-white rounded-2xl text-sm font-bold transition-all shadow-[0_8px_16px_-6px_rgba(239,68,68,0.5)] border border-red-400"
                  >
                    <ArrowUpRight className="h-5 w-5 mr-1.5"/> Borç Yaz
                  </button>
                  <button 
                    onClick={() => openTxModal('collect_payment')}
                    className="flex-1 flex items-center justify-center py-3.5 bg-green-500 hover:bg-green-600 text-white rounded-2xl text-sm font-bold transition-all shadow-[0_8px_16px_-6px_rgba(34,197,94,0.5)] border border-green-400"
                  >
                    <ArrowDownRight className="h-5 w-5 mr-1.5"/> Tahsilat Al
                  </button>
                </div>
              </div>

              {/* Drawer Content - Ledger Timeline */}
              <div className="flex-1 overflow-y-auto px-6 pt-12 pb-6 bg-gray-50">
                {(selectedCustomer.balance ?? 0) > 0 && selectedCustomer.phone && (
                  <button 
                    className="w-full mb-6 flex items-center justify-center py-2.5 text-xs font-bold text-gray-700 hover:text-gray-900 bg-white border border-gray-200 hover:border-gray-300 shadow-sm rounded-xl transition-all"
                    onClick={(e) => handleSms(e, selectedCustomer)}
                  >
                    <Send className="h-4 w-4 mr-2 text-primary" /> Hatırlatma SMS'i Gönder (1 Kredi)
                  </button>
                )}

                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center">
                    <History className="h-4 w-4 mr-1.5" /> İşlem Geçmişi
                  </h3>
                </div>
                
                <div className="space-y-4">
                  {ledgerLoading ? (
                    <p className="text-center py-5 text-sm text-gray-500"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></p>
                  ) : ledgerTxs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 bg-white rounded-2xl border border-gray-100 border-dashed">
                      <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                        <History className="h-6 w-6 text-gray-300" />
                      </div>
                      <p className="text-sm font-medium text-gray-500">Henüz işlem bulunmuyor</p>
                    </div>
                  ) : (
                    <div className="relative before:absolute before:inset-y-0 before:left-[23px] before:w-[2px] before:bg-gray-200/60 pb-8 space-y-4">
                      {ledgerTxs.map(tx => {
                        const isDebt = tx.payment_method === 'veresiye' || tx.description?.includes('Borç') || tx.description?.includes('Açılış');
                        return (
                          <div 
                            key={tx.id} 
                            className="relative pl-14 cursor-pointer group"
                            onClick={() => openTxModal(isDebt ? 'add_debt' : 'collect_payment', tx)}
                          >
                            <div className={`absolute left-2 top-3 w-8 h-8 rounded-full border-4 border-gray-50 flex items-center justify-center z-10 transition-transform group-hover:scale-110 ${isDebt ? 'bg-red-500 text-white shadow-sm shadow-red-200' : 'bg-green-500 text-white shadow-sm shadow-green-200'}`}>
                              {isDebt ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                            </div>
                            
                            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm group-hover:border-primary/40 group-hover:shadow-md transition-all flex justify-between items-center relative overflow-hidden">
                              <div className="relative z-10">
                                <p className="text-[15px] font-bold text-gray-900 mb-0.5">
                                  {isDebt ? 'Borç Eklendi' : 'Tahsilat Alındı'}
                                </p>
                                <p className="text-xs font-medium text-gray-500 line-clamp-1 mb-1">{tx.description || 'Açıklama yok'}</p>
                                <p className="text-[11px] text-gray-400 font-semibold tracking-wider">
                                  {tx.created_at && new Date(tx.created_at).toLocaleDateString('tr-TR', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </p>
                              </div>
                              <div className="text-right relative z-10">
                                <p className={`text-lg font-black tracking-tight ${isDebt ? 'text-red-600' : 'text-green-600'}`}>
                                  {isDebt ? '+' : '-'}{tx.amount.toLocaleString('tr-TR')} <span className="text-sm">₺</span>
                                </p>
                                <div className="mt-1 inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                  {tx.payment_method === 'cash' ? 'Nakit' : tx.payment_method === 'credit_card' ? 'Kart' : tx.payment_method === 'veresiye' ? 'Açık Hesap' : 'Havale'}
                                </div>
                              </div>
                              
                              {/* Soft background glow based on type */}
                              <div className={`absolute -right-4 -bottom-4 w-16 h-16 rounded-full blur-2xl opacity-20 ${isDebt ? 'bg-red-500' : 'bg-green-500'}`} />
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

      <BottomSheet isOpen={isTxModalOpen} onClose={() => setIsTxModalOpen(false)} title={txActionType === 'add_debt' ? 'Manuel Borç Ekle' : 'Tahsilat Al'}>
        <div className="space-y-4 pt-4 pb-8">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tutar (₺)</label>
            <Input type="number" placeholder="0.00" value={txAmount} onChange={e => setTxAmount(e.target.value)} className="text-lg font-bold" />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama (İsteğe Bağlı)</label>
            <Input placeholder={txActionType === 'add_debt' ? 'Örn: 2 koli yumurta' : 'Örn: Elden nakit alındı'} value={txDesc} onChange={e => setTxDesc(e.target.value)} />
          </div>

          {txActionType === 'collect_payment' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ödeme Yöntemi</label>
              <div className="flex space-x-2">
                <button onClick={() => setTxPaymentMethod('cash')} className={`flex-1 py-2 text-sm rounded-md font-semibold transition-all ${txPaymentMethod === 'cash' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Nakit</button>
                <button onClick={() => setTxPaymentMethod('credit_card')} className={`flex-1 py-2 text-sm rounded-md font-semibold transition-all ${txPaymentMethod === 'credit_card' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Kart</button>
                <button onClick={() => setTxPaymentMethod('transfer')} className={`flex-1 py-2 text-sm rounded-md font-semibold transition-all ${txPaymentMethod === 'transfer' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>EFT/Havale</button>
              </div>
            </div>
          )}

          {txActionType === 'add_debt' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">İşlem Tarihi (Geçmişe dönük)</label>
                <Input type="date" value={txDate} onChange={e => setTxDate(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Söz Verilen Ödeme Tarihi</label>
                <Input type="date" value={txDueDate} onChange={e => setTxDueDate(e.target.value)} />
              </div>
            </>
          )}
          
          <div className="flex gap-3 mt-6">
            {editingTx && (
              <Button 
                variant="danger"
                className="flex-shrink-0 px-4"
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
    </div>
  );
};
