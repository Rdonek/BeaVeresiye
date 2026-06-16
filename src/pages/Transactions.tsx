import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/shared/api/supabase';
import { useTenant } from '@/app/providers/TenantProvider';
import { useAuth } from '@/app/providers/AuthProvider';
import { Filter, ArrowUpRight, ArrowDownRight, ShoppingBag, Calendar, Loader2, Plus, Search, Trash2, Wallet, TrendingUp, TrendingDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Header } from '@/widgets/Header';
import { GlassCard } from '@/shared/ui/GlassCard';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { useAddFinanceTransaction, useDeleteFinanceTransaction } from '@/shared/hooks/useFinance';
import { toast } from 'react-hot-toast';

type DateFilter = 'today' | 'week' | 'month' | 'all';
type TypeFilter = 'all' | 'sale' | 'income' | 'expense';

interface Transaction {
  id: string;
  type: 'sale' | 'income' | 'expense';
  amount: number;
  payment_method: string;
  description: string;
  created_at: string;
  cashier_name?: string;
  tenant_id?: string;
}

export const Transactions = () => {
  const { tenantId } = useTenant();
  const { user } = useAuth();
  const addTransactionMutation = useAddFinanceTransaction();
  const deleteTransactionMutation = useDeleteFinanceTransaction();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isAddIncomeOpen, setIsAddIncomeOpen] = useState(false);
  
  // Forms
  const [txAmount, setTxAmount] = useState('');
  const [txDesc, setTxDesc] = useState('');

  // Delete Action
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [isTxDetailOpen, setIsTxDetailOpen] = useState(false);

  const fetchTransactions = React.useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('transactions')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      const now = new Date();
      if (dateFilter === 'today') {
        const start = new Date(now.setHours(0, 0, 0, 0));
        query = query.gte('created_at', start.toISOString());
      } else if (dateFilter === 'week') {
        const start = new Date(now.setDate(now.getDate() - 7));
        query = query.gte('created_at', start.toISOString());
      } else if (dateFilter === 'month') {
        const start = new Date(now.setMonth(now.getMonth() - 1));
        query = query.gte('created_at', start.toISOString());
      }

      if (typeFilter !== 'all') {
        query = query.eq('type', typeFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  }, [tenantId, dateFilter, typeFilter]);

  useEffect(() => {
    if (tenantId) fetchTransactions();
  }, [tenantId, fetchTransactions]);

  const handleAddTx = async (type: 'income' | 'expense') => {
    if (!tenantId || !user || !txAmount) return;
    
    try {
      await addTransactionMutation.mutateAsync({
        tenant_id: tenantId,
        user_id: user.id,
        type: type,
        amount: parseFloat(txAmount),
        description: txDesc || (type === 'income' ? 'Diğer Gelir' : 'Gider/Masraf'),
        payment_method: 'cash',
        customer_id: null
      });
      
      toast.success(type === 'income' ? 'Gelir başarıyla eklendi.' : 'Masraf başarıyla eklendi.');
      if (type === 'income') setIsAddIncomeOpen(false);
      else setIsAddExpenseOpen(false);
      
      setTxAmount('');
      setTxDesc('');
      fetchTransactions();
    } catch (err) {
      toast.error('İşlem eklenirken hata oluştu.');
    }
  };

  const handleDeleteTx = async () => {
    if (!selectedTx || !tenantId) return;
    
    try {
      await deleteTransactionMutation.mutateAsync({
        id: selectedTx.id,
        tenant_id: tenantId
      });
      toast.success('İşlem silindi.');
      setIsTxDetailOpen(false);
      setSelectedTx(null);
      fetchTransactions();
    } catch (error) {
      toast.error('İşlem silinemedi.');
    }
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      if (searchQuery && !(tx.description || '').toLowerCase().includes(searchQuery.toLowerCase()) && !(tx.cashier_name || '').toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [transactions, searchQuery]);

  const summary = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    filteredTransactions.forEach(tx => {
      if (tx.type === 'sale' || tx.type === 'income') totalIncome += Number(tx.amount);
      if (tx.type === 'expense') totalExpense += Number(tx.amount);
    });
    return { totalIncome, totalExpense, net: totalIncome - totalExpense };
  }, [filteredTransactions]);

  const groupedTransactions = useMemo(() => {
    const result: { title: string, txs: Transaction[] }[] = [];
    filteredTransactions.forEach(tx => {
       const date = new Date(tx.created_at);
       const today = new Date();
       const yesterday = new Date(today);
       yesterday.setDate(yesterday.getDate() - 1);
       
       let title = date.toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' });
       if (date.toDateString() === today.toDateString()) title = 'Bugün';
       else if (date.toDateString() === yesterday.toDateString()) title = 'Dün';
       
       let group = result.find(g => g.title === title);
       if (!group) {
          group = { title, txs: [] };
          result.push(group);
       }
       if (!group.txs.includes(tx)) {
          group.txs.push(tx);
       }
    });
    return result;
  }, [filteredTransactions]);

  const getTypeIcon = (type: string) => {
    if (type === 'sale') return <ShoppingBag className="h-5 w-5 text-primary" />;
    if (type === 'income') return <ArrowDownRight className="h-5 w-5 text-success" />;
    if (type === 'expense') return <ArrowUpRight className="h-5 w-5 text-danger" />;
    return null;
  };

  const getPaymentMethodLabel = (method: string) => {
    if (method === 'credit_card') return 'Kredi Kartı';
    if (method === 'veresiye') return 'Veresiye';
    return 'Nakit';
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      <Header 
        title="Kasa ve Masraflar" 
        subtitle="Tüm nakit giriş ve çıkışları"
      />
      
      {/* Summary Cards */}
      <div className="flex overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-3 gap-4 snap-x scrollbar-hide">
        <GlassCard className="min-w-[200px] flex-1 md:min-w-0 p-4 flex flex-col justify-between gap-3 border-l-4 border-l-success snap-start">
          <div className="flex justify-between items-start">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Toplam Giriş</p>
            <div className="h-8 w-8 rounded-full bg-success/10 text-success flex items-center justify-center flex-shrink-0">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl lg:text-3xl font-extrabold text-gray-900 truncate" title={`${summary.totalIncome} ₺`}>
            {summary.totalIncome.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} <span className="text-lg lg:text-xl text-gray-500">₺</span>
          </p>
        </GlassCard>

        <GlassCard className="min-w-[200px] flex-1 md:min-w-0 p-4 flex flex-col justify-between gap-3 border-l-4 border-l-danger snap-start">
          <div className="flex justify-between items-start">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Toplam Çıkış</p>
            <div className="h-8 w-8 rounded-full bg-danger/10 text-danger flex items-center justify-center flex-shrink-0">
              <TrendingDown className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl lg:text-3xl font-extrabold text-gray-900 truncate" title={`${summary.totalExpense} ₺`}>
            {summary.totalExpense.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} <span className="text-lg lg:text-xl text-gray-500">₺</span>
          </p>
        </GlassCard>

        <GlassCard className="min-w-[200px] flex-1 md:min-w-0 p-4 flex flex-col justify-between gap-3 border-l-4 border-l-primary bg-primary/[0.02] snap-start">
          <div className="flex justify-between items-start">
            <p className="text-xs font-bold text-primary uppercase tracking-wider">Net Kasa (Bakiye)</p>
            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl lg:text-3xl font-extrabold text-primary truncate" title={`${summary.net} ₺`}>
            {summary.net.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} <span className="text-lg lg:text-xl opacity-70">₺</span>
          </p>
        </GlassCard>
      </div>

      <div className="flex flex-col gap-4">
        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button 
            onClick={() => { setTxAmount(''); setTxDesc(''); setIsAddIncomeOpen(true); }}
            variant="outline"
            className="text-success border-success/30 bg-success/5 hover:bg-success/10 py-3"
          >
            <ArrowDownRight className="h-5 w-5 mr-2" />
            Gelir Ekle
          </Button>
          <Button 
            onClick={() => { setTxAmount(''); setTxDesc(''); setIsAddExpenseOpen(true); }}
            variant="danger"
            className="py-3"
          >
            <ArrowUpRight className="h-5 w-5 mr-2" />
            Masraf Ekle
          </Button>
        </div>

        {/* Search & Filter */}
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <Input 
              icon={<Search className="w-5 h-5 text-gray-400" />}
              placeholder="İşlem veya kasiyer ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`h-[42px] w-[42px] flex-shrink-0 flex items-center justify-center rounded-xl transition-all border ${isFilterOpen ? 'bg-primary border-primary text-white' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
          >
            <Filter className="h-5 w-5" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isFilterOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <GlassCard className="py-4 space-y-5">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-2 block uppercase tracking-wider">Tarih Aralığı</label>
                <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
                  {[
                    { id: 'today', label: 'Bugün' },
                    { id: 'week', label: 'Son 7 Gün' },
                    { id: 'month', label: 'Bu Ay' },
                    { id: 'all', label: 'Tüm Zamanlar' }
                  ].map(f => (
                    <button
                      key={f.id}
                      onClick={() => setDateFilter(f.id as DateFilter)}
                      className={`px-4 py-2 rounded-md text-sm font-semibold whitespace-nowrap transition-colors border ${dateFilter === f.id ? 'bg-primary border-primary text-white' : 'bg-white text-gray-600 hover:bg-gray-50 border-gray-300'}`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 mb-2 block uppercase tracking-wider">İşlem Tipi</label>
                <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
                  {[
                    { id: 'all', label: 'Tüm Tipler' },
                    { id: 'sale', label: 'Satışlar' },
                    { id: 'income', label: 'Gelirler' },
                    { id: 'expense', label: 'Giderler' }
                  ].map(f => (
                    <button
                      key={f.id}
                      onClick={() => setTypeFilter(f.id as TypeFilter)}
                      className={`px-4 py-2 rounded-md text-sm font-semibold whitespace-nowrap transition-colors border ${typeFilter === f.id ? 'bg-primary border-primary text-white' : 'bg-white text-gray-600 hover:bg-gray-50 border-gray-300'}`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      <GlassCard variant="panel" padding="none" className="min-h-[50vh] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-text-tertiary font-subhead flex-col">
            <Loader2 className="animate-spin h-8 w-8 text-primary mb-4" />
            İşlemler Yükleniyor...
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="h-full py-16">
            <EmptyState 
              icon={Calendar}
              title={searchQuery ? "Sonuç Bulunamadı" : "İşlem Bulunamadı"}
              description={searchQuery ? "Aramanıza uygun işlem bulunamadı." : "Seçtiğiniz filtreye uygun kasa hareketi bulunmuyor. Yeni bir masraf, gelir veya satış ekleyerek başlayabilirsiniz."}
              actionLabel={searchQuery ? undefined : "Masraf Ekle"}
              actionIcon={Plus}
              onAction={searchQuery ? undefined : () => setIsAddExpenseOpen(true)}
            />
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {groupedTransactions.map((group) => (
              <div key={group.title}>
                <div className="px-6 py-2 bg-gray-50/80 border-b border-gray-100/50 sticky top-0 z-10 backdrop-blur-md">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">{group.title}</h4>
                </div>
                <div className="divide-y divide-gray-50">
                  {group.txs.map((tx) => (
                    <motion.div 
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={tx.id}
                      onClick={() => { setSelectedTx(tx); setIsTxDetailOpen(true); }}
                      className="px-6 py-4 flex items-center space-x-4 transition-all hover:bg-gray-50 cursor-pointer group"
                    >
                      <div className={`h-12 w-12 flex-shrink-0 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105 ${tx.type === 'sale' ? 'bg-primary/10 text-primary' : tx.type === 'income' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                        {getTypeIcon(tx.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <p className="font-semibold text-gray-900 capitalize truncate pr-2">
                            {tx.description || (tx.type === 'sale' ? 'Satış' : tx.type === 'income' ? 'Gelir' : 'Gider')}
                          </p>
                          <p className={`font-extrabold text-base flex-shrink-0 ${tx.type === 'expense' ? 'text-danger' : 'text-gray-900'}`}>
                            {tx.type === 'expense' ? '-' : '+'}{Number(tx.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                          </p>
                        </div>
                        
                        <div className="flex items-center mt-1 text-[13px] font-medium text-gray-500">
                          <span className="flex-shrink-0 bg-gray-100 text-gray-600 px-2 py-0.5 rounded flex items-center">
                            {new Date(tx.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute:'2-digit' })}
                          </span>
                          <span className="mx-2 text-gray-300">•</span>
                          <span className="flex-shrink-0">{getPaymentMethodLabel(tx.payment_method)}</span>
                          
                          {tx.cashier_name && (
                            <>
                              <span className="mx-2 text-gray-300">•</span>
                              <span className="text-primary bg-primary/5 px-2 py-0.5 rounded truncate">
                                {tx.cashier_name}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Expense Modal */}
      <BottomSheet isOpen={isAddExpenseOpen} onClose={() => setIsAddExpenseOpen(false)} title="Gider / Masraf Ekle">
        <div className="space-y-4 pt-4 pb-8">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Masraf Tutarı (₺)</label>
            <Input type="number" placeholder="Örn: 150" value={txAmount} onChange={e => setTxAmount(e.target.value)} className="text-lg font-bold" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Açıklama</label>
            <Input placeholder="Örn: Kurye bahşişi, Elektrik faturası vb." value={txDesc} onChange={e => setTxDesc(e.target.value)} />
          </div>
          <Button 
            className="w-full mt-6 h-12 text-lg" size="lg" 
            variant="danger"
            onClick={() => handleAddTx('expense')} 
            disabled={!txAmount || addTransactionMutation.isPending}
            isLoading={addTransactionMutation.isPending}
          >
            Masrafı Kaydet
          </Button>
        </div>
      </BottomSheet>

      {/* Income Modal */}
      <BottomSheet isOpen={isAddIncomeOpen} onClose={() => setIsAddIncomeOpen(false)} title="Gelir Ekle">
        <div className="space-y-4 pt-4 pb-8">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Gelir Tutarı (₺)</label>
            <Input type="number" placeholder="Örn: 500" value={txAmount} onChange={e => setTxAmount(e.target.value)} className="text-lg font-bold" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Açıklama</label>
            <Input placeholder="Örn: Hurda satışı, Elden ödeme vb." value={txDesc} onChange={e => setTxDesc(e.target.value)} />
          </div>
          <Button 
            className="w-full mt-6 h-12 text-lg !bg-success hover:!bg-success/90 text-white" size="lg" 
            onClick={() => handleAddTx('income')} 
            disabled={!txAmount || addTransactionMutation.isPending}
            isLoading={addTransactionMutation.isPending}
          >
            Geliri Kaydet
          </Button>
        </div>
      </BottomSheet>

      {/* Transaction Detail Modal */}
      <BottomSheet isOpen={isTxDetailOpen} onClose={() => setIsTxDetailOpen(false)} title="İşlem Detayı">
        {selectedTx && (
          <div className="space-y-6 pt-2 pb-8">
            <div className="text-center">
              <div className={`mx-auto h-16 w-16 rounded-full flex items-center justify-center mb-4 ${selectedTx.type === 'sale' ? 'bg-primary/10 text-primary' : selectedTx.type === 'income' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                {getTypeIcon(selectedTx.type)}
              </div>
              <h2 className="text-3xl font-extrabold text-gray-900 mb-1">
                {selectedTx.type === 'expense' ? '-' : '+'}{Number(selectedTx.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
              </h2>
              <p className="text-gray-500 font-medium">{selectedTx.description || 'Açıklama yok'}</p>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-500 font-medium">Tarih</span>
                <span className="font-bold text-gray-900">{new Date(selectedTx.created_at).toLocaleString('tr-TR', { dateStyle: 'long', timeStyle: 'short' })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 font-medium">Ödeme Yöntemi</span>
                <span className="font-bold text-gray-900">{getPaymentMethodLabel(selectedTx.payment_method)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 font-medium">İşlem Tipi</span>
                <span className="font-bold text-gray-900 capitalize">{selectedTx.type === 'sale' ? 'Satış' : selectedTx.type === 'income' ? 'Gelir' : 'Gider / Masraf'}</span>
              </div>
              {selectedTx.cashier_name && (
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">İşlemi Yapan</span>
                  <span className="font-bold text-gray-900">{selectedTx.cashier_name}</span>
                </div>
              )}
            </div>

            {selectedTx.type !== 'sale' && (
              <div className="pt-2">
                <Button 
                  variant="danger" 
                  className="w-full h-12"
                  onClick={() => {
                    if (window.confirm('Bu işlemi silmek istediğinize emin misiniz?')) {
                      handleDeleteTx();
                    }
                  }}
                  disabled={deleteTransactionMutation.isPending}
                  isLoading={deleteTransactionMutation.isPending}
                >
                  <Trash2 className="w-4 h-4 mr-2" /> İşlemi Sil
                </Button>
                <p className="text-xs text-center text-gray-400 mt-3">Sadece manuel eklenen gelir ve masraflar silinebilir. Satış iptali için iade işlemi gereklidir.</p>
              </div>
            )}
          </div>
        )}
      </BottomSheet>
    </div>
  );
};
