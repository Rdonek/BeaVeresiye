import React, { useState, useEffect } from 'react';
import { supabase } from '@/shared/api/supabase';
import { useTenant } from '@/app/providers/TenantProvider';
import { useAuth } from '@/app/providers/AuthProvider';
import { Filter, ArrowUpRight, ArrowDownRight, ShoppingBag, Calendar, Loader2, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Header } from '@/widgets/Header';
import { GlassCard } from '@/shared/ui/GlassCard';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { useAddFinanceTransaction } from '@/shared/hooks/useFinance';
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
}

export const Transactions = () => {
  const { tenantId } = useTenant();
  const { user } = useAuth();
  const addTransactionMutation = useAddFinanceTransaction();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDesc, setExpenseDesc] = useState('');

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

  const handleAddExpense = async () => {
    if (!tenantId || !user || !expenseAmount) return;
    
    try {
      await addTransactionMutation.mutateAsync({
        tenant_id: tenantId,
        user_id: user.id,
        type: 'expense',
        amount: parseFloat(expenseAmount),
        description: expenseDesc || 'Gider/Masraf',
        payment_method: 'cash',
        customer_id: null
      });
      
      toast.success('Masraf başarıyla eklendi.');
      setIsAddExpenseOpen(false);
      setExpenseAmount('');
      setExpenseDesc('');
      fetchTransactions();
    } catch (err) {
      toast.error('Masraf eklenirken hata oluştu.');
    }
  };

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
    <div className="flex flex-col gap-6">
      <Header 
        title="Kasa ve Masraflar" 
        subtitle="Tüm nakit giriş ve çıkışları"
      />
      <div className="flex items-center justify-end gap-2 -mt-4 mb-2">
        <Button 
          onClick={() => setIsAddExpenseOpen(true)}
          variant="danger"
          className="flex-shrink-0 whitespace-nowrap"
        >
          <ArrowUpRight className="h-4 w-4 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">Masraf Ekle</span>
          <span className="inline sm:hidden">Masraf</span>
        </Button>
        <button 
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          className={`h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-lg transition-all border ${isFilterOpen ? 'bg-primary border-primary text-white' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
        >
          <Filter className="h-5 w-5" />
        </button>
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

      <GlassCard variant="panel" padding="sm" className="space-y-3 min-h-[50vh]">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-text-tertiary font-subhead flex-col">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
            Yükleniyor...
          </div>
        ) : transactions.length === 0 ? (
          <div className="h-full pt-4">
            <EmptyState 
              icon={Calendar}
              title="İşlem Bulunamadı"
              description="Seçtiğiniz filtreye uygun kasa hareketi bulunmuyor. Yeni bir masraf, gelir veya satış ekleyerek başlayabilirsiniz."
              actionLabel="Masraf Ekle"
              actionIcon={Plus}
              onAction={() => setIsAddExpenseOpen(true)}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {transactions.map((tx) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={tx.id}
                className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex items-center space-x-4 transition-all hover:bg-gray-50"
              >
                <div className={`h-10 w-10 flex-shrink-0 rounded-md flex items-center justify-center ${tx.type === 'sale' ? 'bg-primary/10 text-primary' : tx.type === 'income' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                  {getTypeIcon(tx.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <p className="font-semibold text-gray-900 capitalize truncate pr-2">
                      {tx.type === 'sale' ? 'satış' : tx.type === 'income' ? 'gelir' : 'gider'}
                    </p>
                    <p className={`font-bold flex-shrink-0 ${tx.type === 'expense' ? 'text-red-600' : 'text-gray-900'}`}>
                      {tx.type === 'expense' ? '-' : '+'}{Number(tx.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                    </p>
                  </div>
                  
                  <p className="text-sm text-gray-500 truncate">{tx.description || '-'}</p>
                  
                  <div className="flex items-center mt-2 text-xs font-medium text-text-tertiary">
                    <span className="flex-shrink-0">{new Date(tx.created_at).toLocaleDateString('tr-TR', { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' })}</span>
                    <span className="mx-1.5 text-black/20">•</span>
                    <span className="flex-shrink-0">{getPaymentMethodLabel(tx.payment_method)}</span>
                    
                    {tx.cashier_name && (
                      <>
                        <span className="mx-1.5 text-black/20">•</span>
                        <span className="text-primary bg-primary/10 px-2 py-0.5 rounded-md truncate">
                          {tx.cashier_name}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </GlassCard>

      <BottomSheet isOpen={isAddExpenseOpen} onClose={() => setIsAddExpenseOpen(false)} title="Gider / Masraf Ekle">
        <div className="space-y-4 pt-4 pb-8">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Masraf Tutarı (₺)</label>
            <Input type="number" placeholder="Örn: 150" value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)} className="text-lg font-bold" />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
            <Input placeholder="Örn: Kurye bahşişi, Elektrik faturası vb." value={expenseDesc} onChange={e => setExpenseDesc(e.target.value)} />
          </div>
          
          <Button 
            className="w-full mt-6" size="lg" 
            variant="danger"
            onClick={handleAddExpense} 
            disabled={!expenseAmount || addTransactionMutation.isPending}
            isLoading={addTransactionMutation.isPending}
          >
            Masrafı Kaydet
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
};
